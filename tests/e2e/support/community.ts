import { expect, type Locator, type Page } from '@playwright/test'

export const communityNavigationLabels = ['Overview', 'Program', 'Learn', 'People', 'Email updates', 'Contribute'] as const

export function communityNavigation(page: Page) {
  return page.getByRole('navigation', { name: 'Community navigation' })
}

function outsideUnitedStates(form: Locator) {
  const name = 'Outside the United States'
  return form.getByRole('checkbox', { name }).or(form.getByRole('switch', { name }))
}

export async function selectInternationalLocation(form: Locator, country = 'Canada', cityOrRegion = 'Toronto') {
  await outsideUnitedStates(form).check()
  await form.getByLabel(/^Country/).selectOption({ label: country })
  await form.getByLabel(/^City/).fill(cityOrRegion)
}

export async function selectUnitedStatesLocation(form: Locator, state = 'CA', city = 'San Francisco') {
  await outsideUnitedStates(form).uncheck()
  await form.getByLabel(/^State/).selectOption(state)
  await form.getByLabel(/^City/).fill(city)
}

export async function expectHeadingBelowStickyHeader(page: Page, headingName: string) {
  const header = page.locator('.site-header')
  const heading = page.getByRole('heading', { name: headingName })
  await expect(heading).toBeInViewport()

  const [headerBox, headingBox] = await Promise.all([header.boundingBox(), heading.boundingBox()])
  expect(headerBox).not.toBeNull()
  expect(headingBox).not.toBeNull()
  expect(headingBox!.y).toBeGreaterThan(headerBox!.height)
}
