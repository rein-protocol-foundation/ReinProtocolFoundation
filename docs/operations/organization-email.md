# Organization email forwarding

Administrator dashboard: `/admin/organization-email` (System → Organization email).
API: `GET` and `POST /api/admin/organization-email`. Both require an authenticated
administrator using the existing admin authorization checks. POST requires
same-origin JSON and an `Origin` header matching the request origin.

```json
{"localPart":"zexin.li","destination":"zexin.li@ntu.edu.sg"}
```

A request reserves the organization address, registers the destination with
Cloudflare if necessary, and returns `mailbox.status = pending` until the
recipient verifies Cloudflare's email. Use **Check and activate** after verification;
this submits the saved pair again, creates the forwarding rule, and reads it back.
There is no background verification poller. Refresh only reloads the dashboard;
it does not activate pending requests. Existing verified destinations activate
immediately. Existing identical rules are reused. Disabled, ambiguous, or
conflicting rules are never overwritten. Pending destinations are reused without
resending verification emails on retries. Resending expired verification emails
is currently handled in the Cloudflare dashboard.

This provides inbound forwarding only, not mailbox hosting, IMAP, passwords, or
outbound sending. Destination addresses on `rein-protocol.org` are rejected to
prevent forwarding loops. The server fixes the managed domain to `rein-protocol.org`
and verifies the configured Cloudflare zone/account before mutations.

## Server configuration

All environments use the same server-only values as local `.env.local`:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ZONE_ID`

Required token permissions: account-level Email Routing Addresses Read/Write;
zone-level Email Routing Rules Read/Write and Zone Read for `rein-protocol.org`.
The domain must already have Email Routing enabled and its MX records configured.
Never prefix these variables with `NEXT_PUBLIC_`, commit values, or return them
from API responses. Provider error bodies are deliberately not passed to clients.

Vercel **Preview** is the staging target; **Production** is production. These
variables were configured as sensitive values in both targets on 2026-11-12 using
the local token. Environment changes apply to subsequent deployments. No website
deployment was triggered as part of this implementation.

## Shared persistence and recovery

`organization_email_mailboxes` is intentionally shared rather than prefixed
`dev_` / `prod_`: local, stage and prod operate on the same real Cloudflare domain.
All deployments must use the same Supabase project to share reservations and locks.
The migration is `20261112100251_organization_email_routing.sql` and was applied to
the connected Foundation project. RLS is enabled; only the service role can
select/insert/update. No browser Data API grants or RLS policies are provided.
The Supabase advisor's informational "RLS Enabled No Policy" finding is intentional
for this server-only table; see [the advisor documentation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Each address has an immutable destination reservation, requester and last-actor
IDs, latest status/error and timestamps. Atomic five-minute leases serialize app
requests across deployments. Cloudflare calls have a 45-second overall deadline
and ten-second per-request timeout. A crashed invocation can be retried once its
lease expires; a normal completion or failure releases its lease. If a write
succeeds but the response/database update fails, retry checks Cloudflare before
creating anything. External Cloudflare clients are not covered by these database
leases; conflicting rules produce an error requiring manual reconciliation.

The page shows up to 500 recent requests and current Cloudflare literal-address
rules (including pre-existing rules created outside this application). Request
status is last checked state; use Check and activate to reconcile with Cloudflare.
A mistaken destination reservation needs administrator database reconciliation;
this version does not expose reassignment/deletion controls.

Validation: provider lifecycle, pagination, conflict refusal, normalization,
authentication and CSRF, lease behavior, UI retry/activation tests; live database
privileges and lease exclusion verified without retaining test records.
