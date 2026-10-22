# Community welcome email

Community registrations send the canonical repository HTML through Resend. Copy changes take effect with the application deployment.

- Canonical HTML: `lib/participant-welcome.ts`.
- Preview: `participant-welcome-preview.html` (preserves `{{{USER_NAME}}}`).
- Resend import: `participant-welcome-resend.html` (greeting: `Hello {{{USER_NAME}}},`).
- Regenerate both HTML files: `node scripts/preview-welcome-email.mjs`.

The Golden Gate Bridge appears as a compact, cropped background on the right side of the logo row (112 px tall on desktop, 80 px on mobile). It no longer occupies a separate full-width row, so the message and primary action appear earlier. The background uses the 2:1 landscape artwork at `public/images/welcome-golden-gate-cover.jpg`. Created with the built-in imagegen editing tool: crop away upper/lower empty paper, retain bridge, bay, coast and orange line, preserve original style, add no objects or text. The local preview uses a relative image path; the Resend template uses the public HTTPS URL.

Production sending always uses inline HTML and escapes the submitted name before substitution, with `there` when blank. The legacy `RESEND_WELCOME_TEMPLATE_ID` setting is ignored by this flow so an older hosted template cannot override the deployed copy.

The optional Resend import retains the `USER_NAME` placeholder for manual template use; it does not control application delivery. Community registration does not include email verification.
