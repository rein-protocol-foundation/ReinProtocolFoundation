import { beforeEach, expect, it, vi } from 'vitest'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase/secret', () => ({ getSecretClient: () => ({ rpc }) }))
import { issueEmailChallenge } from '@/lib/identity/linking'
import { hashValue } from '@/lib/agent/credentials'

beforeEach(() => { rpc.mockReset() })

it('creates a high-entropy binding code and stores only digests without verifying the email', async () => {
  rpc.mockResolvedValue({ data: [{ ok: true }], error: null })
  const result = await issueEmailChallenge({ sessionToken: 'session', email: ' MEMBER@EXAMPLE.TEST ', ipHash: 'ip-hash' })
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error('expected issued code')
  expect(result.code).toMatch(/^rein-[a-z0-9_-]{12}$/)
  expect(rpc).toHaveBeenCalledOnce()
  expect(rpc.mock.calls[0][0]).toBe('rein_issue_link_email_binding_code')
  const args = rpc.mock.calls[0][1]
  expect(args).toMatchObject({ p_session_token_hash: hashValue('session'), p_email: 'member@example.test',
    p_email_hash: hashValue('member@example.test'), p_code_hash: hashValue(result.code),
    p_ip_hash: 'ip-hash', p_max_per_session: 5, p_max_per_ip: 20 })
  expect(JSON.stringify(args)).not.toContain(result.code)
  expect(result).not.toHaveProperty('receiptToken')
})

it('returns no code when the guarded issuer refuses a request', async () => {
  rpc.mockResolvedValue({ data: [{ ok: false, reason: 'rate_limited' }], error: null })
  expect(await issueEmailChallenge({ sessionToken: 'session', email: 'member@example.test', ipHash: null }))
    .toEqual({ ok: false, reason: 'rate_limited' })
})
