# Nori deployment records

`POST /api/agent/deployments` accepts successful deployment reports from the OCI updater.
It uses the existing `x-rein-caller-id` / bearer credential boundary and requires the
dedicated `deployment.write` scope plus the report's Slack workspace/channel allowlists.
No human identity assertion or governance permission is granted by this endpoint.

Apply the `nori_deployment_records` migration before deploying the route. Both environment
tables have RLS enabled and no client policies or client grants; only the backend service
role can read, insert or update. The RLS advisor's no-policy INFO is intentional for these
server-only tables. Do not expose the Supabase secret on the Nori host.

Reports include a stable UUID, successful deployment time, current/previous SHA, host,
repository, PR numbers/titles/body summaries, commit subjects and notification channel.
The UUID and payload hash make retries idempotent: attempts to replace immutable content
or another caller's record return 409. A subsequent call with the identical report plus
`slackTs` records the Slack receipt. The client stores its queue outside application releases
and retries delivery separately from compilation/restart.

The route currently accepts only `tempest2023/rein-agent` production deployment reports.
The database environment still follows the existing `DATABASE_ENVIRONMENT`/Vercel rules.
Deployment records are operational data, not member or governance records.

Verification: `npm test -- tests/agent-deployments.test.ts tests/service-caller-allowlists.test.ts`
and `npm run typecheck`. Reporter and crash/rollback tests live in the Rein Agent repository.
