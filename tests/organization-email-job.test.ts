import { afterEach, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/jobs/organization-email/route'
import { reconcileMailboxes } from '@/lib/organization-email/store'

vi.mock('@/lib/organization-email/store', () => ({ reconcileMailboxes: vi.fn() }))
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })
const request = (token: string) => new Request('https://example.org/api/jobs/organization-email', {
  method: 'POST', headers: { authorization: 'Bearer ' + token },
})

it('rejects missing configuration and incorrect credentials before reading the queue', async () => {
  vi.stubEnv('ORGANIZATION_EMAIL_JOB_SECRET', '')
  expect((await POST(request(''))).status).toBe(403)
  vi.stubEnv('ORGANIZATION_EMAIL_JOB_SECRET', 'test-secret')
  expect((await POST(request('other'))).status).toBe(403)
  expect(reconcileMailboxes).not.toHaveBeenCalled()
})
it('processes the queue for the authenticated scheduler', async () => {
  vi.stubEnv('ORGANIZATION_EMAIL_JOB_SECRET', 'test-secret')
  vi.mocked(reconcileMailboxes).mockResolvedValue({ checked: 1 })
  expect(await (await POST(request('test-secret'))).json()).toEqual({ checked: 1 })
  expect(reconcileMailboxes).toHaveBeenCalledOnce()
})
