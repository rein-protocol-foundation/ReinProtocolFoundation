import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendParticipantConfirmation } from '@/lib/email'
import { participantConfirmationTemplate } from '@/lib/email-templates'

const { send } = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('resend', () => ({ Resend: class { emails = { send } } }))
vi.mock('@/lib/supabase/secret', () => ({ getSecretClient: () => null, requireSecretClient: vi.fn() }))

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

describe('participant confirmation delivery', () => {
  it.each([undefined, 'legacy-hosted-template'])('sends current repository copy with template setting %s', async (templateId) => {
    vi.stubEnv('RESEND_API_KEY', 'test-key')
    vi.stubEnv('RESEND_FROM_EMAIL', 'Rein <noreply@example.org>')
    vi.stubEnv('RESEND_WELCOME_TEMPLATE_ID', templateId)
    send.mockResolvedValue({ data: { id: 'email-1' }, error: null })

    await sendParticipantConfirmation('person@example.org', '<script>Person</script>')

    const message = send.mock.calls[0][0]
    expect(message.html).toBe(participantConfirmationTemplate('<script>Person</script>'))
    expect(message.html).toContain('&lt;script&gt;Person&lt;/script&gt;')
    expect(message).not.toHaveProperty('template')
    expect(message.to).toBe('person@example.org')
  })

  it('uses the default greeting for a blank name', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key')
    vi.stubEnv('RESEND_FROM_EMAIL', 'noreply@example.org')
    send.mockResolvedValue({ data: { id: 'email-2' }, error: null })
    await sendParticipantConfirmation('person@example.org', '   ')
    expect(send.mock.calls[0][0].html).toContain('Hello there,')
  })
})
