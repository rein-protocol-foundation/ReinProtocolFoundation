import 'server-only'
import { unstable_noStore as noStore } from 'next/cache'
import { getPublicClient } from '@/lib/supabase/public'
import { getSecretClient } from '@/lib/supabase/secret'
import { RESOURCE_PUBLIC_FIELDS, publishedEventsQuery, publishedResourcesQuery } from '@/lib/community/queries'
import type { MemberMetrics, PublicEvent, PublicPerson, PublicResource } from '@/lib/community/types'

const emptyMetrics: MemberMetrics = { allTime: 0, thisMonth: 0, bySource: {} }

export async function getPublicMemberMetrics(): Promise<MemberMetrics> {
  noStore()
  const client = getPublicClient()
  if (!client) return emptyMetrics
  const { data, error } = await client.rpc('get_public_community_metrics')
  if (error || !data?.[0]) return emptyMetrics
  return {
    allTime: Number(data[0].all_time ?? 0),
    thisMonth: Number(data[0].this_month ?? 0),
    bySource: data[0].by_source ?? {},
  }
}

export async function getPublicPeople(options: { featured?: boolean } = {}): Promise<PublicPerson[]> {
  noStore()
  const client = getPublicClient()
  if (!client) return []
  let query = client.from('people').select('*').eq('publication_status', 'published').order('sort_order').order('display_name')
  if (options.featured) query = query.eq('featured', true).limit(4)
  const { data, error } = await query
  return error ? [] : (data as PublicPerson[])
}

export async function getPublishedResources({ limit = 12, offset = 0, language = '', coding = '' } = {}) {
  noStore()
  const client = getPublicClient()
  const unavailable = { resources: [] as PublicResource[], hasMore: false, unavailable: true }
  if (!client) return unavailable
  let query = publishedResourcesQuery(client, RESOURCE_PUBLIC_FIELDS + ',background:learning_metadata->>prerequisite_notes,languages:learning_metadata->languages')
  if (language) query = query.contains('learning_metadata', { languages: [{ code: language }] })
  if (coding) query = query.eq('learning_metadata->>coding_requirement', coding)
  const { data, error } = await query.range(offset, offset + limit)
  if (error) return unavailable
  const resources = (data ?? []) as unknown as PublicResource[]
  return { resources: resources.slice(0, limit), hasMore: resources.length > limit, unavailable: false }
}

export async function getPublishedEvents(): Promise<PublicEvent[] | null> {
  noStore()
  const client = getPublicClient()
  if (!client) return null
  const { data, error } = await publishedEventsQuery(client)
  return error ? null : (data as unknown as PublicEvent[])
}

export async function getPublishedEvent(slug: string): Promise<PublicEvent | null> {
  noStore()
  const client = getPublicClient()
  if (!client) return null
  const { data, error } = await publishedEventsQuery(client).eq('slug', slug).maybeSingle()
  return error ? null : (data as PublicEvent | null)
}

export async function getPublicSiteSettings(keys: string[]): Promise<Record<string, string>> {
  noStore()
  const allowed = new Set(['github_repository_url', 'github_event_url', 'github_campus_url', 'github_technical_url', 'email_identity'])
  const requested = keys.filter((key) => allowed.has(key))
  if (!requested.length) return {}
  const client = getSecretClient()
  if (!client) return {}
  const { data, error } = await client.from('site_settings').select('setting_key,setting_value').in('setting_key', requested)
  if (error) return {}
  return Object.fromEntries((data ?? []).map((item) => [item.setting_key, item.setting_value]))
}
