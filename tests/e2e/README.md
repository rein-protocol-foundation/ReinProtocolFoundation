# End-to-end coverage

The PR #3 smoke suite is split by user-facing responsibility:

- `institutional.spec.ts` — preserved public routes, metadata, responsive navigation, artwork, and keyboard entry.
- `community.spec.ts` — Community sections, sticky navigation, redirects, contribution paths, policies, and verification results.
- `forms.spec.ts` — Participant, Contributor, and learning-resource form contracts, conditional fields, and validation.
- `admin-access.spec.ts` — private access, login readiness, search exclusion, and a read-only smoke pass across Dashboard modules.

The smoke suite runs in desktop Chromium and an iPhone-sized Chromium project. It never fabricates member records. When `.env.local` contains `ADMIN_EMAILS` and no `RESEND_API_KEY`, the Dashboard smoke test uses the development email-login path and only reads module pages.

## Database-writing flows

Run `npm run test:e2e:data` for the real submission path. This suite:

- starts a disposable local Supabase project on separate ports;
- applies every migration to a fresh database;
- submits valid Participant, Contributor, and learning-resource forms through the browser;
- verifies the resulting `dev_*` rows, Agent jobs, member-count increments, repeated-email updates, and cross-form identity deduplication;
- exercises the Contributor verification endpoint, including one-time token use;
- signs in through the development-only admin path and confirms that submitted records appear in the Dashboard;
- stops the disposable project and deletes its data even when a test fails.

Docker and Supabase CLI 2.100 or newer are required. Set `SUPABASE_CLI` only if the current CLI is not on `PATH`. Resend and OpenAI are deliberately disabled: this suite tests durable application behavior without sending real email or invoking a model.

Use `npm run test:e2e:all` to run both suites.

The community PR workflow also runs the database suite. Before browser submissions,
`scripts/check-participant-optional-profile.sql` exercises both table prefixes inside a
rolled-back transaction: blank optional fields, participant upserts, international and
Other fields, contributor profile links/preferences, and every resource format. Browser
coverage includes empty contributor industry, a minimal participant insert, and clearing
industry on repeat registration. The disposable stack copies the configured local email
templates as well as migrations so clean-checkout startup validates the same configuration.
