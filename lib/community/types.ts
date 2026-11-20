export type MemberMetrics = {
  allTime: number
  thisMonth: number
  bySource: Record<string, number>
}

export type PublicPerson = {
  person_type: 'director' | 'core_contributor'
  id: string
  slug: string
  display_name: string
  role: string
  responsibilities: string | null
  biography: string | null
  region: string | null
  photo_url: string | null
  photo_alt: string | null
  website_url: string | null
  github_url: string | null
  scholar_url: string | null
  linkedin_url: string | null
  current_work: string | null
  active_since: string | null
  featured: boolean
}

export type PublicResource = {
  background?: string | null
  languages?: { code: string; url: string }[]
  id: string
  slug: string
  title: string
  summary: string
  public_url: string
  resource_type: string
  language: string
  difficulty: string | null
  topics: string[]
  author_publisher: string | null
  access_notes: string | null
  featured: boolean
}

export type PublicEvent = {
  id: string
  slug: string
  title: string
  summary: string
  body: string | null
  format: 'online' | 'in_person' | 'hybrid'
  timezone: string
  country: string | null
  state_region: string | null
  city: string | null
  venue_description: string | null
  attendance_limit: number | null
  attendance_status: 'open' | 'waitlist' | 'full' | 'closed'
  external_registration_url: string
  organizers: string | null
  partners: string | null
  relationship: string
  conference_relationship: string | null
  image_url: string | null
  image_alt: string | null
  image_source: string | null
  event_sessions: Array<{ starts_at: string; ends_at: string }>
}

export type ActionState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  fieldErrors?: Record<string, string[]>
  presentation?: 'inline' | 'dialog'
  dialogKicker?: string
  dialogTitle?: string
}

export const initialActionState: ActionState = { status: 'idle' }
