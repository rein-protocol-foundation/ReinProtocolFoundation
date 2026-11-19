# Linked member profiles

Nori can use verified account links to recognize a member’s public Discord introduction when that member asks from their linked Slack account. The website returns the account links. Nori checks access and audience for the introduction in its platform tools.

## API contract

`POST /api/identity/linked-accounts` requires a registered service caller with the `identity.resolve` scope and an ingress assertion authorized for the caller, platform workspace, and channel. Use the `X-Rein-Caller-Id` and bearer credential headers. The request body accepts only `proof` with this shape.

```json
{
  "proof": { "kind": "assertion", "assertion": "ria_example" }
}
```

A successful lookup has this shape. The `name` and `joinedAt` fields can be null. `joinedAt` is the creation timestamp of the canonical Rein contact.

```json
{
  "ok": true,
  "status": "resolved",
  "contact_id": "d944faed-9a6d-45dc-b7b5-58b2e47c6464",
  "profile": { "name": "Example Member", "joinedAt": "2026-10-01T12:00:00+00:00" },
  "accounts": [
    { "platform": "slack", "workspace_id": "T1", "platform_user_id": "U1" },
    { "platform": "discord", "workspace_id": "12345", "platform_user_id": "98765" }
  ]
}
```

The platform tuple in the assertion determines the canonical contact. The response includes only that contact’s currently verified, unrevoked, unexpired Slack and Discord tuples. A service caller authorized to read its current sender’s linked accounts still needs independent authorization to access each platform’s messages. Treat the contact ID and account associations as private lookup data.

`identity_not_linked`, `identity_revoked`, and `identity_expired` return `contact_id: null`, `profile: null`, and `accounts: []`. A missing or deleted contact, or a sender rebound to a different contact during the read, returns `identity_not_linked`. The server rechecks the source binding and contact together after reading the linked accounts and profile names. Invalid or inconsistent query results, database errors, and more than 20 active links produce HTTP `503` with `{ "ok": false, "reason": "unavailable" }`. Invalid request bodies and authorization refusals use the shared identity API error codes. All responses carry `Cache-Control: no-store`.

The API uses the existing identity tables and environment prefixes. Local tests exercise the route and query construction with a synthetic database transport.
