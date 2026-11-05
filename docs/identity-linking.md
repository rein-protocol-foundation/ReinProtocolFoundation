# Identity Linking

This document describes how Rein Protocol links a chat-platform account to an organizational
identity, what the linked record proves, and which parts of the flow are implemented in this
repository today. It covers the design contract, the website email-entry page and legacy confirmation page, and the limits of the current implementation.

## Direct email code flow

New requests use one website visit:

1. Nori starts a session from the authenticated Discord or Slack sender and supplies
   `/community/link/[session]`.
2. The person enters their registered community email once. The website emails a
   short-lived `rein-…` binding code and returns a generic acknowledgement with no secret.
3. The person sends that code to Nori from the same platform, workspace and user account.
   The backend checks the emailed code and trusted sender together, then verifies the
   mailbox and completes the binding in one locked transaction.

Sending a message does **not** verify an address, create a community contact, or grant a role.
Registration is re-derived only when the code is redeemed. Unknown or deleted contacts
cannot bind. Their original account can check `registration_required` using session status.
The browser and initial request responses never contain the raw code or a receipt URL.

Codes expire in ten minutes and work once. Resending replaces the previous code. Existing
per-session/IP email limits remain; five failed code attempts inside the guarded completion
function exhaust the challenge. Codes retain the existing random `rein-…` format (not a
six-digit numeric login OTP). Only digests are stored. The completion API accepts only a
code and authenticated ingress proof; it never accepts an email or claimed contact selector.

The single-Slack-account rule applies only to Slack. The same community identity can also
bind Discord; platform or workspace permissions do not transfer with that association.

## Legacy requests and deployment

`/community/link/confirm` and the receipt template remain solely for already-issued links.
New emails contain the binding code and never direct users to that page. Existing legacy
email-confirmation sessions continue to complete through the same API.

Apply the `rein_email_binding_codes` migration before deploying the website/backend change.
It adds a challenge delivery-method marker, the service-only email-code issuer, and atomic
redemption in the existing completion function for both `dev_` and `prod_` tables. The
existing issuer and legacy confirmation contract remain intact for rolling deployment.
Deploy Nori's updated tool descriptions and discovery guidance with the website change so
it asks for the emailed binding code, rather than a code displayed on a second webpage.

Local verification uses synthetic data only. Run the website unit tests and
`node scripts/run-identity-db-tests.mjs` for SQL and concurrency checks. The database runner
includes `supabase/tests/email_binding_codes.sql` for both platforms and both table prefixes.
Passing these checks does not establish live mail delivery or a deployed Discord/Slack run.

## The binding record

- A binding row is a **platform, workspace, and platform-user tuple** together with the Rein identity it
  points at, its status, and its timestamps.
- That tuple is **unique across statuses**. A revoked row keeps its place in the table instead of
  being deleted, so a later attempt to bind the same platform account does not silently create a
  second row. The revoked row is a **tombstone**: an administrator has to clear or re-verify it
  before that platform account can be linked again.
- A binding is valid only while its status is verified. Revocation is the normal way to end a link;
  it never deletes historical contributions or records tied to the Rein identity.
- **P0 permits one verified Slack account per Rein identity.** A second Slack tuple for the same Rein identity
  is refused, including when two completions race. Supporting account migration or multiple Slack
  accounts is deferred to P2. Other platforms remain separately scoped and do not confer Slack
  governance rights.

## Registered Rein identities only

A verified address identifies an existing, non-deleted Rein identity backed by `community_contacts`.
If the address is unknown to the organization, the session enters `registration_required`, no
Rein identity or identifier row is created, and
the person is directed to an administrator. Email control alone never registers a community member
and grants no membership, Contributor status, role, or governance right.

Administrators register Rein identities and may directly set Contributor or Director authorization at
`/admin/identities`. That explicit administrative path bypasses mailbox verification and is audited;
it is separate from the public linking flow and is never available to the Agent or a chat user.

## Authority, scopes, and re-derivation

- Private governance reads and all writes go through `POST /api/agent/operations`, using a
  registered service caller with a per-operation scope. That endpoint is the single private surface
  for these operations; nothing else is allowed to read governance data or change it.
- Human eligibility is **re-derived on the server on every write**. A caller cannot assert a role,
  weight, or eligibility, and an earlier confirmed result is not reused as authority for a later
  operation.
- Director eligibility requires an active Director authorization record. Public-profile publication
  state is independent and cannot grant or preserve governance access.
- The Agent never sends a raw platform user identifier as authority. A platform account identifier
  is an input to be matched against the binding record, never a claim that the caller has already
  been proven to be that person.
- Assertions are short lived. Any statement that a caller is a particular linked person carries a
  near-term expiry and has to be re-established for later operations.
- Chat text that claims an email address or role is untrusted. Neither the Agent nor these APIs accept
  a target email, Rein identity ID (`contact_id`), role, platform user id, or workspace id from a model-authored binding
  request. The email is entered only on the website and proved by returning its one-time binding code from the authenticated chat account.

## Ingress and relay

