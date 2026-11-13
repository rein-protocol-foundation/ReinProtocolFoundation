import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ auth: vi.fn(), save: vi.fn(), list: vi.fn(), rules: vi.fn() }))
vi.mock('@/lib/admin/auth', () => ({ requireAdmin: mocks.auth }))
vi.mock('@/lib/organization-email/store', () => ({ saveMailbox: mocks.save, listMailboxes: mocks.list }))
vi.mock('@/lib/organization-email/cloudflare', async importOriginal => ({ ...await importOriginal<object>(), listRoutingRules: mocks.rules }))
import { GET, POST } from '@/app/api/admin/organization-email/route'
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ user: { id: 'admin' } }); mocks.save.mockResolvedValue({ status: 'pending' }) })
afterEach(() => vi.restoreAllMocks())
function request(body: unknown, origin = 'https://rein-protocol.org') {
  return new Request('https://rein-protocol.org/api/admin/organization-email', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) })
}
it('authenticates reads and writes before accessing mailbox data', async () => {
  mocks.auth.mockRejectedValue(new Error('unauthorized'))
  await expect(GET()).rejects.toThrow('unauthorized')
  await expect(POST(request({}))).rejects.toThrow('unauthorized')
  expect(mocks.list).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled()
})
it('rejects cross-origin requests without side effects', async () => {
  expect((await POST(request({}, 'https://evil.example'))).status).toBe(403)
  expect(mocks.save).not.toHaveBeenCalled()
})
it('rejects invalid input', async () => {
  expect((await POST(request({ localPart: 'a', destination: 'admin@rein-protocol.org' }))).status).toBe(400)
  expect(mocks.save).not.toHaveBeenCalled()
})
it('submits valid normalized input as the authenticated admin', async () => {
  const response = await POST(request({ localPart: 'Zexin.Li', destination: 'zexin.li@ntu.edu.sg' }))
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(mocks.save).toHaveBeenCalledWith({ localPart: 'zexin.li', destination: 'zexin.li@ntu.edu.sg' }, 'admin')
})
