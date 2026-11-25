import { z } from 'zod'
import { CONTRIBUTION_AREAS, COUNTRIES, INDUSTRIES, PARTICIPATION_REASONS, RESOURCE_FORMATS, US_STATES } from '@/lib/community/constants'

const clean = (max: number) => z.string().trim().min(1, 'This field is required.').max(max, `Use ${max} characters or fewer.`)
const optionalText = (max: number) => z.preprocess((value) => typeof value === 'string' && value.trim() === '' ? undefined : value, z.string().trim().max(max).optional())
const optionalIndustry = z.preprocess(value => value === '' ? undefined : value, z.enum(INDUSTRIES).optional())
const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(320)

function optionalHttpsUrl(hosts?: string[]) {
  return z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().trim().url('Enter a complete URL.').max(2048).refine((value) => {
      if (!isPublicHttpUrl(value)) return false
      const url = new URL(value)
      return url.protocol === 'https:' && (!hosts || hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)))
    }, hosts ? 'Use a valid HTTPS link from the requested service.' : 'Use an HTTPS URL.').optional(),
  )
}

const locationFields = {
  location_scope: z.enum(['united_states', 'international']),
  us_state: optionalText(2),
  country: optionalText(100),
  city_region: clean(120),
}

function validateLocation(data: { location_scope: string; us_state?: string; country?: string }, context: z.RefinementCtx) {
  if (data.location_scope === 'united_states' && !US_STATES.some(([code]) => code === data.us_state)) {
    context.addIssue({ code: 'custom', path: ['us_state'], message: 'Select a U.S. state.' })
  }
  if (data.location_scope === 'international' && (!data.country || !COUNTRIES.includes(data.country as (typeof COUNTRIES)[number]))) {
    context.addIssue({ code: 'custom', path: ['country'], message: 'Select a country.' })
  }
}

export function isPublicHttpUrl(value: string) {
  let url: URL
  try { url = new URL(value) } catch { return false }
  if (!['http:', 'https:'].includes(url.protocol)) return false
  const host = url.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.local') || host === '::1' || host === '[::1]') return false
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(host)) return false
  const private172 = host.match(/^172\.(\d{1,3})\./)
  if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return false
  return host.includes('.')
}

export const participantSchema = z.object({
  email,
  name: optionalText(120),
  industry: optionalIndustry,
  industry_other: optionalText(120),
  ...locationFields,
  communications_consent: z.literal('on', { message: 'Consent is required to register.' }),
  privacy_consent: z.literal('on', { message: 'Please acknowledge the Privacy Policy.' }),
}).superRefine((data, context) => {
  validateLocation(data, context)
  if (data.industry === 'Other' && !data.industry_other) context.addIssue({ code: 'custom', path: ['industry_other'], message: 'Describe your field or industry.' })
})

export const contributorSchema = z.object({
  name: clean(120),
  email,
  industry: optionalIndustry,
  industry_other: optionalText(120),
  ...locationFields,
  participation_reasons: z.array(z.enum(PARTICIPATION_REASONS)).min(1, 'Choose at least one reason.'),
  participation_reason_other: optionalText(500),
  contribution_areas: z.array(z.enum(CONTRIBUTION_AREAS)).min(1, 'Choose at least one contribution area.'),
  contribution_area_other: optionalText(500),
  personal_website: optionalHttpsUrl(),
  github_url: optionalHttpsUrl(['github.com']),
  scholar_url: optionalHttpsUrl(['scholar.google.com']),
  linkedin_url: optionalHttpsUrl(['linkedin.com']),
  profile_willingness: z.enum(['yes_if_invited', 'not_now', 'discuss_later']).optional(),
  conduct_consent: z.literal('on', { message: 'You must agree to the Code of Conduct.' }),
  privacy_consent: z.literal('on', { message: 'Please acknowledge the Privacy Policy.' }),
}).superRefine((data, context) => {
  validateLocation(data, context)
  if (data.industry === 'Other' && !data.industry_other) context.addIssue({ code: 'custom', path: ['industry_other'], message: 'Describe your field or industry.' })
  if (data.participation_reasons.includes('Other') && !data.participation_reason_other) context.addIssue({ code: 'custom', path: ['participation_reason_other'], message: 'Tell us your other reason.' })
  if (data.contribution_areas.includes('Other') && !data.contribution_area_other) context.addIssue({ code: 'custom', path: ['contribution_area_other'], message: 'Tell us what else you would like to contribute.' })
})

export const resourceSubmissionSchema = z.object({
  contact_email: email,
  submitter_name: optionalText(120),
  title: clean(180),
  public_url: z.string().trim().url('Enter a complete public URL.').max(2048).refine(isPublicHttpUrl, 'Use a public HTTP or HTTPS URL.'),
  format: z.enum(RESOURCE_FORMATS),
  language: clean(80),
  description: clean(1000),
  author_publisher: clean(180),
  access_confirmation: z.literal('on', { message: 'Confirm that the resource is free and publicly accessible.' }),
  copyright_confirmation: z.literal('on', { message: 'Confirm that this submission does not infringe copyright.' }),
  privacy_consent: z.literal('on', { message: 'Please acknowledge the Privacy Policy.' }),
})

export function formDataRecord(formData: FormData) {
  return Object.fromEntries(formData.entries()) as Record<string, unknown>
}

export function zodErrors(error: z.ZodError) {
  return error.flatten().fieldErrors as Record<string, string[]>
}