Two enrollment paths exist for platform traffic, and they are not interchangeable:

- **HTTP-signed ingress endpoints** verify a request signature from the platform before any content
  is trusted.
- **The relay** is used only for platforms or workspaces that are **explicitly enrolled** with it.
  Enrollment is a deliberate configuration step, not a fallback for a signature that cannot be
  checked.

Both paths are treated as untrusted transport. Whatever they deliver still has to pass the same
binding and eligibility checks as any other request.

## Provisional defaults

These values are provisional and are stored per row, so they can be adjusted without a schema
change:

| Value | Provisional default |
| --- | --- |
| Binding validity | 10 years |
| Binding code time to live | 10 minutes |

## Current integration boundary

- The binding implementation supports Discord and Slack; multiple-Slack-account migration remains outside P0.
- Automated tests mock email delivery; live sandbox tests require separately configured email and
  platform infrastructure and must use synthetic accounts.
- This repository contains the identity-linking domain logic (`lib/identity/linking.ts`), the
  registered-caller and scope contract (`lib/agent/contracts.ts`, `lib/agent/service-callers.ts`),
  signed-ingress and assertion verification (`lib/agent/assertions.ts`), the governance reader and
  writer (`lib/agent/governance/`), the database migrations under `supabase/migrations/`, and the
  two website pages described above, and the `POST /api/agent/operations` dispatcher
  (`app/api/agent/operations/route.ts`) that carries every private governance call. Its writes run
  through the guarded governance RPC described below. What is still not wired to a live platform is
  reachability rather than the code path. A controlled development Slack workspace and transactional
  mail path were exercised on 2026-10-03; production Slack/Discord enrollment and production mail
  remain deployment configuration rather than repository defaults.

## Related reading

- `docs/PRD-agent-community-operations.md` (R02) states the identity and eligibility requirement.
- `lib/agent/governance/reader.ts` documents the read-only table contract and the fail-closed rules
  used when an email lookup is available.
## In-flight semantics for revocation

Completion and revocation serialize on the platform tuple: the completion
function takes a transaction-scoped advisory lock on the tuple and then the row
lock, and revocation takes the row lock on the same link. A revocation that
commits before a completion is therefore visible to it and refuses it, and a
completion that commits first leaves a live row for the revocation to read.

The governance writes under `/api/agent/operations` (`submit_proposal`,
`create_poll`, `cast_ballot`, `finalize_poll`, `record_proposal_revision`,
`approve_proposal_revision`, `apply_proposal_revision`) close the same window at
the database. Each one runs through one security-definer function,
`<env>_rein_guarded_write`, defined in
`supabase/migrations/20260930140000_rein_governance_guarded_write.sql`. In a
single transaction it locks the caller row, revalidates the caller status, the
registration scope, the assertion digest and its expiry, the platform and channel
allowlists, then locks the canonical platform-link row, and only then performs
the mutation. Revocation takes that same link-row lock, so a revocation that
commits before a write is visible to it and refuses it, and a write that commits
first leaves a live row for the revocation to read. The actor is derived from the
locked link row rather than trusted from the request, and the guard refuses a
Rein identity ID (`contact_id`) that disagrees with it.

Expiry is re-read with `clock_timestamp()` rather than `now()`, because this
transaction can block on the caller and link row locks: `now()` is the
transaction start time, so a proof or link that was live when the call began
could otherwise be admitted after it has expired. The binding-completion function
keeps the same rule and re-checks the session and binding-code expiry after the
last wait, immediately before it consumes the code.

### Current sender profile returned to the Agent

`POST /api/identity/resolve` also returns `is_administrator`. After validating the
caller and signed ingress proof and resolving the current binding, the backend
checks the one canonical email against the existing website administrator policy
(`ADMIN_EMAILS` or an active `admin_users` record). Request-supplied emails, profile
names, Contributor and Director status cannot grant this authority. Unlinked,
revoked, deleted or ambiguous identities return false; an unavailable admin query
returns `unavailable` instead of granting access. The answer is computed anew on
each request with `no-store`. Nori uses it privately for restricted model routing;
it does not grant arbitrary tool, Shell, GitHub or deployment permissions.

`POST /api/identity/resolve` now also returns nullable `profile: { name, email, joinedAt }`.
The existing `identity.resolve` caller scope and ingress assertion remain mandatory. The contact
is derived exclusively from the verified platform binding; the request still accepts no contact,
email or role selector. Only resolved bindings trigger profile reads. The profile contains the
current people display name or non-deleted participant name, a canonical email only when exactly
one is recorded, and the contact creation timestamp. Multiple emails, absent records or failed
profile reads yield null fields/profile rather than guessed identity. Profile failure does not
change the independently resolved membership status. Older Agent clients ignore this additive
field. The Agent must not repeat private email in shared channels or use profile text as authority;
operations continue to recheck current identity, caller scope and channel permissions.

No schema migration is needed. This source change requires backend deployment before Agents can
read profile fields. Synthetic route/helper tests cover canonical-contact selection, unlinked
accounts, deleted contacts, ambiguous email and read failures; no live member data is used.
