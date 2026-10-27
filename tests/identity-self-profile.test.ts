import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
const state = vi.hoisted(() => ({ rows: {} as Record<string, unknown>, error: null as unknown, queries: [] as unknown[] }))
vi.mock('@/lib/supabase/secret', () => ({ getSecretClient: () => ({ from(table: string) {
  const result = { data: state.rows[table] ?? null, error: state.error }
  const query = {
    select(fields: string) { state.queries.push([table, fields]); return query },
    eq(key: string, value: string) { state.queries.push([key, value]); return query },
    maybeSingle() { return Promise.resolve(result) },
    then(resolve: (value: unknown) => unknown) { return Promise.resolve(result).then(resolve) },
  }
  return query
} }) }))
import { readLinkedSelfProfile } from '@/lib/identity/self-profile'
beforeEach(() => {
  state.error = null; state.queries = []
  state.rows = {
    community_contacts: { created_at: '2026-01-01T00:00:00Z', deleted_at: null },
    community_participants: { name: 'Synthetic Member', subscription_status: 'subscribed' },
    contact_identities: [{ normalized_value: 'self@example.invalid' }],
  }
})
it('queries the canonical contact only and returns a bounded field set', async () => {
  expect(await readLinkedSelfProfile('self-contact')).toEqual({ name: 'Synthetic Member', email: 'self@example.invalid', joinedAt: '2026-01-01T00:00:00Z' })
  expect(state.queries.filter(q => Array.isArray(q) && ['id', 'contact_id'].includes(q[0]))).toEqual([
    ['id', 'self-contact'], ['contact_id', 'self-contact'], ['contact_id', 'self-contact'], ['contact_id', 'self-contact'],
  ])
})
it('does not choose an arbitrary email and prefers the current people display name', async () => {
  state.rows.contact_identities = [{ normalized_value: 'one@example.invalid' }, { normalized_value: 'two@example.invalid' }]
  state.rows.people = { display_name: 'Current Name' }
  expect(await readLinkedSelfProfile('self-contact')).toMatchObject({ name: 'Current Name', email: null })
})
it('fails closed for a deleted/missing contact or failed read', async () => {
  state.rows.community_contacts = { deleted_at: '2026-01-02T00:00:00Z' }
  expect(await readLinkedSelfProfile('self-contact')).toBeNull()
  state.rows.community_contacts = null
  expect(await readLinkedSelfProfile('self-contact')).toBeNull()
  state.error = new Error('offline')
  expect(await readLinkedSelfProfile('self-contact')).toBeNull()
})
