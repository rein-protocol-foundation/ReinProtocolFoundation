import { NextResponse } from 'next/server'
import { authenticateCaller } from '@/lib/agent/service-callers'
import { getSecretClient } from '@/lib/supabase/secret'
import { hashValue } from '@/lib/agent/credentials'
import { deploymentSchema } from '@/lib/agent/deployments'

export const runtime = 'nodejs'
const fail = (reason: string, status: number) => NextResponse.json({ ok: false, reason }, { status })

export async function POST(request: Request) {
  // Authenticate before parsing or accessing deployment data.
  const auth = await authenticateCaller(request, { scope: 'deployment.write' })
  if (!auth.ok) return fail(auth.reason, auth.httpStatus)
  let parsed
  try {
    const text = await request.text()
    if (Buffer.byteLength(text) > 1_500_000) return fail('invalid_request', 413)
    parsed = deploymentSchema.safeParse(JSON.parse(text))
  } catch { return fail('invalid_request', 400) }
  if (!parsed.success) return fail('invalid_request', 400)
  const { slackTs, ...deployment } = parsed.data
  const allowed = await authenticateCaller(request, {
    scope: 'deployment.write', platform: 'slack', workspaceId: deployment.workspaceId,
    channelId: deployment.channelId,
  })
  if (!allowed.ok) return fail(allowed.reason, allowed.httpStatus)
  const db = getSecretClient()
  if (!db) return fail('not_configured', 503)
  const fingerprint = hashValue(JSON.stringify(deployment))
  const { error } = await db.from('rein_deployments').upsert({
    deployment_id: deployment.deploymentId, caller_id: auth.caller.callerId,
    repository: deployment.repository, environment: deployment.environment,
    revision: deployment.revision, previous_revision: deployment.previousRevision,
    deployed_at: deployment.deployedAt, host: deployment.host,
    pull_requests: deployment.pullRequests, commits: deployment.commits,
    slack_channel_id: deployment.channelId, slack_workspace_id: deployment.workspaceId,
    payload_hash: fingerprint,
  }, { onConflict: 'deployment_id', ignoreDuplicates: true })
  if (error) return fail('unavailable', 503)
  const { data: row, error: readError } = await db.from('rein_deployments')
    .select('caller_id,payload_hash,slack_ts').eq('deployment_id', deployment.deploymentId).single()
  if (readError || !row) return fail('unavailable', 503)
  if (row.caller_id !== auth.caller.callerId || row.payload_hash !== fingerprint) return fail('deployment_conflict', 409)
  let receipt = row.slack_ts
  if (slackTs && receipt && receipt !== slackTs) return fail('deployment_conflict', 409)
  if (slackTs && !receipt) {
    const { data: updated, error: updateError } = await db.from('rein_deployments')
      .update({ slack_ts: slackTs, notified_at: new Date().toISOString() })
      .eq('deployment_id', deployment.deploymentId).eq('caller_id', auth.caller.callerId)
      .is('slack_ts', null).select('slack_ts').maybeSingle()
    if (updateError) return fail('unavailable', 503)
    receipt = updated?.slack_ts
    if (!updated) {
      // Another request may have saved a receipt after our initial read.
      const { data: stored, error: receiptError } = await db.from('rein_deployments')
        .select('slack_ts').eq('deployment_id', deployment.deploymentId)
        .eq('caller_id', auth.caller.callerId).eq('payload_hash', fingerprint).single()
      if (receiptError || !stored) return fail('unavailable', 503)
      receipt = stored.slack_ts
    }
    if (!receipt) return fail('unavailable', 503)
    if (receipt !== slackTs) return fail('deployment_conflict', 409)
  }
  return NextResponse.json({ ok: true, deploymentId: deployment.deploymentId, slackTs: receipt })
}
