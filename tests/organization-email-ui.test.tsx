import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AdminOrganizationEmail } from '@/components/admin-organization-email'
vi.mock('@/components/admin-i18n', () => ({ useAdminI18n: () => ({ t: (s: string) => s }) }))
afterEach(() => vi.unstubAllGlobals())
it('retries a failed request with the saved mailbox and destination', async () => {
  const mailbox = { address: 'zexin.li@rein-protocol.org', destination: 'zexin.li@ntu.edu.sg', status: 'error', last_error: null }
  const fetchMock = vi.fn().mockImplementation((_url, options) => Promise.resolve({ ok: true, json: async () => options?.method === 'POST' ? { mailbox: { ...mailbox, status: 'active' } } : { mailboxes: [mailbox], rules: [] } }))
  vi.stubGlobal('fetch', fetchMock)
  render(<AdminOrganizationEmail />)
  fireEvent.click(await screen.findByRole('button', { name: 'Retry activation' }))
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/organization-email', expect.objectContaining({ method: 'POST', body: JSON.stringify({ localPart: 'zexin.li', destination: 'zexin.li@ntu.edu.sg' }) })))
  expect(await screen.findByRole('status')).toHaveTextContent('Email forwarding is active.')
})
it('displays loading errors and provides a retry', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
  render(<AdminOrganizationEmail />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load organization email')
  expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled()
})

it('lists external rules and pending requests together and displays a matching live rule once', async () => {
  const address = 'member@rein-protocol.org'
  const destination = 'member@example.org'
  const rule = (name: string) => ({ id: name, enabled: true, matchers: [{ type: 'literal', field: 'to', value: name }],
    actions: [{ type: 'forward', value: [destination] }] })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
    mailboxes: [address, 'pending@rein-protocol.org'].map(address => ({ address, destination, status: 'pending' })),
    rules: [rule(address), rule('external@rein-protocol.org')],
  }) }))
  render(<AdminOrganizationEmail />)
  expect(await screen.findAllByRole('article')).toHaveLength(3)
  expect(screen.getAllByText(address)).toHaveLength(1)
  const groups = screen.getAllByRole('region')
  expect(groups[0]).toHaveAccessibleName('Awaiting verification')
  expect(within(groups[0]).getAllByRole('article')).toHaveLength(1)
  expect(groups[0]).toHaveTextContent('pending@rein-protocol.org')
  expect(groups[1]).toHaveTextContent(address)
  expect(screen.getByPlaceholderText('tom.wang')).toHaveValue('')
  expect(screen.queryByRole('button', { name: 'Retry activation' })).toBeNull()
})

it('asks for confirmation before deleting the selected rule and refreshes the inventory', async () => {
  const address = 'tom.wang@rein-protocol.org'
  const destination = 'member@example.org'
  const rule = { id: 'rule-1', enabled: true, matchers: [{ type: 'literal', field: 'to', value: address }],
    actions: [{ type: 'forward', value: [destination] }] }
  const response = (value: unknown) => ({ ok: true, json: async () => value })
  const fetchMock = vi.fn().mockResolvedValueOnce(response({ mailboxes: [], rules: [rule] }))
    .mockResolvedValueOnce(response({ deleted: true })).mockResolvedValueOnce(response({ mailboxes: [], rules: [] }))
  vi.stubGlobal('fetch', fetchMock)
  const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
  try {
    render(<AdminOrganizationEmail />)
    const button = await screen.findByRole('button', { name: 'Delete forwarding rule' })
    fireEvent.click(button)
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining(address + ' → ' + destination))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    fireEvent.click(button)
    await waitFor(() => expect(screen.queryByText(address)).toBeNull())
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/organization-email', expect.objectContaining({
      method: 'DELETE', body: JSON.stringify({ localPart: 'tom.wang', destination, ruleId: rule.id }),
    }))
  } finally { confirm.mockRestore() }
})
