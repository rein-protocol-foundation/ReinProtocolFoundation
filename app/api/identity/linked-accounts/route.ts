import { z } from 'zod'
import { authorizeAssertion, failure, noStore, readJsonBody } from '@/app/api/identity/_http'
import { proofSchema, refuse } from '@/lib/agent/contracts'
import { readLinkedAccounts } from '@/lib/identity/linked-accounts'

export const runtime = 'nodejs'

const requestSchema = z.object({ proof: proofSchema }).strict()

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await readJsonBody(request))
  if (!parsed.success) return failure(refuse('invalid_request', 400))

  const authorized = await authorizeAssertion(request, 'identity.resolve', parsed.data.proof)
  if (!authorized.ok) return failure(authorized)

  const { platform, workspaceId, platformUserId } = authorized.value.assertion
  const self = await readLinkedAccounts({ platform, workspaceId, platformUserId }).catch(() => null)
  if (!self) return failure(refuse('unavailable', 503))

  return noStore({ ok: true, ...self })
}
