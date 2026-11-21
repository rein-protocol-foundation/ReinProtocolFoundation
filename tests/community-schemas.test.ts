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
