# Community welcome email

Review all email families together in [`email-templates.html`](./email-templates.html): community and Contributor welcomes, all outreach `.eml` files, community transactional messages, and Auth link/code variants. The gallery supports search, desktop/mobile widths, source and sample-variable details, and link inspection. It embeds its images for offline review; actions inside previews do not navigate or send email. Regenerate it from the canonical sources with `npm run preview:emails` (Node 24+ and Python 3), or verify it is current with `node scripts/generate-email-review.mjs --check`. The generator source lives in `scripts/email-review-shell.html.template`; do not edit the generated gallery directly. The old `scripts/email-review-shell.html` address redirects to the complete gallery, with a clickable fallback if automatic navigation is unavailable. Run `node --test scripts/test-email-review.mjs` to check this entry point and the generated gallery.

Community registrations send the canonical repository HTML through Resend. Copy changes take effect with the application deployment.

- Canonical HTML: `lib/participant-welcome.ts`.
- Preview: `participant-welcome-preview.html` (preserves `{{{USER_NAME}}}`).
- Resend import: `participant-welcome-resend.html` (greeting: `Hello {{{USER_NAME}}},`).
- Regenerate both HTML files: `node scripts/preview-welcome-email.mjs`.

The Golden Gate Bridge appears as a compact, cropped background on the right side of the logo row (112 px tall on desktop, 80 px on mobile). It no longer occupies a separate full-width row, so the message and primary action appear earlier. The background uses the 2:1 landscape artwork at `public/images/welcome-golden-gate-cover.jpg`. Created with the built-in imagegen editing tool: crop away upper/lower empty paper, retain bridge, bay, coast and orange line, preserve original style, add no objects or text. The local preview uses a relative image path; the Resend template uses the public HTTPS URL.

Production sending always uses inline HTML and escapes the submitted name before substitution, with `there` when blank. The legacy `RESEND_WELCOME_TEMPLATE_ID` setting is ignored by this flow so an older hosted template cannot override the deployed copy.

The optional Resend import retains the `USER_NAME` placeholder for manual template use; it does not control application delivery. Community registration does not include email verification.

## Discord invitation

The welcome email and Community page share the Discord URL and QR asset path in `lib/community-invites.json`. `public/images/discord-qrcode.png` is the user-supplied Discord-style artwork, copied without image modifications. The adjacent button and clickable image link directly to the configured Discord invitation. Scanning the artwork instead opens its encoded URL, `https://qrc-ai.com/Ax2Qx`, so the scan destination depends on that redirect service. On October 28, 2026, this URL returned a 302 redirect to the configured `https://discord.gg/m8qnWv9XX` invitation.

When replacing the artwork or invitation, verify the supplied image's scan destination and update the JSON as needed. Run `node scripts/preview-welcome-email.mjs` and `npm run preview:emails` to refresh the previews and imports. Deploy the PNG alongside the website and email template changes. The previous generated QR image and its Python generator have been removed. The supplied artwork decodes successfully at both its original 1024px size and its 164px display size.

## Contributor welcome email

- Canonical HTML: `lib/contributor-welcome.ts`.
- Renderer: `contributorWelcomeTemplate(name, slackInviteUrl)` in `lib/email-templates.ts`.
- Preview: `contributor-welcome-preview.html`.
- Resend import: `contributor-welcome-resend.html`.
- Variables: `USER_NAME` and `SLACK_INVITE_URL` (both required by the import; the renderer uses `there` for an empty name).

This is a separate welcome message for people who have formally become Contributors. Verification, application confirmation, and conversation invitation emails do not include Slack invitations. The renderer requires an HTTPS Slack URL, escapes dynamic values, and never substitutes a fixed or placeholder invitation in a production email.

The Slack invitation API is not implemented in this repository yet. This change prepares the template and import, without adding a sender or sending an incomplete email from `createContributor`. When integrating that API, confirm the Contributor record is active, generate the recipient's invitation, and pass the returned URL to the renderer before using `sendTransactionalEmail` (subject `Welcome as a Rein Contributor`, category `contributor_welcome`, related type `contributor`, related ID equal to the Contributor ID). Keep API generation and delivery retryable so a failure does not undo Contributor approval or send duplicate welcomes. Never render the raw import placeholders for application delivery.

`node scripts/preview-welcome-email.mjs` regenerates both welcome emails and preserves the variables in their preview/import files. The Slack link in the unfilled preview is a template variable, not a usable invitation.
