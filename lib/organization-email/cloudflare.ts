import 'server-only'
import { organizationDomain, type MailboxInput } from './contracts'

export class MailboxError extends Error {
  constructor(public code: string, public status = 502) { super(code) }
}
type Destination = { id: string; email: string; verified: string | null }
export type RoutingRule = {
  id: string; enabled: boolean
  matchers: { type: string; field?: string; value?: string }[]
  actions: { type: string; value?: string[] }[]
}
type Envelope<T> = { success: boolean; result: T; result_info?: { total_pages?: number } }

export function emailConfiguration() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim()
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim()
  if (!accountId || !token || !zoneId) throw new MailboxError('not_configured', 503)
  return { accountId, token, zoneId }
}

async function request<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<Envelope<T>> {
  const { token } = emailConfiguration()
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000),
    })
    const data = await response.json() as Envelope<T>
    if (!response.ok || !data.success || data.result == null) throw new Error('provider_error')
    return data
  } catch { throw new MailboxError('provider_error') }
}
async function list<T>(path: string, signal?: AbortSignal): Promise<T[]> {
  const rows: T[] = []
  for (let page = 1; page <= 100; page++) {
    const data = await request<T[]>(`${path}?page=${page}&per_page=50`, undefined, signal)
    if (!Array.isArray(data.result)) throw new MailboxError('provider_error')
    rows.push(...data.result)
    if (data.result.length < 50 || page >= (data.result_info?.total_pages ?? Infinity)) return rows
  }
  throw new MailboxError('provider_error') // Never make conflict decisions from a partial list.
}
export async function listRoutingRules(signal?: AbortSignal) {
  const { zoneId } = emailConfiguration()
  return list<RoutingRule>(`/zones/${zoneId}/email/routing/rules`, signal)
}
export function matchingRule(rules: RoutingRule[], address: string, destination: string) {
  const matches = rules.filter(rule => rule.matchers.some(m => m.type === 'literal' && m.field === 'to' && m.value?.toLowerCase() === address))
  if (!matches.length) return undefined
  const rule = matches[0]
  if (matches.length !== 1 || !rule.enabled || rule.matchers.length !== 1 || rule.actions.length !== 1 ||
    rule.actions[0].type !== 'forward' || rule.actions[0].value?.length !== 1 ||
    rule.actions[0].value[0].toLowerCase() !== destination) throw new MailboxError('conflict', 409)
  return rule
}
export async function provisionMailbox(input: MailboxInput) {
  const { accountId, zoneId } = emailConfiguration()
  const signal = AbortSignal.timeout(45_000)
  // Verify the configured zone before any mutation, even if a deployment has the wrong zone ID.
  const zone = (await request<{ name: string; account: { id: string } }>(`/zones/${zoneId}`, undefined, signal)).result
  if (zone.name !== organizationDomain || zone.account.id !== accountId) throw new MailboxError('not_configured', 503)
  const address = `${input.localPart}@${organizationDomain}`
  const existing = matchingRule(await listRoutingRules(signal), address, input.destination)
  const destinationsPath = `/accounts/${accountId}/email/routing/addresses`
  let destination = (await list<Destination>(destinationsPath, signal)).find(d => d.email.toLowerCase() === input.destination)
  if (!destination) {
    try { destination = (await request<Destination>(destinationsPath, { email: input.destination }, signal)).result }
    catch (error) {
      // Another mailbox may have registered this same destination concurrently.
      destination = (await list<Destination>(destinationsPath, signal)).find(d => d.email.toLowerCase() === input.destination)
      if (!destination) throw error
    }
  }
  if (!destination.verified) return { status: 'pending' as const, ruleId: null }
  if (existing) return { status: 'active' as const, ruleId: existing.id }
  // Recheck before creation; the dashboard/other clients can also manage this zone.
  const concurrent = matchingRule(await listRoutingRules(signal), address, input.destination)
  if (concurrent) return { status: 'active' as const, ruleId: concurrent.id }
  const rule = (await request<RoutingRule>(`/zones/${zoneId}/email/routing/rules`, {
    name: `Organization email: ${input.localPart}`, enabled: true,
    matchers: [{ type: 'literal', field: 'to', value: address }],
    actions: [{ type: 'forward', value: [input.destination] }],
  }, signal)).result
  const confirmed = matchingRule(await listRoutingRules(signal), address, input.destination)
  if (!confirmed || confirmed.id !== rule.id) throw new MailboxError('provider_error')
  return { status: 'active' as const, ruleId: rule.id }
}
