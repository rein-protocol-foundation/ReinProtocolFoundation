import { describe, expect, it } from 'vitest'
import {
  automaticRejectionTemplate,
  applicationReceivedTemplate,
  contributorVerificationTemplate,
  contributorWelcomeTemplate,
  conversationInvitationTemplate,
  identityLinkReceiptTemplate,
  participantConfirmationTemplate,
  resourceUpdateTemplate,
} from '@/lib/email-templates'

describe('transactional email templates', () => {
  it('invites participants to Discord without exposing a Contributor Slack invitation', () => {
    const html = participantConfirmationTemplate('New member')
    expect(html).toContain('href="https://discord.gg/m8qnWv9XX"')
    expect(html).toContain('src="https://rein-protocol.org/images/discord-qrcode.png"')
    expect(html).not.toContain('SLACK_INVITE_URL')
    expect(html).not.toContain('Join the Contributor Slack')
    for (const applicantHtml of [
      contributorVerificationTemplate('Person', 'https://example.org/verify'),
      applicationReceivedTemplate('Person'),
      conversationInvitationTemplate('Person', 'https://example.org/schedule'),
    ]) expect(applicantHtml).not.toContain('Join the Contributor Slack')
  })

  it('renders API-supplied Slack invitations safely in Contributor welcome emails', () => {
    const url = 'https://join.slack.com/t/rein/shared_invite/test?one=1&two=2'
    const html = contributorWelcomeTemplate('<b>Person</b> $& {{{SLACK_INVITE_URL}}}', url)
    expect(html).toContain('Hello &lt;b&gt;Person&lt;/b&gt; $&amp; {{{SLACK_INVITE_URL}}},')
    expect(html.match(/href="https:\/\/join.slack.com\/t\/rein\/shared_invite\/test\?one=1&amp;two=2"/g)).toHaveLength(2)
    expect(html).toContain('because you became a Rein Contributor')
    expect(contributorWelcomeTemplate('  ', url)).toContain('Hello there,')
  })

  it.each([
    '', 'javascript:alert(1)', 'http://join.slack.com/invite',
    'https://slack.com.attacker.example/invite', 'https://attacker.example/slack.com',
    'https://user:password@join.slack.com/invite',
  ])('rejects missing or unsafe Slack invitations: %s', (url) => {
    expect(() => contributorWelcomeTemplate('Person', url)).toThrow()
  })

  it('preserves the legal-membership and public-access distinctions', () => {
    expect(participantConfirmationTemplate()).toContain('does not confer legal membership or governance rights')
    expect(contributorVerificationTemplate('Person', 'https://example.org/verify')).toContain('Most public resources and events are open')
  })

  it('describes the 1v1 accurately and never promises recording', () => {
    const html = conversationInvitationTemplate('Person', 'https://example.org/schedule')
    expect(html).toContain('not a traditional interview')
    expect(html).toContain('will not exceed 30 minutes')
    expect(html).toContain('do not record or automatically transcribe')
  })

  it('renders identity receipts in the Rein brand and explains where the code appears', () => {
    const html = identityLinkReceiptTemplate('https://rein-protocol.org/community/link/confirm?receipt=receipt_1&session=session_1')
    expect(html).toContain('REIN PROTOCOL')
    expect(html).toContain('welcome-golden-gate-cover.jpg')
    expect(html).toContain('background-color:#e8ddc8')
    expect(html).toContain('Confirm on the Rein website')
    expect(html).toContain('The email does not contain the binding code')
    expect(html).toContain('page will show a short one-time code')
    expect(html).toContain('receipt=receipt_1&amp;session=session_1')
  })

  it('offers human review and keeps submitters out of resource attribution', () => {
    expect(automaticRejectionTemplate('Person', 'review@example.org')).toContain('A person can review and restore')
    expect(resourceUpdateTemplate('Resource', 'approved')).toContain('not the submitter')
  })

  it('escapes user-controlled values', () => {
    const html = contributorVerificationTemplate('<script>alert(1)</script>', 'https://example.org/?x="bad"')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&quot;bad&quot;')
  })
})
