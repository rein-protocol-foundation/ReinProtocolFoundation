import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AdminOrganizationEmail } from '@/components/admin-organization-email'
vi.mock('@/components/admin-i18n', () => ({ useAdminI18n: () => ({ t: (s: string) => s }) }))
afterEach(() => vi.unstubAllGlobals())
it('resumes a pending request with the saved mailbox and destination', async () => {
  const mailbox = { address: 'zexin.li@rein-protocol.org', destination: 'zexin.li@ntu.edu.sg', status: 'pending', last_error: null }
  const fetchMock = vi.fn().mockImplementation((_url, options) => Promise.resolve({ ok: true, json: async () => options?.method === 'POST' ? { mailbox: { ...mailbox, status: 'active' } } : { mailboxes: [mailbox], rules: [] } }))
  vi.stubGlobal('fetch', fetchMock)
  render(<AdminOrganizationEmail />)
  fireEvent.click(await screen.findByRole('button', { name: 'Check and activate' }))
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/organization-email', expect.objectContaining({ method: 'POST', body: JSON.stringify({ localPart: 'zexin.li', destination: 'zexin.li@ntu.edu.sg' }) })))
  expect(await screen.findByRole('status')).toHaveTextContent('Email forwarding is active.')
})
it('displays loading errors and provides a retry', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
  render(<AdminOrganizationEmail />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load organization email')
  expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled()
})
