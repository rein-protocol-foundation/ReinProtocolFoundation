import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => vi.fn())
vi.mock('@/lib/identity/link-actions', () => ({ requestLinkEmail: request, confirmLinkEmail: vi.fn() }))
import { LinkRequestForm } from '@/app/(site)/community/link/link-forms'

afterEach(() => { cleanup(); vi.clearAllMocks() })

it('hides the email entry after success and resends without retyping it', async () => {
  request.mockImplementation(async () => ({ status: 'success', message: 'Copy the code from your email and send it to Nori.' }))
  render(<LinkRequestForm session="synthetic-session" />)
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'member@example.test' } })
  fireEvent.submit(screen.getByRole('button', { name: 'Email me a binding code' }).closest('form')!)
  await screen.findByRole('button', { name: 'Send another code' })
  expect(screen.queryByRole('textbox')).toBeNull()
  expect(screen.getByText('Check your email')).toBeVisible()
  fireEvent.submit(screen.getByRole('button', { name: 'Send another code' }).closest('form')!)
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2))
  expect(request.mock.calls[1][1].get('email')).toBe('member@example.test')
  expect(request.mock.calls[1][1].get('session_token')).toBe('synthetic-session')
})
