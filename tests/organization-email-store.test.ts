import { beforeEach, afterEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ from: vi.fn(), provision: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: mocks.from }) }))
vi.mock('@/lib/organization-email/cloudflare', async original => ({ ...await original<object>(), provisionMailbox: mocks.provision }))
import { saveMailbox } from '@/lib/organization-email/store'
const input = { localPart: 'zexin.li', destination: 'zexin.li@ntu.edu.sg' }
let results: unknown[]
let builders: Record<string, ReturnType<typeof vi.fn>>[]
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co'); vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
  vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', 'account'); vi.stubEnv('CLOUDFLARE_API_TOKEN', 'token'); vi.stubEnv('CLOUDFLARE_ZONE_ID', 'zone')
  vi.clearAllMocks(); builders = []; results = []
  mocks.from.mockImplementation(() => {
    const result = results.shift()
    const builder: Record<string, ReturnType<typeof vi.fn>> = {}
    for (const method of ['select', 'update', 'upsert', 'eq', 'lt', 'single', 'maybeSingle']) builder[method] = vi.fn(() => builder)
    builder.then = vi.fn((resolve: (value: unknown) => void) => Promise.resolve(result).then(resolve))
    builders.push(builder); return builder
  })
})
afterEach(() => vi.unstubAllEnvs())
it('does not overwrite a reservation for a different recipient', async () => {
  results = [{ error: null }, { data: { destination: 'someone@example.org' } }]
  await expect(saveMailbox(input, 'actor')).rejects.toThrow('conflict')
  expect(mocks.provision).not.toHaveBeenCalled()
  expect(builders[0].upsert).toHaveBeenCalledWith(expect.anything(), { onConflict: 'address', ignoreDuplicates: true })
})
it('rejects a concurrent request before any Cloudflare mutation', async () => {
  results = [{}, { data: { destination: input.destination } }, { data: null }]
  await expect(saveMailbox(input, 'actor')).rejects.toThrow('busy')
  expect(mocks.provision).not.toHaveBeenCalled()
  expect(builders[2].lt).toHaveBeenCalledWith('lock_until', expect.any(String))
})
it('persists the pending result and releases its own lease', async () => {
  results = [{}, { data: { destination: input.destination } }, { data: { address: 'x' } }, { data: { status: 'pending' } }]
  mocks.provision.mockResolvedValue({ status: 'pending', ruleId: null })
  expect(await saveMailbox(input, 'actor')).toEqual({ status: 'pending' })
  expect(builders[3].update).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending', lock_token: null }))
  expect(builders[3].eq).toHaveBeenCalledWith('lock_token', expect.any(String))
})
it('records provider failure and releases the lease for a safe retry', async () => {
  results = [{}, { data: { destination: input.destination } }, { data: { address: 'x' } }, {}]
  mocks.provision.mockRejectedValue(new Error('secret provider payload'))
  await expect(saveMailbox(input, 'actor')).rejects.toThrow()
  expect(builders[3].update).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', last_error: 'provider_error', lock_token: null }))
})
