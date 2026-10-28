import { participantWelcomeHtml } from './participant-welcome'
import { contributorWelcomeHtml } from './contributor-welcome'
import { emailActionButton, escapeEmailHtml as escapeHtml, reinEmailLayout } from './email-layout'
import communityInvites from './community-invites.json' with { type: 'json' }

export const discordCommunityLaunchSubject = 'Rein’s Discord is live — come meet Nori Agent'

// Announcement draft for existing Community Members; no sending flow is connected.
export function discordCommunityLaunchTemplate(name?: string) {
  return reinEmailLayout({
    title: discordCommunityLaunchSubject,
    preheader: 'Join fellow Rein members on Discord and say hello to Nori Agent.',
    kicker: 'A COMMUNITY UPDATE',
    heading: 'Our Discord community is live.',
    bodyHtml: `<p style="margin:0 0 16px;">Hello ${escapeHtml(name?.trim() || 'there')},</p>
<p style="margin:0 0 16px;">Thank you for being part of the Rein community. We’re excited to share that our Discord community is now live, and you’re invited to join us.</p>
<p style="margin:0 0 16px;">It’s a place to meet other members, share what you’re learning or building, and exchange questions and ideas about AI agents.</p>
<h2 style="margin:26px 0 10px;font-family:Georgia,serif;font-size:25px;font-weight:normal;line-height:1.3;">Say hello to Nori Agent.</h2>
<p style="margin:0 0 16px;">You’ll also find Nori Agent, Rein’s community AI agent, on Discord. Introduce yourself and start a conversation about your interests, questions, or projects.</p>
<p style="margin:0 0 20px;">Not sure where to start? Try: “Hi Nori! I’m new here, and I’m interested in learning more about AI agents. How can I get involved?”</p>
${emailActionButton('Join the Rein Discord community', communityInvites.discordInviteUrl)}
<p style="margin:18px 0 8px;"><a href="${communityInvites.discordInviteUrl}"><img src="https://rein-protocol.org${communityInvites.discordQrCodePath}" width="164" height="164" alt="QR code to join the Rein Discord server" style="display:block;border:0;width:164px;height:164px;"></a></p>
<p style="margin:0 0 22px;color:#75695e;font-size:12px;line-height:1.6;">Scan to join on your phone, or open <a href="${communityInvites.discordInviteUrl}" style="color:#a83f22;text-decoration:underline;">${communityInvites.discordInviteUrl}</a>.</p>
<p style="margin:0 0 16px;">Already on the server? Drop by and say hello—we’d love to hear what you’ve been working on.</p>
<p style="margin:0 0 20px;">We look forward to seeing you there.</p>`,
    footerNote: 'You’re receiving this community update because you registered with Rein Protocol Foundation.',
  })
}

export function participantConfirmationTemplate(name?: string) {
  return participantWelcomeHtml.replace('{{{USER_NAME}}}', () => escapeHtml(name?.trim() || 'there'))
}

// Call only after Contributor approval, with the URL returned by the invitation API.
export function contributorWelcomeTemplate(name: string, slackInviteUrl: string) {
  const invite = new URL(slackInviteUrl)
  if (invite.protocol !== 'https:' || invite.username || invite.password || invite.port
    || !(invite.hostname === 'slack.com' || invite.hostname.endsWith('.slack.com'))) {
    throw new Error('A valid HTTPS Slack invitation URL is required.')
  }
  const values: Record<string, string> = {
    USER_NAME: escapeHtml(name.trim() || 'there'),
    SLACK_INVITE_URL: escapeHtml(invite.href),
  }
  return contributorWelcomeHtml.replace(/\{\{\{(USER_NAME|SLACK_INVITE_URL)\}\}\}/g, (_, key: string) => values[key])
}

