import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { matchingRule, provisionMailbox, type RoutingRule } from '@/lib/organization-email/cloudflare'
import { mailboxSchema } from '@/lib/organization-email/contracts'

const input = { localPart: 'zexin.li', destination: 'zexin.li@ntu.edu.sg' }
const address = 'zexin.li@rein-protocol.org'
const rule: RoutingRule = { id: 'rule-1', enabled: true, matchers: [{ type: 'literal', field: 'to', value: address }], actions: [{ type: 'forward', value: [input.destination] }] }
const fetchMock = vi.fn()
const ok = (result: unknown, extra = {}) => ({ ok: true, json: async () => ({ success: true, result, ...extra }) })
function zone() { fetchMock.mockResolvedValueOnce(ok({ name: 'rein-protocol.org', account: { id: 'account' } })) }
beforeEach(() => {
  vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', 'account'); vi.stubEnv('CLOUDFLARE_ZONE_ID', 'zone'); vi.stubEnv('CLOUDFLARE_API_TOKEN', 'secret')
  fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
describe('organization email routing', () => {
  it('normalizes input and rejects internal forwarding, injection, and invalid names', () => {
    expect(mailboxSchema.parse({ localPart: ' Zexin.Li ', destination: ' Zexin.Li@ntu.edu.sg ' })).toEqual(input)
    for (const localPart of ['a..b', 'a+b', '../admin', 'a@b', '.foo']) expect(mailboxSchema.safeParse({ ...input, localPart }).success).toBe(false)
    expect(mailboxSchema.safeParse({ ...input, destination: 'admin@rein-protocol.org' }).success).toBe(false)
    expect(mailboxSchema.safeParse({ ...input, enabled: true }).success).toBe(false)
  })
  it('creates one destination but no rule before verification', async () => {
    zone(); fetchMock.mockResolvedValueOnce(ok([])).mockResolvedValueOnce(ok([])).mockResolvedValueOnce(ok({ id: 'dest', email: input.destination, verified: null }))
    expect(await provisionMailbox(input)).toEqual({ status: 'pending', ruleId: null })
    expect(fetchMock.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1)
    expect(fetchMock.mock.calls.at(-1)?.[0]).toContain('/email/routing/addresses')
  })
  it('does not resend verification for an existing pending destination', async () => {
    zone(); fetchMock.mockResolvedValueOnce(ok([])).mockResolvedValueOnce(ok([{ email: input.destination, verified: null }]))
    expect((await provisionMailbox(input)).status).toBe('pending')
    expect(fetchMock.mock.calls.every(([, options]) => options.method === 'GET')).toBe(true)
  })
  it('creates and reads back a verified mapping', async () => {
    zone(); fetchMock.mockResolvedValueOnce(ok([])).mockResolvedValueOnce(ok([{ email: input.destination, verified: 'date' }]))
      .mockResolvedValueOnce(ok([])).mockResolvedValueOnce(ok(rule)).mockResolvedValueOnce(ok([rule]))
    expect(await provisionMailbox(input)).toEqual({ status: 'active', ruleId: rule.id })
    const post = fetchMock.mock.calls.find(([, o]) => o.method === 'POST')!
    expect(JSON.parse(post[1].body)).toMatchObject({ enabled: true, actions: rule.actions, matchers: rule.matchers })
  })
  it('reuses an identical existing mapping', async () => {
    zone(); fetchMock.mockResolvedValueOnce(ok([rule])).mockResolvedValueOnce(ok([{ email: input.destination, verified: 'date' }]))
    expect((await provisionMailbox(input)).status).toBe('active')
    expect(fetchMock.mock.calls).toHaveLength(3)
  })
  it('refuses conflicting, disabled, and ambiguous rules', () => {
    for (const rules of [[{ ...rule, enabled: false }], [rule, rule], [{ ...rule, actions: [{ type: 'drop' }] }]]) {
      expect(() => matchingRule(rules, address, input.destination)).toThrow('conflict')
    }
    expect(() => matchingRule([rule], address, 'someone@else.com')).toThrow('conflict')
  })
  it('finds conflicts on later pages before creating any destination', async () => {
    zone(); fetchMock.mockResolvedValueOnce(ok(Array.from({ length: 50 }, () => ({ ...rule, matchers: [] })), { result_info: { total_pages: 2 } }))
      .mockResolvedValueOnce(ok([{ ...rule, enabled: false }]))
    await expect(provisionMailbox(input)).rejects.toThrow('conflict')
    expect(fetchMock.mock.calls[2][0]).toContain('page=2')
    expect(fetchMock.mock.calls).toHaveLength(3)
  })
  it('refuses a mismatched zone before writes', async () => {
    fetchMock.mockResolvedValueOnce(ok({ name: 'other.org', account: { id: 'account' } }))
    await expect(provisionMailbox(input)).rejects.toThrow('not_configured')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('does not return provider payloads or secrets on failures', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ success: false, errors: [{ message: 'secret' }] }) })
    await expect(provisionMailbox(input)).rejects.toThrow('provider_error')
  })
})
