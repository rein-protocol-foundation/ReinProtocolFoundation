import { requireAdmin } from '@/lib/admin/auth'
import { mailboxSchema, emailErrors } from '@/lib/organization-email/contracts'
import { MailboxError, listRoutingRules } from '@/lib/organization-email/cloudflare'
import { listMailboxes, saveMailbox } from '@/lib/organization-email/store'

export const runtime = 'nodejs'
export const maxDuration = 60
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } })
function failure(error: unknown) {
  const code = error instanceof MailboxError ? error.code : 'provider_error'
  return json({ error: code, message: emailErrors[code] ?? emailErrors.provider_error }, error instanceof MailboxError ? error.status : 502)
}
export async function GET() {
  await requireAdmin()
  try {
    const [mailboxes, rules] = await Promise.all([listMailboxes(), listRoutingRules()])
    return json({ mailboxes, rules })
  } catch (error) { return failure(error) }
}
export async function POST(request: Request) {
  const { user } = await requireAdmin()
  // Cookie-authenticated mutations are same-origin JSON requests only.
  if (request.headers.get('origin') !== new URL(request.url).origin ||
    request.headers.get('sec-fetch-site') === 'cross-site') return failure(new MailboxError('forbidden', 403))
  if (!request.headers.get('content-type')?.startsWith('application/json')) return failure(new MailboxError('invalid_request', 400))
  try {
    const body = await request.text()
    if (body.length > 4096) throw new MailboxError('invalid_request', 400)
    let input: unknown
    try { input = JSON.parse(body) } catch { throw new MailboxError('invalid_request', 400) }
    const parsed = mailboxSchema.safeParse(input)
    if (!parsed.success) throw new MailboxError('invalid_request', 400)
    return json({ mailbox: await saveMailbox(parsed.data, user.id) })
  } catch (error) { return failure(error) }
}
