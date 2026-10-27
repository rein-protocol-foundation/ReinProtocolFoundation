import 'server-only'
import { getSecretClient } from '@/lib/supabase/secret'

/** Only call with a freshly resolved canonical contact, never a request/model argument. */
export async function readLinkedSelfProfile(contactId: string) {
  const client = getSecretClient()
  if (!client) return null
  const [contact, participant, person, emails] = await Promise.all([
    client.from('community_contacts').select('created_at,deleted_at').eq('id', contactId).maybeSingle(),
    client.from('community_participants').select('name,subscription_status').eq('contact_id', contactId).maybeSingle(),
    client.from('people').select('display_name').eq('contact_id', contactId).maybeSingle(),
    client.from('contact_identities').select('normalized_value').eq('contact_id', contactId).eq('identity_kind', 'email'),
  ])
  if ([contact, participant, person, emails].some(result => result.error) || !contact.data || contact.data.deleted_at) return null
  // Several registered addresses have no primary marker. Do not arbitrarily choose one.
  const email = emails.data?.length === 1 ? emails.data[0].normalized_value : null
  return {
    name: person.data?.display_name ?? (participant.data?.subscription_status !== 'deleted' ? participant.data?.name : null) ?? null,
    email: email ?? null,
    joinedAt: contact.data.created_at ?? null,
  }
}
