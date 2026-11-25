import { describe, expect, it } from 'vitest'
import { contributorSchema, isPublicHttpUrl, participantSchema, resourceSubmissionSchema } from '@/lib/community/schemas'

describe('community participant validation', () => {
  it('accepts a U.S. registration without a name or street address', () => {
    const result = participantSchema.safeParse({
      email: '  PERSON@Example.org ', industry: 'Education', location_scope: 'united_states',
      us_state: 'CA', city_region: 'Oakland', communications_consent: 'on', privacy_consent: 'on',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('person@example.org')
  })

  it('requires a standard state for U.S. contacts and a standard country outside the U.S.', () => {
    const base = { email: 'person@example.org', industry: 'Student', city_region: 'Somewhere', communications_consent: 'on', privacy_consent: 'on' }
    expect(participantSchema.safeParse({ ...base, location_scope: 'united_states', us_state: 'XX' }).success).toBe(false)
    expect(participantSchema.safeParse({ ...base, location_scope: 'international', country: 'Invented Place' }).success).toBe(false)
    expect(participantSchema.safeParse({ ...base, location_scope: 'united_states', us_state: 'CA', city_region: ' ' }).success).toBe(false)
    expect(participantSchema.safeParse({ ...base, location_scope: 'international', country: 'Japan', city_region: '' }).success).toBe(false)
    expect(participantSchema.safeParse({ ...base, location_scope: 'international', country: 'Japan' }).success).toBe(true)
  })
})

describe('Contributor validation', () => {
  const valid = {
    name: '张 Example', email: 'person@example.org', location_scope: 'international' as const,
    country: 'Singapore', city_region: 'Singapore',
    participation_reasons: ['Meet and collaborate with peers'],
    contribution_areas: ['Research and paper discussions'],
    conduct_consent: 'on' as const, privacy_consent: 'on' as const,
  }

  it('accepts all optional profile links and a non-binding profile preference', () => {
    const result = contributorSchema.safeParse({ ...valid,
      personal_website: 'https://example.org', github_url: 'https://github.com/example',
      scholar_url: 'https://scholar.google.com/citations?user=example', linkedin_url: 'https://www.linkedin.com/in/example',
      profile_willingness: 'discuss_later',
    })
    expect(result.success).toBe(true)
  })

  it('rejects service-domain impersonation and requires text when Other is selected', () => {
    expect(contributorSchema.safeParse({ ...valid, github_url: 'https://github.com.example.org/person' }).success).toBe(false)
    expect(contributorSchema.safeParse({ ...valid, personal_website: 'https://localhost/private' }).success).toBe(false)
    expect(contributorSchema.safeParse({ ...valid, participation_reasons: ['Other'] }).success).toBe(false)
    expect(contributorSchema.safeParse({ ...valid, contribution_areas: ['Other'], contribution_area_other: 'Community archives' }).success).toBe(true)
  })
})

describe('public resource validation', () => {
  const valid = { contact_email: 'person@example.org', title: 'An Agent course', public_url: 'https://example.org/course', format: 'Course' as const, language: 'English', description: 'A free public course about Agent architectures.', author_publisher: 'Example Institute', access_confirmation: 'on' as const, copyright_confirmation: 'on' as const, privacy_consent: 'on' as const }
  it('accepts a public URL and rejects local/private targets', () => {
    expect(resourceSubmissionSchema.safeParse(valid).success).toBe(true)
    expect(resourceSubmissionSchema.safeParse({ ...valid, public_url: 'http://127.0.0.1/private' }).success).toBe(false)
    expect(isPublicHttpUrl('https://example.org/public')).toBe(true)
    expect(isPublicHttpUrl('http://192.168.1.10/resource')).toBe(false)
  })

  it('accepts a 1,000-character description and rejects longer text', () => {
    expect(resourceSubmissionSchema.safeParse({ ...valid, description: 'a'.repeat(1000) }).success).toBe(true)
    expect(resourceSubmissionSchema.safeParse({ ...valid, description: 'a'.repeat(1001) }).success).toBe(false)
  })
})

describe('browser form payload regressions', () => {
  const application = {
    name: '测试申请', email: 'audit@example.test', industry: '',
    location_scope: 'international', country: 'China', city_region: '上海',
    participation_reasons: ['Learn more about AI Agents'],
    contribution_areas: ['Research and paper discussions'],
    personal_website: '', github_url: '', scholar_url: '', linkedin_url: '',
    conduct_consent: 'on', privacy_consent: 'on',
  }

  it('accepts the empty option actually sent by the contributor industry select', () => {
    expect(contributorSchema.safeParse(application).success).toBe(true)
  })

  it.each(['personal_website', 'github_url', 'scholar_url', 'linkedin_url'])(
    'returns a field error instead of throwing for malformed %s', field => {
      const result = contributorSchema.safeParse({ ...application, industry: 'Student', [field]: 'not a url' })
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.flatten().fieldErrors).toHaveProperty(field)
    },
  )
})

describe('all public form field contracts', () => {
  const participant = { email: 'person@example.test', name: '', industry: '', location_scope: 'united_states', us_state: 'CA', city_region: 'Oakland', communications_consent: 'on', privacy_consent: 'on' }
  const contributor = { ...participant, name: '张 Example', participation_reasons: ['Learn more about AI Agents'], contribution_areas: ['Research and paper discussions'], conduct_consent: 'on' }
  const resource = { contact_email: 'person@example.test', submitter_name: '', title: '测试资源', public_url: 'https://example.org/resource', format: 'Course', language: '中文', description: '说明', author_publisher: '作者', access_confirmation: 'on', copyright_confirmation: 'on', privacy_consent: 'on' }
  const contracts = [
    { label: 'participant', schema: participantSchema, valid: participant, required: ['email', 'location_scope', 'us_state', 'city_region', 'communications_consent', 'privacy_consent'], limits: { name: 120, industry_other: 120, city_region: 120 } },
    { label: 'contributor', schema: contributorSchema, valid: contributor, required: ['name', 'email', 'location_scope', 'us_state', 'city_region', 'participation_reasons', 'contribution_areas', 'conduct_consent', 'privacy_consent'], limits: { name: 120, industry_other: 120, city_region: 120, participation_reason_other: 500, contribution_area_other: 500 } },
    { label: 'resource', schema: resourceSubmissionSchema, valid: resource, required: ['contact_email', 'title', 'public_url', 'format', 'language', 'description', 'author_publisher', 'access_confirmation', 'copyright_confirmation', 'privacy_consent'], limits: { submitter_name: 120, title: 180, language: 80, description: 1000, author_publisher: 180 } },
  ]
  for (const { label, schema, valid, required, limits } of contracts) {
    it(`${label}: accepts its required-only payload`, () => {
      expect(schema.safeParse(valid).success).toBe(true)
    })
    it.each(required)(`${label}: rejects missing %s`, field => {
      expect(schema.safeParse({ ...valid, [field]: undefined }).success).toBe(false)
    })
    it.each(Object.entries(limits))(`${label}: enforces %s length %i`, (field, max) => {
      expect(schema.safeParse({ ...valid, [field]: '字'.repeat(max) }).success).toBe(true)
      expect(schema.safeParse({ ...valid, [field]: '字'.repeat(max + 1) }).success).toBe(false)
    })
  }
  for (const schema of [participantSchema, contributorSchema]) {
    const base = schema === participantSchema ? participant : contributor
    it('requires Other industry details and accepts international locations without a state', () => {
      expect(schema.safeParse({ ...base, industry: 'Other' }).success).toBe(false)
      expect(schema.safeParse({ ...base, industry: 'Other', industry_other: '开源社区' }).success).toBe(true)
      expect(schema.safeParse({ ...base, location_scope: 'international', us_state: undefined, country: 'China', city_region: '上海' }).success).toBe(true)
      expect(schema.safeParse({ ...base, industry: 'invalid' }).success).toBe(false)
    })
  }
  it.each(['participation_reasons', 'contribution_areas'])('validates %s arrays and Other details', field => {
    const detail = field === 'participation_reasons' ? 'participation_reason_other' : 'contribution_area_other'
    for (const value of [[], ['invalid'], ['Other'], 'Other']) {
      expect(contributorSchema.safeParse({ ...contributor, [field]: value }).success).toBe(false)
    }
    expect(contributorSchema.safeParse({ ...contributor, [field]: ['Other'], [detail]: '社区工作' }).success).toBe(true)
  })
  it.each(['yes_if_invited', 'not_now', 'discuss_later'])('accepts profile preference %s', value => {
    expect(contributorSchema.safeParse({ ...contributor, profile_willingness: value }).success).toBe(true)
  })
  it.each(['Video', 'Article / Document', 'Course', 'Paper Discussion', 'Tool / Reference'])('accepts resource format %s', format => {
    expect(resourceSubmissionSchema.safeParse({ ...resource, format }).success).toBe(true)
  })
  it('rejects invalid resource format, bad email, URL and profile preference', () => {
    expect(resourceSubmissionSchema.safeParse({ ...resource, format: 'invalid' }).success).toBe(false)
    expect(resourceSubmissionSchema.safeParse({ ...resource, public_url: 'not a url' }).success).toBe(false)
    expect(participantSchema.safeParse({ ...participant, email: 'not an email' }).success).toBe(false)
    expect(contributorSchema.safeParse({ ...contributor, profile_willingness: 'invalid' }).success).toBe(false)
  })
})
