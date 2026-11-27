# Organization email forwarding

Administrator dashboard: `/admin/organization-email` (System → Organization email).
API: `GET`, `DELETE`, and `POST /api/admin/organization-email`. All require an authenticated
administrator using the existing admin authorization checks. Mutations require
same-origin JSON and an `Origin` header matching the request origin.

```json
{"localPart":"zexin.li","destination":"zexin.li@ntu.edu.sg"}
```

A request reserves the organization address, registers the destination with
Cloudflare if necessary, and returns `mailbox.status = pending` until the
recipient verifies Cloudflare's email. The scheduled production job checks outstanding requests and creates the
rule after verification, even with the dashboard closed. Refresh shows the latest records.
Existing verified destinations activate
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

The forwarding inventory groups all saved requests and Cloudflare literal-address
rules by organization address, including rules created outside this application.
Live rules show the actual destination and enabled state. Conflicts and missing
previously active rules are flagged for admin attention.
A mistaken destination reservation needs administrator database reconciliation;
pending requests have no forwarding rule to delete.

Validation: provider lifecycle, pagination, conflict refusal, normalization,
authentication and CSRF, lease behavior, UI retry/activation tests; live database
privileges and lease exclusion verified without retaining test records.

## Automatic activation

Configure the same random server-only `ORGANIZATION_EMAIL_JOB_SECRET` in Vercel
Production and GitHub Actions repository secrets. Deploy the authenticated
`POST /api/jobs/organization-email` handler and enable the organization-email
workflow on the default branch. No database migration is needed.

GitHub Actions schedules a check every five minutes. Scheduling delays and queue
depth can extend activation time. Each invocation claims up to five eligible
requests, oldest check first, using the same leases as manual operations. It
also picks up pre-existing pending requests and retries transient errors.
Conflicting rules require admin review. To verify rollout, check the workflow
run result and confirm a verified pending address appears as enabled in Admin.

## Rule deletion

Apply migration `20261127223944_organization_email_rule_deletion.sql` before
releasing the dashboard and API changes. It allows a deleting status and grants
the server role DELETE on the reservation table. Public and authenticated
clients retain their existing restrictions.

An admin confirms the displayed organization address and destination. The server
checks the zone, address, destination, and rule ID before removing a literal
single-destination forwarding rule. It retains the verified Cloudflare destination
for other aliases. A leased deletion intent excludes automatic and manual activation.
After Cloudflare confirms the rule is absent, the server removes the reservation
so the address can be reused. Use Retry deletion to finish interrupted cleanup.
