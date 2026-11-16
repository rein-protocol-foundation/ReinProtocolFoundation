import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { isSupabaseSecretKey } from '@/lib/env'
import { emailConfiguration, MailboxError, provisionMailbox } from './cloudflare'
import { organizationDomain, type Mailbox, type MailboxInput } from './contracts'

// Deliberately unscoped: both deployments manage the same real Cloudflare domain.
function store() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key || !isSupabaseSecretKey(key)) throw new MailboxError('not_configured', 503)
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    .from('organization_email_mailboxes')
}
const columns = 'address,destination,status,last_error,updated_at'
export async function listMailboxes(): Promise<Mailbox[]> {
  const { data, error } = await store().select(columns).order('created_at', { ascending: false }).limit(500)
  if (error) throw new MailboxError('database_error', 503)
  return data as Mailbox[]
}
export async function saveMailbox(input: MailboxInput, actorId: string): Promise<Mailbox> {
  emailConfiguration()
  const address = `${input.localPart}@${organizationDomain}`
  const { error: insertError } = await store().upsert({ address, destination: input.destination,
    requested_by: actorId, last_actor_id: actorId }, { onConflict: 'address', ignoreDuplicates: true })
  if (insertError) throw new MailboxError('database_error', 503)
  const { data: current, error: readError } = await store().select('destination').eq('address', address).single()
  if (readError) throw new MailboxError('database_error', 503)
  if (current.destination !== input.destination) throw new MailboxError('conflict', 409)
  const token = randomUUID()
  const now = new Date()
  const { data: lease, error: leaseError } = await store().update({ lock_token: token,
    lock_until: new Date(now.getTime() + 300_000).toISOString(), last_actor_id: actorId,
  }).eq('address', address).lt('lock_until', now.toISOString()).select('address').maybeSingle()
  if (leaseError) throw new MailboxError('database_error', 503)
  if (!lease) throw new MailboxError('busy', 409)
  try {
    const result = await provisionMailbox(input)
    const { data, error } = await store().update({ status: result.status, rule_id: result.ruleId,
      last_error: null, updated_at: new Date().toISOString(), lock_token: null, lock_until: new Date(0).toISOString(),
    }).eq('address', address).eq('lock_token', token).select(columns).single()
    if (error) throw new MailboxError('database_error', 503)
    return data as Mailbox
  } catch (error) {
    await store().update({ status: 'error', last_error: error instanceof MailboxError ? error.code : 'provider_error',
      updated_at: new Date().toISOString(), lock_token: null, lock_until: new Date(0).toISOString(),
    }).eq('address', address).eq('lock_token', token)
    throw error
  }
}
