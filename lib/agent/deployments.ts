import { z } from 'zod'

const sha = z.string().regex(/^[a-f0-9]{40}$/)
export const deploymentSchema = z.object({
  deploymentId: z.uuid(),
  // Preserve the submitted identity so queued legacy reports retain their payload hash.
  repository: z.enum(['rein-protocol-foundation/nori-agent', 'tempest2023/rein-agent']),
  environment: z.literal('production'),
  revision: sha,
  previousRevision: sha,
  deployedAt: z.iso.datetime({ offset: true }),
  host: z.string().min(1).max(128),
  workspaceId: z.string().regex(/^T[A-Z0-9]+$/),
  channelId: z.string().regex(/^C[A-Z0-9]+$/),
  pullRequests: z.array(z.object({
    number: z.number().int().positive(), title: z.string().min(1).max(512),
    summary: z.string().max(2000),
  }).strict()).max(100),
  commits: z.array(z.object({ sha, subject: z.string().min(1).max(1000) }).strict()).max(1000),
  slackTs: z.string().regex(/^\d+\.\d+$/).optional(),
}).strict()
