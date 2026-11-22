import { z } from 'zod'
export const personSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  display_name: z.string().trim().min(1),
  directoryRole: z.enum(['board', 'staff', 'core_contributor', 'contributor', 'community_member']),
  role: z.string().min(1),
  profession: z.string().min(1),
  biography: z.string().nullable(),
  photo_url: z.string().regex(/^\/people\/[a-z0-9-]+\.webp$/).nullable(),
  photo_alt: z.string().nullable(),
  website_url: z.url().regex(/^https?:\/\//).nullable().optional(),
  github_url: z.url().regex(/^https?:\/\//).nullable().optional(),
  scholar_url: z.url().regex(/^https?:\/\//).nullable().optional(),
  linkedin_url: z.url().regex(/^https?:\/\//).nullable().optional(),
  sort_order: z.number().int().nonnegative(),
  homepage_featured: z.boolean().default(false),
  homepage_order: z.number().int().nonnegative().default(100),
}).superRefine((p,ctx)=>{
  const staff = p.directoryRole === 'board' || p.directoryRole === 'staff'
  if (!staff && p.homepage_featured) ctx.addIssue({code:'custom',message:'Only staff may be homepage featured'})
  if (!staff && (p.biography?.trim().split(/\s+/).length ?? 0) > 30) ctx.addIssue({code:'custom',message:'Community biographies must be at most 30 words'})
  if (p.photo_url && !p.photo_alt?.trim()) ctx.addIssue({code:'custom',message:'Portrait requires alt text'})
})
export const peopleSchema = z.array(personSchema).superRefine((people,ctx)=>{
  const slugs = new Set<string>()
  people.forEach(p=>{ if(slugs.has(p.slug)) ctx.addIssue({code:'custom',message:`Duplicate slug: ${p.slug}`}); slugs.add(p.slug) })
})
export type Person = z.infer<typeof personSchema>
