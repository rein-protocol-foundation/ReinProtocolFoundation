import { createHash } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import { signInDevelopmentAdmin } from './support/admin'
import { selectInternationalLocation, selectUnitedStatesLocation } from './support/community'
import { e2eEmail, e2eRunId, memberCount, oneRecord, recordCount, updateRecord } from './support/database'

const participantEmail = e2eEmail('participant')
const contributorEmail = e2eEmail('contributor')
const resourceEmail = e2eEmail('resource')
const sharedEmail = e2eEmail('shared')
const contributorName = `E2E Contributor ${e2eRunId}`
const resourceTitle = `E2E Agent Resource ${e2eRunId}`

async function submitParticipant(page: Page, email: string, name: string, industry = 'AI / Software / Technology') {
  await page.goto('/community#register')
  const form = page.locator('.community-form--participant')
  await form.getByLabel(/^Email/).fill(email)
  await form.getByLabel(/^Name/).fill(name)
  await form.getByLabel(/^Field or industry/).selectOption(industry)
  await selectUnitedStatesLocation(form, 'CA', 'San Francisco')
  await form.getByLabel(/receive community and activity messages/).check()
  await form.getByLabel(/Privacy Policy/).check()
  await form.getByRole('button', { name: 'Register for community updates' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'You’re registered.' })).toBeVisible()
}

