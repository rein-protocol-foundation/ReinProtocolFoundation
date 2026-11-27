import { reconcileMailboxes } from '@/lib/organization-email/store'

export const maxDuration = 60

export async function POST(request: Request) {
  const secret = process.env.ORGANIZATION_EMAIL_JOB_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response(null, { status: 403 })
  }
  try {
    return Response.json(await reconcileMailboxes())
  } catch {
    return Response.json({ error: 'reconciliation_failed' }, { status: 503 })
  }
}
