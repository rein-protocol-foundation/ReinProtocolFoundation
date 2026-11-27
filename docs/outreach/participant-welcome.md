# Community welcome email

Review all email families together in [`email-templates.html`](./email-templates.html): community and Contributor welcomes, all outreach `.eml` files, community transactional messages, and Auth link/code variants. The gallery supports search, desktop/mobile widths, source and sample-variable details, and link inspection. It embeds its images for offline review; actions inside previews do not navigate or send email. Regenerate it from the canonical sources with `npm run preview:emails` (Node 24+ and Python 3), or verify it is current with `node scripts/generate-email-review.mjs --check`. The generator source lives in `scripts/email-review-shell.html.template`; do not edit the generated gallery directly. The old `scripts/email-review-shell.html` address redirects to the complete gallery, with a clickable fallback if automatic navigation is unavailable. Run `node --test scripts/test-email-review.mjs` to check this entry point and the generated gallery.

Community registrations send the canonical repository HTML through Resend. Copy changes take effect with the application deployment.

- Canonical HTML: `lib/participant-welcome.ts`.
- Preview: `participant-welcome-preview.html` (preserves `{{{USER_NAME}}}`).
- Resend import: `participant-welcome-resend.html` (greeting: `Hello {{{USER_NAME}}},`).
- Regenerate both HTML files: `node scripts/preview-welcome-email.mjs`.

The Golden Gate Bridge appears as a compact, cropped background on the right side of the logo row (112 px tall on desktop, 80 px on mobile). It no longer occupies a separate full-width row, so the message and primary action appear earlier. The background uses the 2:1 landscape artwork at `public/images/welcome-golden-gate-cover.jpg`. Created with the built-in imagegen editing tool: crop away upper/lower empty paper, retain bridge, bay, coast and orange line, preserve original style, add no objects or text. The local preview uses a relative image path; the Resend template uses the public HTTPS URL.

Production sending always uses inline HTML and escapes the submitted name before substitution, with `there` when blank. The legacy `RESEND_WELCOME_TEMPLATE_ID` setting is ignored by this flow so an older hosted template cannot override the deployed copy.

Contributor verification, application confirmation, conversation invitations, application review results, and learning-resource review notifications use the shared `lib/email-layout.ts` wrapper. It matches the Welcome emails’ warm-paper palette, Rein logo and bridge header, serif heading, orange action buttons, and footer. Their bodies remain in `lib/email-templates.ts`, including the original review, verification, meeting, and resource-attribution information.

The optional Resend import retains the `USER_NAME` placeholder for manual template use; it does not control application delivery. Community registration does not include email verification.

## Discord community launch announcement (draft)

The announcement is for all existing registered Community Members, inviting them to the live Discord community and to interact with Nori Agent. Subject: **Rein’s Discord is live — come meet Nori Agent**.

`discordCommunityLaunchTemplate(name)` in `lib/email-templates.ts` renders the draft in the shared Rein layout, with a direct Discord invitation link. It is listed under “欢迎与社区动态” in the review gallery as “草稿 · 未发送”. `npm run preview:emails` also produces `discord-community-launch-preview.html` and `discord-community-launch-resend.html`, preserving the `USER_NAME` variable. No recipient selection, campaign, scheduled job, or sending action is connected to this draft.

## Discord invitation

The Community page, registration confirmation, welcome email, and Discord launch announcement use the direct invite URL from `lib/community-invites.json`. When changing it, verify that Discord resolves the invite to the Rein server and regenerate the previews and Resend imports.

## Contributor welcome email

- Canonical HTML: `lib/contributor-welcome.ts`.
- Renderer: `contributorWelcomeTemplate(name, slackInviteUrl)` in `lib/email-templates.ts`.
- Preview: `contributor-welcome-preview.html`.
- Resend import: `contributor-welcome-resend.html`.
- Variables: `USER_NAME` and `SLACK_INVITE_URL` (both required by the import; the renderer uses `there` for an empty name).

This is a separate welcome message for people who have formally become Contributors. Verification, application confirmation, and conversation invitation emails do not include Slack invitations. The renderer requires an HTTPS Slack URL, escapes dynamic values, and never substitutes a fixed or placeholder invitation in a production email.

The Slack invitation API is not implemented in this repository yet. This change prepares the template and import, without adding a sender or sending an incomplete email from `createContributor`. When integrating that API, confirm the Contributor record is active, generate the recipient's invitation, and pass the returned URL to the renderer before using `sendTransactionalEmail` (subject `Welcome as a Rein Contributor`, category `contributor_welcome`, related type `contributor`, related ID equal to the Contributor ID). Keep API generation and delivery retryable so a failure does not undo Contributor approval or send duplicate welcomes. Never render the raw import placeholders for application delivery.

`node scripts/preview-welcome-email.mjs` regenerates both welcome emails and preserves the variables in their preview/import files. The Slack link in the unfilled preview is a template variable, not a usable invitation.

## GitHub organization announcement

Subject: **Rein is now on GitHub — explore, build, and contribute**.

`githubOrganizationLaunchTemplate(name)` in `lib/email-templates.ts` uses the current
Rein email layout to introduce the organization, paper templates, Nori Agent and the
Foundation website repository. It appears as “GitHub 组织成立公告” in
`email-templates.html`. No automatic sender or recurring campaign is connected.

- Review: `github-organization-launch-preview.html` (local artwork).
- Resend import: `github-organization-launch-resend.html` (public HTTPS artwork).
- Variable: `USER_NAME`; the renderer escapes names and falls back to “there”.
- Regenerate: `node scripts/generate-email-review.mjs`.

The website footer, both welcome emails and the shared transactional email footer link
to `https://github.com/rein-protocol-foundation`. Email uses a local PNG GitHub mark
at `public/brand/github-mark.png`, rendered at 16 px, plus visible “GitHub” text so the
link stays usable when images are blocked. The SVG source is stored beside it.
Deploy this asset alongside the template updates before using the import in a live email.
Welcome and Contributor messages also introduce the organization in their body copy.
Existing Contributor invitation requirements and sender availability remain as described above.

### Send record — 2026-10-29

The user authorized sending the GitHub organization announcement to all community members.
The production roster contained 11 subscribed members. Resend accepted 10 individual,
personalized emails; one address was excluded because it was already suppressed for a bounce.
No suppression was removed. Each request used a stable campaign/member idempotency key.
The GitHub icon was embedded using CID because its public website URL was not deployed yet.

Ten unique provider receipts were saved to `prod_email_deliveries` with category
`github_org_launch_20261029`. “Sent” in that table means accepted by Resend, not necessarily
delivered to the recipient. The private, Git-ignored local directory
`.private/github-org-launch-2026-10-29/` contains the roster snapshot, skip reason,
provider receipts and last checked delivery events. Check those records before retrying;
do not resend a recipient merely because the provider is still queueing delivery.
