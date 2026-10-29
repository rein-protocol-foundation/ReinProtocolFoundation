import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn() }))
vi.mock('@/lib/agent/service-callers', () => ({ authenticateCaller: mocks.auth }))
vi.mock('@/lib/supabase/secret', () => ({ getSecretClient: mocks.client }))
import { POST } from '@/app/api/agent/deployments/route'
import { deploymentSchema } from '@/lib/agent/deployments'
import { hashValue } from '@/lib/agent/credentials'

const payload = {
  deploymentId: 'dd3eb822-871e-4869-9440-c427da49513c', repository: 'rein-protocol-foundation/nori-agent',
  environment: 'production', revision: 'a'.repeat(40), previousRevision: 'b'.repeat(40),
  deployedAt: '2026-10-28T00:00:00Z', host: 'test', workspaceId: 'T123', channelId: 'C123',
  pullRequests: [{ number: 22, title: 'Add reporting', summary: 'Successful deployments' }], commits: [],
}
const send = (body: unknown = payload) => POST(new Request('https://test/api/agent/deployments', { method: 'POST', body: JSON.stringify(body) }))
let row: { caller_id: string; payload_hash: string; slack_ts: string | null }
let query: Record<string, ReturnType<typeof vi.fn>>
beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.mockResolvedValue({ ok: true, caller: { callerId: 'reporter' } })
  row = { caller_id: 'reporter', payload_hash: hashValue(JSON.stringify(deploymentSchema.parse(payload))), slack_ts: null }
  let pendingReceipt: string | undefined
  query = { upsert: vi.fn().mockResolvedValue({ error: null }), select: vi.fn(), eq: vi.fn(),
    single: vi.fn().mockImplementation(async () => ({ data: { ...row }, error: null })),
    update: vi.fn().mockImplementation((values) => { pendingReceipt = values.slack_ts; return query }),
    maybeSingle: vi.fn().mockImplementation(async () => ({ data: { slack_ts: pendingReceipt }, error: null })),
    is: vi.fn() }
  for (const key of ['select', 'eq', 'is']) query[key].mockReturnValue(query)
  mocks.client.mockReturnValue({ from: vi.fn().mockReturnValue(query) })
})
it('refuses a caller without the dedicated scope before writing', async () => {
  mocks.auth.mockResolvedValue({ ok: false, reason: 'scope_missing', httpStatus: 403 })
  expect((await send()).status).toBe(403)
  expect(mocks.client).not.toHaveBeenCalled()
})
it('requires the configured workspace and channel', async () => {
  mocks.auth.mockResolvedValueOnce({ ok: true, caller: { callerId: 'reporter' } })
    .mockResolvedValueOnce({ ok: false, reason: 'channel_not_allowed', httpStatus: 403 })
  expect((await send()).status).toBe(403)
  expect(mocks.client).not.toHaveBeenCalled()
})
it('deduplicates replayed deployment IDs and returns stored Slack receipts', async () => {
  row.slack_ts = '123.456'
  expect(await (await send()).json()).toMatchObject({ ok: true, slackTs: '123.456' })
  expect(query.upsert).toHaveBeenCalledWith(expect.objectContaining({ revision: payload.revision }), { onConflict: 'deployment_id', ignoreDuplicates: true })
})
it('rejects an attempt to rewrite an existing deployment', async () => {
  row.payload_hash = 'different'
  expect((await send()).status).toBe(409)
  expect(query.update).not.toHaveBeenCalled()
})
it('records notification receipt separately from immutable deployment data', async () => {
  expect(await (await send({ ...payload, slackTs: '123.456' })).json()).toMatchObject({ ok: true, slackTs: '123.456' })
  expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ slack_ts: '123.456' }))
})
it.each([
  ['999.999', 409],
  ['123.456', 200],
])('handles concurrent receipt %s with status %s', async (secondReceipt, expectedStatus) => {
  // Both requests observe no receipt; the first conditional update wins.
  const initial = { ...row }
  query.single.mockResolvedValueOnce({ data: initial, error: null })
    .mockResolvedValueOnce({ data: initial, error: null })
  row.slack_ts = '123.456'
  query.maybeSingle.mockResolvedValueOnce({ data: { slack_ts: '123.456' }, error: null })
    .mockResolvedValueOnce({ data: null, error: null })
  const [first, second] = await Promise.all([
    send({ ...payload, slackTs: '123.456' }),
    send({ ...payload, slackTs: secondReceipt }),
  ])
  expect(first.status).toBe(200)
  expect(await first.json()).toMatchObject({ ok: true, slackTs: '123.456' })
  expect(second.status).toBe(expectedStatus)
  expect(await second.json()).toMatchObject(expectedStatus === 200
    ? { ok: true, slackTs: '123.456' }
    : { ok: false, reason: 'deployment_conflict' })
  expect(query.single).toHaveBeenCalledTimes(3)
})
it('acknowledges an identical stored receipt without rewriting it', async () => {
  row.slack_ts = '123.456'
  expect(await (await send({ ...payload, slackTs: '123.456' })).json()).toMatchObject({ ok: true, slackTs: '123.456' })
  expect(query.update).not.toHaveBeenCalled()
})
it('does not acknowledge a failed receipt update', async () => {
  query.maybeSingle.mockResolvedValue({ data: null, error: { message: 'unavailable' } })
  const response = await send({ ...payload, slackTs: '123.456' })
  expect(response.status).toBe(503)
  expect(await response.json()).toMatchObject({ ok: false, reason: 'unavailable' })
})
it.each([
  { data: null, error: { message: 'unavailable' } },
  { data: null, error: null },
  { data: { slack_ts: null }, error: null },
])('does not acknowledge an unverified receipt: %j', async (reread) => {
  query.single.mockResolvedValueOnce({ data: { ...row }, error: null }).mockResolvedValueOnce(reread)
  query.maybeSingle.mockResolvedValue({ data: null, error: null })
  const response = await send({ ...payload, slackTs: '123.456' })
  expect(response.status).toBe(503)
  expect(await response.json()).toMatchObject({ ok: false, reason: 'unavailable' })
})
it('rejects invalid revisions and arbitrary repositories', async () => {
  expect((await send({ ...payload, revision: 'HEAD' })).status).toBe(400)
  expect((await send({ ...payload, repository: 'other/repo' })).status).toBe(400)
  expect(mocks.client).not.toHaveBeenCalled()
})

it.each(['rein-protocol-foundation/nori-agent', 'tempest2023/rein-agent'])(
  'preserves %s reports across retries and Slack receipt updates', async (repository) => {
    const report = { ...payload, repository }
    // Hash the original contract directly, without the current schema normalizing it.
    const originalHash = hashValue(JSON.stringify(report))
    row.payload_hash = originalHash
    expect((await send(report)).status).toBe(200)
    expect(query.upsert).toHaveBeenLastCalledWith(expect.objectContaining({
      repository, deployment_id: report.deploymentId, payload_hash: originalHash,
    }), { onConflict: 'deployment_id', ignoreDuplicates: true })
    expect((await send({ ...report, slackTs: '123.456' })).status).toBe(200)
    row.slack_ts = '123.456'
    expect(await (await send(report)).json()).toMatchObject({ ok: true, slackTs: '123.456' })
    expect((await send({ ...report, slackTs: '999.999' })).status).toBe(409)
  },
)
it('does not reinterpret an existing legacy report as a new repository report', async () => {
  row.payload_hash = hashValue(JSON.stringify({ ...payload, repository: 'tempest2023/rein-agent' }))
  expect((await send()).status).toBe(409)
  expect(query.update).not.toHaveBeenCalled()
})
