import { createClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/identity/linked-accounts/route'
import { validateIngressAssertion } from '@/lib/agent/assertions'
import { refuse } from '@/lib/agent/contracts'
import { authenticateCaller } from '@/lib/agent/service-callers'
import { scopeDatabaseClient } from '@/lib/supabase/database-names'
import { getSecretClient } from '@/lib/supabase/secret'

vi.mock('@/lib/agent/assertions', () => ({ validateIngressAssertion: vi.fn() }))
vi.mock('@/lib/agent/service-callers', () => ({ authenticateCaller: vi.fn() }))
vi.mock('@/lib/supabase/secret', () => ({ getSecretClient: vi.fn() }))

const proof = { kind: 'assertion', assertion: 'ria_test' }
const assertion = {
  callerId: 'test-caller', platform: 'slack', workspaceId: 'T1', platformUserId: 'U1', channelId: 'C1', eventId: 'E1',
}
const now = '2026-11-19T12:00:00.000Z'
const joinedAt = '2026-10-01T12:00:00+00:00'
const expiresAt = '2026-12-19T12:00:00+00:00'
const contactId = 'd944faed-9a6d-45dc-b7b5-58b2e47c6464'
const otherContact = '2d801ab9-42d8-4b40-9276-1ca1953405be'
const source = {
  id: 'source-link', contact_id: contactId, status: 'verified', revoked_at: null as string | null,
  validity_expires_at: expiresAt, verified_at: joinedAt,
  platform: 'slack', platform_workspace_id: 'T1', platform_user_id: 'U1',
}
const discord = {
  ...source, id: 'discord-link', platform: 'discord', platform_workspace_id: '12345', platform_user_id: '98765',
}

let links: (typeof source)[]
let contact: { created_at: string; deleted_at: string | null } | null
let participant: { name: string | null; subscription_status: string } | null
let person: { display_name: string | null } | null
let afterListRead: (() => void) | undefined
let intercept: ((url: URL) => Response | undefined) | undefined

/** Exercise the real client query construction against a synthetic PostgREST transport. */
const databaseFetch = vi.fn<typeof fetch>(async (input, init) => {
  const url = new URL(String(input))
  const overridden = intercept?.(url)
  if (overridden) return overridden

  switch (url.pathname.split('/').at(-1)) {
    case 'dev_rein_resolve_platform_contact': {
      const args = JSON.parse(String(init?.body))
      const link = links.find(row => row.platform === args.p_platform && row.platform_workspace_id === args.p_workspace_id
        && row.platform_user_id === args.p_platform_user_id)
      if (!link) return Response.json([{ status: 'identity_not_linked', contact_id: null }])
      if (link.status === 'revoked') return Response.json([{ status: 'identity_revoked', contact_id: null }])
      if (Date.parse(link.validity_expires_at) <= Date.now()) {
        return Response.json([{ status: 'identity_expired', contact_id: null }])
      }
      return Response.json([{ status: 'resolved', contact_id: link.contact_id }])
    }
    case 'dev_rein_platform_links': {
      const rows = links.filter(row => [...url.searchParams.entries()].every(([field, filter]) => {
        const value = row[field as keyof typeof row]
        if (filter.startsWith('eq.')) return value === filter.slice(3)
        if (filter === 'is.null') return value === null
        if (filter.startsWith('gt.')) return typeof value === 'string' && Date.parse(value) > Date.parse(filter.slice(3))
        return true
      }))
      const limit = url.searchParams.get('limit')
      if (limit) {
        afterListRead?.()
        return Response.json(rows.slice(0, Number(limit)))
      }
      expect(url.searchParams.get('select')).toContain('contact:dev_community_contacts(created_at,deleted_at)')
      return Response.json(rows.map(row => ({ ...row, contact })))
    }
    case 'dev_community_participants':
      return Response.json(url.searchParams.get('contact_id') === `eq.${contactId}` && participant ? [participant] : [])
    case 'dev_people':
      return Response.json(url.searchParams.get('contact_id') === `eq.${contactId}` && person ? [person] : [])
    default:
      throw new Error(`Unexpected table ${url.pathname}`)
  }
})

function request(body: unknown = { proof }) {
  return new Request('https://example.test/api/identity/linked-accounts', {
    method: 'POST',
    headers: { 'x-rein-caller-id': 'test-caller', authorization: 'Bearer rs_test', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function databaseUrls() {
  return databaseFetch.mock.calls.map(([input]) => new URL(String(input)))
}

async function expectEmpty(status: string) {
  const response = await POST(request())
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('no-store')
  await expect(response.json()).resolves.toEqual({ ok: true, status, contact_id: null, profile: null, accounts: [] })
}

async function expectUnavailable() {
  const response = await POST(request())
  expect(response.status).toBe(503)
  expect(response.headers.get('cache-control')).toBe('no-store')
  await expect(response.json()).resolves.toEqual({ ok: false, reason: 'unavailable' })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(now))
  vi.stubEnv('DATABASE_ENVIRONMENT', 'dev')
  links = [source, discord]
  contact = { created_at: joinedAt, deleted_at: null }
  person = { display_name: 'Canonical name' }
  participant = { name: 'Participant name', subscription_status: 'subscribed' }
  afterListRead = undefined
  intercept = undefined
  vi.mocked(getSecretClient).mockReturnValue(scopeDatabaseClient(createClient('https://database.example.test', 'synthetic-key', {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: databaseFetch },
  })))
  vi.mocked(authenticateCaller).mockResolvedValue({
    ok: true,
    caller: {
      callerId: assertion.callerId, label: 'Test caller', scopes: ['identity.resolve'],
      platformAllowlist: [{ platform: 'slack', workspace_id: assertion.workspaceId }], channelAllowlist: [assertion.channelId],
    },
  })
  vi.mocked(validateIngressAssertion).mockResolvedValue({ ok: true, assertion })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('POST /api/identity/linked-accounts', () => {
  it('returns only current accounts of the canonical sender, including cross-platform links', async () => {
    links.push(
      { ...discord, id: 'other-member', platform_user_id: '111', contact_id: otherContact },
      { ...discord, id: 'revoked', platform_user_id: '222', status: 'revoked', revoked_at: joinedAt },
      { ...discord, id: 'expired', platform_user_id: '333', validity_expires_at: now },
    )
    const req = request()
    const response = await POST(req)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      ok: true, status: 'resolved', contact_id: contactId, profile: { name: 'Canonical name', joinedAt },
      accounts: [
        { platform: 'slack', workspace_id: 'T1', platform_user_id: 'U1' },
        { platform: 'discord', workspace_id: '12345', platform_user_id: '98765' },
      ],
    })
    expect(authenticateCaller).toHaveBeenCalledExactlyOnceWith(req, { scope: 'identity.resolve' })
    expect(validateIngressAssertion).toHaveBeenCalledExactlyOnceWith(proof.assertion)
    const queries = databaseUrls()
    const list = queries.find(url => url.searchParams.get('limit') === '21')
    expect(list?.searchParams.get('contact_id')).toBe(`eq.${contactId}`)
    expect(list?.searchParams.get('status')).toBe('eq.verified')
    expect(list?.searchParams.get('revoked_at')).toBe('is.null')
    expect(list?.searchParams.get('validity_expires_at')).toBe(`gt.${now}`)
    expect(queries.some(url => /email|contact_identities/.test(url.href))).toBe(false)
    expect(queries.at(-1)?.searchParams.get('platform_user_id')).toBe('eq.U1')
  })

  it('preserves the canonical profile name fallback and nullable name', async () => {
    person = null
    const fallback = await POST(request())
    expect((await fallback.json()).profile).toEqual({ name: 'Participant name', joinedAt })
    participant = { name: 'Deleted participant', subscription_status: 'deleted' }
    const missing = await POST(request())
    expect((await missing.json()).profile).toEqual({ name: null, joinedAt })
  })

  it.each(['actor', 'contact_id', 'email', 'platform', 'workspace_id', 'platform_user_id'])('rejects a request-supplied %s', async field => {
    const response = await POST(request({ proof, [field]: 'other' }))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ ok: false, reason: 'invalid_request' })
    expect(authenticateCaller).not.toHaveBeenCalled()
    expect(databaseFetch).not.toHaveBeenCalled()
  })

  it('rejects extra fields inside the assertion proof', async () => {
    const response = await POST(request({ proof: { ...proof, email: 'someone@example.test' } }))
    expect(response.status).toBe(400)
    expect(authenticateCaller).not.toHaveBeenCalled()
  })

  it.each([refuse('bad_credential', 401), refuse('scope_missing', 403)])('propagates $reason before identity lookup', async refusal => {
    vi.mocked(authenticateCaller).mockResolvedValue(refusal)
    const response = await POST(request())
    expect(response.status).toBe(refusal.httpStatus)
    await expect(response.json()).resolves.toEqual({ ok: false, reason: refusal.reason })
    expect(databaseFetch).not.toHaveBeenCalled()
  })

  it('propagates assertion expiry before identity lookup', async () => {
    vi.mocked(validateIngressAssertion).mockResolvedValue(refuse('proof_expired', 401))
    const response = await POST(request())
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ ok: false, reason: 'proof_expired' })
    expect(databaseFetch).not.toHaveBeenCalled()
  })

  it.each([
    ['callerId', 'other-caller', 'caller_unknown'],
    ['workspaceId', 'other-workspace', 'platform_not_allowed'],
    ['channelId', 'other-channel', 'channel_not_allowed'],
  ])('refuses a proof with a disallowed %s', async (field, value, reason) => {
    vi.mocked(validateIngressAssertion).mockResolvedValue({ ok: true, assertion: { ...assertion, [field]: value } })
    const response = await POST(request())
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ ok: false, reason })
    expect(databaseFetch).not.toHaveBeenCalled()
  })

  it.each([
    ['identity_not_linked', [discord]],
    ['identity_revoked', [discord, { ...source, status: 'revoked', revoked_at: now }]],
    ['identity_expired', [discord, { ...source, validity_expires_at: now }]],
  ] as const)('returns empty %s before profile and account reads', async (status, fixture) => {
    links = [...fixture]
    await expectEmpty(status)
    expect(databaseUrls().map(url => url.pathname)).toEqual(['/rest/v1/rpc/dev_rein_resolve_platform_contact'])
  })

  it.each([null, { created_at: joinedAt, deleted_at: now }])('returns empty for a missing or deleted contact %j', async fixture => {
    contact = fixture
    await expectEmpty('identity_not_linked')
  })

  it('accepts 20 verified links and rejects an overflow without partial data', async () => {
    const extraLinks = Array.from({ length: 19 }, (_, index) => ({
      ...discord, id: `discord-${index}`, platform_user_id: `9000${index}`,
    }))
    links = [source, ...extraLinks.slice(0, -1), discord]
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect((await response.json()).accounts).toHaveLength(20)
    links.push(extraLinks.at(-1)!)
    await expectUnavailable()
  })

  it.each([
    ['unsupported platform', { platform: 'other' }],
    ['invalid expiry', { validity_expires_at: 'bad-timestamp' }],
    ['blank workspace', { platform_workspace_id: ' ' }],
    ['missing account id', { platform_user_id: null }],
    ['another contact', { contact_id: otherContact }],
    ['duplicate tuple', { platform: 'slack', platform_workspace_id: 'T1', platform_user_id: 'U1' }],
  ])('fails closed when the account list contains %s', async (_reason, fields) => {
    intercept = url => url.searchParams.has('limit') ? Response.json([source, { ...discord, ...fields }]) : undefined
    await expectUnavailable()
  })

  it.each(['resolve', 'list', 'profile', 'source'])('fails closed on a %s database error', async stage => {
    intercept = url => {
      const failed = {
        resolve: url.pathname.includes('/rpc/'),
        list: url.searchParams.has('limit'),
        profile: url.pathname.endsWith('/dev_people'),
        source: url.pathname.endsWith('/dev_rein_platform_links') && !url.searchParams.has('limit'),
      }[stage]
      return failed ? Response.json({ message: 'private database error' }, { status: 500 }) : undefined
    }
    await expectUnavailable()
  })

  it('discards data if the sender link is revoked while the list is being read', async () => {
    afterListRead = () => { links[0] = { ...source, status: 'revoked', revoked_at: now } }
    await expectEmpty('identity_revoked')
  })

  it('discards data if the sender link expires while the list is being read', async () => {
    vi.setSystemTime(new Date(Date.parse(expiresAt) - 1))
    afterListRead = () => { vi.setSystemTime(new Date(expiresAt)) }
    await expectEmpty('identity_expired')
  })

  it('discards data if the sender is rebound to another contact while reading', async () => {
    afterListRead = () => { links[0] = { ...source, contact_id: otherContact } }
    await expectEmpty('identity_not_linked')
  })

  it('discards data if the source binding version changes during the read', async () => {
    afterListRead = () => { links[0] = { ...source, verified_at: now } }
    await expectUnavailable()
  })

  it('discards data if the contact is deleted while reading', async () => {
    afterListRead = () => { contact = { created_at: joinedAt, deleted_at: now } }
    await expectEmpty('identity_not_linked')
  })

  it('discards accounts that expire while the profile is being read', async () => {
    links[1] = { ...discord, validity_expires_at: new Date(Date.parse(now) + 1).toISOString() }
    afterListRead = () => { vi.setSystemTime(new Date(Date.parse(now) + 1)) }
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect((await response.json()).accounts).toEqual([{ platform: 'slack', workspace_id: 'T1', platform_user_id: 'U1' }])
  })
})
