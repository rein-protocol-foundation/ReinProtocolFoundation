<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Organization operations context

- Domain `rein-protocol.org`, registered and DNS-managed through Cloudflare.
- This repository deploys the public website `https://rein-protocol.org` through the Vercel project
  `rein-protocol-foundation`.
- Cloudflare Email Routing is active. Aliases: `admin@` (service account administration), `board@`
  (Board and governance), `tempest.ren@` (Tempest Ren correspondence), `noreply@` (automated and
  transactional mail). Inbound mail forwards through Cloudflare Email Routing.
- Resend account and configuration are present for programmatic outbound mail.
- Credential locators for these services live in the untracked `SECRETs.md`.
- Default contact and incorporator information supplied by the user is stored locally in
  `.private/registration-contact.json`. Read it when needed for authorized organization
  registration work. Keep its contents out of tracked files, commits, and remote uploads.

## GitHub organization and migration history

- Canonical GitHub organization: `rein-protocol-foundation`. Website repository:
  `rein-protocol-foundation/ReinProtocolFoundation`; Nori: `rein-protocol-foundation/nori-agent`.
- Before troubleshooting repository identity, Vercel linkage, Nori deployment reports, or source-snapshot CI failures,
  read [the migration record](docs/github-organization-migration-2026-10-zh.md). It distinguishes historical observations
  from pending production verification; recheck live state rather than assuming completion.

## Public form contracts and database releases

- Treat each public form as one contract across rendered controls, submitted `FormData`, server validation,
  action/RPC arguments, and database columns/constraints. Audit all layers when changing any field.
- Optional HTML selects submit `''`, not `undefined`. Test actual browser-shaped payloads, including blank
  optional fields, whitespace, conditional “Other” details, U.S./international location switching,
  multi-select arrays, URL errors, length limits, and required consents. Invalid input must return field
  errors, not throw or erase the user's other entries.
- Test real database inserts and repeat submissions, including minimal required-only forms. Mocked RPC
  responses and successful Vercel builds do not establish compatibility with the deployed schema.
- Changes to form behavior or database constraints must be delivered through a PR with the migration,
  regression tests, and release order. Do not directly change production as a shortcut for a code fix.
  Production migration execution requires explicit authorization for that production action, even when
  a general bug fix has been requested. An emergency repair must be explicitly authorized and recorded
  in the PR with the exact migration version and verification results.
- Before release, compare repository migrations with remote migration history. Apply authorized,
  backward-compatible migrations before the dependent application release. Do not mark unrelated
  remote migrations reverted merely to make `db push` succeed.
- After release, verify the relevant production constraints and a clearly marked test submission's
  stored values. Report separately what is fixed locally, reviewed in a PR, deployed, and verified live;
  never describe a local-only fix or mocked test as a production fix.
