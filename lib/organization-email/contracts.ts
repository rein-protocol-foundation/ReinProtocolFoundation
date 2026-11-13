import { z } from 'zod'

export const organizationDomain = 'rein-protocol.org'
export const mailboxSchema = z.object({
  localPart: z.string().trim().toLowerCase().min(1).max(64)
    .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/),
  destination: z.string().trim().toLowerCase().max(254).pipe(z.email())
    .refine(value => !value.endsWith(`@${organizationDomain}`), 'Use an external inbox.'),
}).strict()

export type MailboxInput = z.infer<typeof mailboxSchema>
export type Mailbox = {
  address: string
  destination: string
  status: 'pending' | 'active' | 'error'
  last_error: string | null
  updated_at: string
}
export const emailErrors: Record<string, string> = {
  not_configured: 'Organization email is not configured on this server.',
  invalid_request: 'Enter a valid mailbox name and an external destination email.',
  conflict: 'This organization address is already assigned to a different destination or rule.',
  busy: 'This mailbox is being processed. Try again shortly.',
  provider_error: 'Cloudflare could not complete the request. Check its permissions and try again.',
  database_error: 'Could not save the mailbox request. Try again.',
  forbidden: 'This request is not allowed.',
}