export function contributorVerificationTemplate(name: string, verificationUrl: string) {
  return reinEmailLayout({
    title: 'Verify your Rein Contributor application',
    preheader: 'Confirm your email within 24 hours to move your Contributor application into review.',
    kicker: 'CONTRIBUTOR APPLICATION',
    heading: 'Verify your email.',
    bodyHtml: `<p style="margin:0 0 16px;">Hello ${escapeHtml(name)},</p>
<p style="margin:0 0 16px;">Confirm your email within 24 hours so your Contributor application can enter review.</p>
${emailActionButton('Verify my email', verificationUrl)}
<p style="margin:0 0 20px;">Most public resources and events are open without becoming a Contributor. Applying is for people who want deeper participation, to organize activities, or to take responsibility for ongoing work.</p>`,
    footerNote: 'You received this email because a Contributor application was submitted with this address. Applying does not confer Contributor status or governance rights.',
  })
}

export function identityLinkReceiptTemplate(receiptUrl: string) {
  const safeReceiptUrl = escapeHtml(receiptUrl)
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirm your Rein community identity link</title><style>@media only screen and (max-width:480px){.rein-brand{padding:16px 8px 16px 16px!important}.rein-logo-cell{width:48px!important}.rein-mark{width:48px!important;height:48px!important}.rein-wordmark{padding-left:10px!important;font-size:11px!important;letter-spacing:1px!important}.rein-bridge{height:80px!important;background-size:220px 110px!important}}</style></head>
<body style="margin:0;padding:0;background-color:#e8ddc8;color:#302a25;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">Confirm your email address, then return the one-time code to the Rein Agent.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#e8ddc8"><tr><td align="center" style="padding:24px 12px;">
<!--[if mso]><table role="presentation" width="640" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f5ead3" style="max-width:640px;border:1px solid #d0c3ad;font-family:Arial,sans-serif;">
<tr><td style="border-bottom:1px solid #d5c7b1;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
<td class="rein-brand" width="65%" valign="middle" style="padding:24px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
<td class="rein-logo-cell" width="64" valign="middle"><a href="https://rein-protocol.org/"><img class="rein-mark" src="https://rein-protocol.org/brand/rein-mark-header.png" width="64" height="64" alt="Rein logo" style="display:block;border:0;width:64px;height:64px;"></a></td>
<td class="rein-wordmark" valign="middle" style="padding-left:16px;color:#302a25;font-size:16px;font-weight:bold;letter-spacing:2px;line-height:1.5;">REIN PROTOCOL<br>FOUNDATION</td>
</tr></table></td>
<td class="rein-bridge" width="35%" height="112" aria-hidden="true" bgcolor="#f5ead3" style="height:112px;background-image:url('https://rein-protocol.org/images/welcome-golden-gate-cover.jpg');background-repeat:no-repeat;background-position:10% 58%;background-size:300px 150px;font-size:0;line-height:0;">&nbsp;</td>
</tr></table></td></tr>
<tr><td style="padding:28px 24px 20px;">
<p style="margin:0 0 12px;color:#75695e;font-size:11px;letter-spacing:2px;line-height:1.5;">ACCOUNT SECURITY</p>
<h1 style="margin:0;font-family:Georgia,serif;font-size:34px;font-weight:normal;line-height:1.18;color:#302a25;">Confirm your community identity link.</h1>
</td></tr>
<tr><td style="padding:16px 24px 12px;font-size:15px;line-height:1.75;">
<p style="margin:0 0 16px;">Hello,</p>
<p style="margin:0 0 16px;">A request was made to connect a chat account to the Rein community identity registered with this email address.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="#a83f22" style="border:1px solid #a83f22;mso-padding-alt:13px 22px;"><a href="${safeReceiptUrl}" style="display:inline-block;padding:13px 22px;color:#ffffff;font-size:14px;font-weight:bold;line-height:1.4;text-decoration:none;">Confirm on the Rein website →</a></td></tr></table>
<p style="margin:22px 0 16px;"><strong>The email does not contain the binding code.</strong> After you confirm the address on the Rein website, that page will show a short one-time code. Return to the chat and send the code to the Rein Agent to finish linking.</p>
<p style="margin:0 0 16px;">This link expires in ten minutes and can be used once. If you did not request it, ignore this message; nothing changes unless the address is confirmed and the code is returned from the requesting chat account.</p>
<p style="margin:0 0 20px;">Confirming an address does not by itself create community membership, Contributor status, or governance rights.</p>
</td></tr>
<tr><td style="padding:20px 24px 24px;border-top:1px solid #d5c7b1;color:#75695e;font-size:11px;line-height:1.65;">
<p style="margin:0 0 10px;">You received this security email because someone entered this address in Rein’s account-linking flow.</p>
<p style="margin:0;"><a href="https://rein-protocol.org/" style="color:#75695e;">rein-protocol.org</a> · <a href="https://rein-protocol.org/privacy" style="color:#75695e;">Privacy</a></p>
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`
}

export function applicationReceivedTemplate(name: string) {
  return reinEmailLayout({
    title: 'Your Contributor application is in review',
    preheader: 'Your email is verified. Your Contributor application is now in review.',
    kicker: 'CONTRIBUTOR APPLICATION',
    heading: 'Your application is in review.',
    bodyHtml: `<p style="margin:0 0 16px;">Hello ${escapeHtml(name)},</p>
<p style="margin:0 0 16px;">Your email is verified and your application is now in review. If we invite you to a 1v1, it will be a conversation—not a traditional interview—and will last no more than 30 minutes.</p>
<p style="margin:0 0 20px;">We welcome people across industries, educational backgrounds, and professional paths.</p>`,
    footerNote: 'You received this email because you verified your Contributor application. Applying does not confer Contributor status or governance rights.',
  })
}

export function conversationInvitationTemplate(name: string, schedulingUrl: string) {
  return reinEmailLayout({
    title: 'Schedule a Rein Contributor conversation',
    preheader: 'Choose a time for a conversation about Rein and your contribution interests.',
    kicker: 'CONTRIBUTOR CONVERSATION',
    heading: 'Let’s meet.',
    bodyHtml: `<p style="margin:0 0 16px;">Hello ${escapeHtml(name)},</p>
<p style="margin:0 0 16px;">We would like to invite you to a conversational 1v1 meeting. It is not a traditional interview. We will introduce Rein and the community, learn about your interests, discuss possible contribution paths, and answer questions. The conversation will not exceed 30 minutes.</p>
${emailActionButton('Choose a time', schedulingUrl)}
<p style="margin:0 0 20px;">We do not record or automatically transcribe these conversations.</p>`,
    footerNote: 'You received this invitation in connection with your Contributor application. An invitation to a conversation does not confer Contributor status or governance rights.',
  })
}

export function automaticRejectionTemplate(name: string, monitoredEmail: string) {
  return reinEmailLayout({
    title: 'Update on your Rein Contributor application',
    preheader: 'An update on your Contributor application, with an option for human review.',
    kicker: 'CONTRIBUTOR APPLICATION',
    heading: 'An update on your application.',
    bodyHtml: `<p style="margin:0 0 16px;">Hello ${escapeHtml(name)},</p>
<p style="margin:0 0 16px;">We cannot move this application forward because its written content appears to conflict with our communication and safety standards.</p>
<p style="margin:0 0 20px;">If you believe this decision is incorrect, contact <a href="mailto:${escapeHtml(monitoredEmail)}" style="color:#a83f22;text-decoration:underline;">${escapeHtml(monitoredEmail)}</a>. A person can review and restore the application.</p>`,
    footerNote: 'You received this email about the review of your Contributor application.',
  })
}

export function resourceUpdateTemplate(title: string, outcome: string) {
  return reinEmailLayout({
    title: 'Update on your resource submission',
    preheader: 'The review status of your learning resource submission has been updated.',
    kicker: 'LEARNING RESOURCES',
    heading: 'Your resource review update.',
    bodyHtml: `<p style="margin:0 0 16px;">Thank you for submitting <strong>${escapeHtml(title)}</strong>.</p>
<p style="margin:20px 0;padding:16px 18px;border:1px solid #d5c7b1;background-color:#eee1c9;">Review status: ${escapeHtml(outcome)}.</p>
<p style="margin:0 0 20px;">Publication, if approved, credits the resource’s factual author or publisher—not the submitter—and does not automatically create Contributor status.</p>`,
    footerNote: 'You received this email because you submitted a learning resource to Rein Protocol Foundation.',
  })
}
