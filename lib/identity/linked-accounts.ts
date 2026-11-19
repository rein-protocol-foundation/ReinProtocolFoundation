import 'server-only'
import { z } from 'zod'
import { resolvePlatformIdentity, type LinkTuple, type ResolvedIdentity } from '@/lib/identity/linking'
import { databaseRelation } from '@/lib/supabase/database-names'
import { getSecretClient } from '@/lib/supabase/secret'

const MAX_ACCOUNTS = 20
const identifier = z.string().min(1).refine(value => value === value.trim())
const timestamp = z.iso.datetime({ offset: true })
const platform = z.enum(['discord', 'slack'])
const bindingFields = 'id,contact_id,status,revoked_at,validity_expires_at,verified_at'
const bindingSchema = z.object({
  id: identifier,
  contact_id: identifier,
  status: z.enum(['verified', 'revoked']),
  revoked_at: timestamp.nullable(),
  validity_expires_at: timestamp,
  verified_at: timestamp,
})
const accountsSchema = z.array(bindingSchema.extend({
  platform,
  platform_workspace_id: identifier,
  platform_user_id: identifier,
  status: z.literal('verified'),
  revoked_at: z.null(),
})).max(MAX_ACCOUNTS)
const sourceSchema = bindingSchema.extend({
  contact: z.object({ created_at: timestamp.nullable(), deleted_at: timestamp.nullable() }).nullable(),
})
const participantSchema = z.object({
  name: z.string().nullable(),
  subscription_status: z.enum(['subscribed', 'unsubscribed', 'deleted']),
}).nullable()
const personSchema = z.object({ display_name: z.string().nullable() }).nullable()
const unresolvedStatus = z.enum(['identity_not_linked', 'identity_revoked', 'identity_expired'])

interface LinkedAccounts {
  status: ResolvedIdentity['status']
  contact_id: string | null
  profile: { name: string | null; joinedAt: string | null } | null
  accounts: Array<{ platform: z.infer<typeof platform>; workspace_id: string; platform_user_id: string }>
}

function empty(status: z.infer<typeof unresolvedStatus>): LinkedAccounts {
  return { status, contact_id: null, profile: null, accounts: [] }
}

/** Read the current assertion's canonical profile and verified organization-managed links. */
export async function readLinkedAccounts(
  tuple: Pick<LinkTuple, 'platform' | 'workspaceId' | 'platformUserId'>,
): Promise<LinkedAccounts | null> {
  const identity = await resolvePlatformIdentity(tuple)
  if (!identity) return null
  if (identity.status !== 'resolved') {
    const status = unresolvedStatus.safeParse(identity.status)
    return status.success ? empty(status.data) : null
  }

  const contactId = identifier.safeParse(identity.contactId)
  const client = getSecretClient()
  if (!client || !contactId.success) return null

  const readAt = new Date()
  const [links, participant, person] = await Promise.all([
    client.from('rein_platform_links')
      .select(`${bindingFields},platform,platform_workspace_id,platform_user_id`)
      .eq('contact_id', contactId.data)
      .eq('status', 'verified')
      .is('revoked_at', null)
      .gt('validity_expires_at', readAt.toISOString())
      .limit(MAX_ACCOUNTS + 1),
    client.from('community_participants').select('name,subscription_status').eq('contact_id', contactId.data).maybeSingle(),
    client.from('people').select('display_name').eq('contact_id', contactId.data).maybeSingle(),
  ])
  if (links.error || participant.error || person.error) return null

  const rows = accountsSchema.safeParse(links.data)
  const participantProfile = participantSchema.safeParse(participant.data)
  const personProfile = personSchema.safeParse(person.data)
  if (!rows.success || !participantProfile.success || !personProfile.success) return null
  if (rows.data.some(row => row.contact_id !== contactId.data || Date.parse(row.validity_expires_at) <= readAt.getTime())) {
    return null
  }
  const tuples = new Set(rows.data.map(row => JSON.stringify([row.platform, row.platform_workspace_id, row.platform_user_id])))
  if (tuples.size !== rows.data.length) return null

  // Recheck the source and its contact together after the list and profile reads.
  const latest = await client.from('rein_platform_links')
    .select(`${bindingFields},${databaseRelation('contact', 'community_contacts')}(created_at,deleted_at)`)
    .eq('platform', tuple.platform)
    .eq('platform_workspace_id', tuple.workspaceId)
    .eq('platform_user_id', tuple.platformUserId)
    .maybeSingle()
  if (latest.error) return null
  if (latest.data === null) return empty('identity_not_linked')
  const source = sourceSchema.safeParse(latest.data)
  if (!source.success) return null
  const { contact } = source.data
  if (source.data.contact_id !== contactId.data || !contact || contact.deleted_at) return empty('identity_not_linked')
  if (source.data.status === 'revoked') return empty('identity_revoked')
  if (source.data.revoked_at) return null

  const checkedAt = Date.now()
  if (Date.parse(source.data.validity_expires_at) <= checkedAt) return empty('identity_expired')
  const sourceInList = rows.data.find(row => row.platform === tuple.platform
    && row.platform_workspace_id === tuple.workspaceId && row.platform_user_id === tuple.platformUserId)
  if (!sourceInList || sourceInList.id !== source.data.id || sourceInList.verified_at !== source.data.verified_at
    || sourceInList.validity_expires_at !== source.data.validity_expires_at) return null

  return {
    status: 'resolved',
    contact_id: contactId.data,
    profile: {
      name: personProfile.data?.display_name
        ?? (participantProfile.data?.subscription_status !== 'deleted' ? participantProfile.data?.name : null) ?? null,
      joinedAt: contact.created_at,
    },
    accounts: rows.data.filter(row => Date.parse(row.validity_expires_at) > checkedAt).map(row => ({
      platform: row.platform,
      workspace_id: row.platform_workspace_id,
      platform_user_id: row.platform_user_id,
    })),
  }
}