async function submitResource(page: Page, email: string, title: string) {
  await page.goto('/community/contribute/resources/submit')
  const form = page.locator('form.community-form')
  await form.getByLabel(/^Contact email/).fill(email)
  await form.getByLabel(/^Your name/).fill(`E2E Submitter ${e2eRunId}`)
  await form.getByLabel(/^Resource title/).fill(title)
  await form.getByLabel(/^Public URL/).fill(`https://example.com/resources/${e2eRunId}`)
  await form.getByLabel(/^Material type/).selectOption('Article / Document')
  await form.getByLabel(/^Language/).fill('English')
  await form.getByLabel(/^Factual author or publisher/).fill('E2E Public Publisher')
  await form.getByLabel(/^Description/).fill('A free technical introduction to AI Agent planning, tool use, and evaluation.')
  await form.getByLabel(/free and publicly accessible/).check()
  await form.getByLabel(/does not infringe copyright/).check()
  await form.getByLabel(/Privacy Policy/).check()
  await form.getByRole('button', { name: 'Submit resource for review' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Resource submitted.' })).toBeVisible()
}

test.describe.serial('database-writing community flows', () => {
  test('a valid Participant submission writes data, updates on repeat, and counts once', async ({ page }) => {
    const before = await memberCount()
    await submitParticipant(page, participantEmail, `E2E Participant ${e2eRunId}`)

    const participant = await oneRecord('dev_community_participants', 'email', participantEmail)
    expect(participant).toMatchObject({
      industry: 'AI / Software / Technology',
      location_scope: 'united_states',
      country: 'United States',
      us_state: 'CA',
      city_region: 'San Francisco',
      subscription_status: 'subscribed',
    })
    expect(await memberCount()).toBe(before + 1)

    await page.getByRole('button', { name: 'Done' }).click()
    await submitParticipant(page, participantEmail.toUpperCase(), `Updated Participant ${e2eRunId}`)
    expect(await recordCount('dev_community_participants', 'email', participantEmail)).toBe(1)
    expect(await recordCount('dev_contact_identities', 'normalized_value', participantEmail)).toBe(1)
    expect(await memberCount()).toBe(before + 1)
    const updated = await oneRecord('dev_community_participants', 'email', participantEmail)
    expect(updated.name).toBe(`Updated Participant ${e2eRunId}`)

    await page.getByRole('button', { name: 'Done' }).click()
    await submitParticipant(page, participantEmail, '', '')
    const withoutIndustry = await oneRecord('dev_community_participants', 'email', participantEmail)
    expect(withoutIndustry.industry).toBeNull()
    expect(await recordCount('dev_community_participants', 'email', participantEmail)).toBe(1)
    expect(await memberCount()).toBe(before + 1)
  })

  test('a valid Contributor application stores all fields and verifies exactly once', async ({ page }) => {
    const before = await memberCount()
    await page.goto('/community/contribute/apply')
    const form = page.locator('form.community-form')
    await form.getByLabel(/^Name/).fill(contributorName)
    await form.getByLabel(/^Email/).fill(contributorEmail)
    await selectInternationalLocation(form, 'Spain', 'Madrid')
    // Keep the browser's empty optional industry value to exercise its real FormData.
    await form.getByLabel('Advance a public-benefit mission').check()
    await form.getByLabel('Research and paper discussions').check()
    await form.getByRole('textbox', { name: 'Personal website' }).fill(`https://example.com/people/${e2eRunId}`)
    await form.getByRole('textbox', { name: 'GitHub' }).fill('https://github.com/openai')
    await form.getByRole('textbox', { name: 'Google Scholar' }).fill('https://scholar.google.com/citations?user=e2e')
    await form.getByRole('textbox', { name: 'LinkedIn' }).fill('https://www.linkedin.com/in/e2e')
    await form.getByLabel('Yes, if invited').check()
    await form.getByLabel(/Code of Conduct/).check()
    await form.getByLabel(/Privacy Policy/).check()
    await form.getByRole('button', { name: 'Submit Contributor application' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Application submitted.' })).toBeVisible()

    const application = await oneRecord('dev_contributor_applications', 'email', contributorEmail)
    expect(application).toMatchObject({
      name: contributorName,
      industry: null,
      location_scope: 'international',
      country: 'Spain',
      city_region: 'Madrid',
      participation_reasons: ['Advance a public-benefit mission'],
      contribution_areas: ['Research and paper discussions'],
      personal_website: `https://example.com/people/${e2eRunId}`,
      github_url: 'https://github.com/openai',
      scholar_url: 'https://scholar.google.com/citations?user=e2e',
      linkedin_url: 'https://www.linkedin.com/in/e2e',
      profile_willingness: 'yes_if_invited',
      status: 'email_pending',
    })
    const waitingJob = await oneRecord('dev_agent_jobs', 'record_id', application.id)
    expect(waitingJob.status).toBe('waiting_verification')
    expect(await memberCount()).toBe(before + 1)

    const token = `e2e-verification-${e2eRunId}`
    const tokenHash = createHash('sha256').update(token).digest('hex')
    await updateRecord('dev_contributor_applications', application.id, {
      verification_token_hash: tokenHash,
      verification_expires_at: new Date(Date.now() + 60_000).toISOString(),
      verification_used_at: null,
    })

    await page.goto(`/api/contributor/verify?token=${encodeURIComponent(token)}`)
    await expect(page).toHaveURL(/\/community\/contribute\/apply\/verified\?status=success$/)
    await expect(page.getByRole('heading', { name: 'Your email is verified.' })).toBeVisible()
    const verified = await oneRecord('dev_contributor_applications', 'id', application.id)
    expect(verified.status).toBe('submitted')
    expect(verified.email_verified_at).not.toBeNull()
    expect(verified.verification_token_hash).toBeNull()
    const pendingJob = await oneRecord('dev_agent_jobs', 'record_id', application.id)
    expect(pendingJob.status).toBe('pending')

    await page.goto(`/api/contributor/verify?token=${encodeURIComponent(token)}`)
    await expect(page).toHaveURL(/\/community\/contribute\/apply\/verified\?status=invalid$/)
  })

  test('a valid resource submission writes a private submitter and a pending Agent job', async ({ page }) => {
    const before = await memberCount()
    await submitResource(page, resourceEmail, resourceTitle)

    const submission = await oneRecord('dev_resource_submissions', 'contact_email', resourceEmail)
    expect(submission).toMatchObject({
      title: resourceTitle,
      format: 'Article / Document',
      language: 'English',
      description: 'A free technical introduction to AI Agent planning, tool use, and evaluation.',
      ai_agent_relevance: 'A free technical introduction to AI Agent planning, tool use, and evaluation.',
      author_publisher: 'E2E Public Publisher',
      status: 'pending',
    })
    const job = await oneRecord('dev_agent_jobs', 'record_id', submission.id)
    expect(job).toMatchObject({ job_type: 'resource_submission', status: 'pending', attempts: 0 })
    expect(await memberCount()).toBe(before + 1)
  })

  test('one email used across Participant and resource forms creates one member', async ({ page }) => {
    const before = await memberCount()
    await submitParticipant(page, sharedEmail, '', '')
    const minimalParticipant = await oneRecord('dev_community_participants', 'email', sharedEmail)
    expect(minimalParticipant.name).toBeNull()
    expect(minimalParticipant.industry).toBeNull()
    await page.getByRole('button', { name: 'Done' }).click()
    await submitResource(page, sharedEmail, `Shared Identity Resource ${e2eRunId}`)

    expect(await recordCount('dev_contact_identities', 'normalized_value', sharedEmail)).toBe(1)
    expect(await recordCount('dev_community_participants', 'email', sharedEmail)).toBe(1)
    expect(await recordCount('dev_resource_submissions', 'contact_email', sharedEmail)).toBe(1)
    expect(await memberCount()).toBe(before + 1)
  })

  test('an authorized administrator can read every submitted record', async ({ page }) => {
    await signInDevelopmentAdmin(page, 'e2e-admin@example.test')

    await page.goto('/admin/participants')
    await expect(page.getByText(participantEmail)).toBeVisible()
    await expect(page.getByText(sharedEmail)).toBeVisible()

    await page.goto('/admin/applications')
    await expect(page.getByText(contributorName)).toBeVisible()
    await expect(page.getByText(contributorEmail).first()).toBeVisible()
    await expect(page.getByText('Submitted', { exact: true })).toBeVisible()

    await page.goto('/admin/resources')
    await expect(page.getByText(resourceTitle)).toBeVisible()
    await page.getByText(resourceTitle).click()
    await expect(page.getByText(`Private submitter: ${resourceEmail}`)).toBeVisible()

    await page.goto('/admin')
    await expect(page.getByText('Community members — all time')).toBeVisible()
    await expect(page.getByText('4', { exact: true }).first()).toBeVisible()
  })
})
