import { expect, test } from '@playwright/test'

test('register with email, reach Discord, and dismiss the dialog by keyboard', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Register for community updates' }).click()
  const form = page.locator('.community-form--participant')
  await form.getByLabel(/^Email/).fill('member@example.invalid')
  await form.getByLabel(/community and activity messages/).check()
  await form.getByLabel(/Privacy Policy/).check()
  const submit = form.getByRole('button', { name: 'Register for community updates' })
  await submit.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'You’re registered.' })
  await expect(dialog.getByRole('link', { name: /Discord/ })).toBeVisible()
  await dialog.getByRole('button', { name: 'Done' }).focus()
  await page.keyboard.press('Enter')
  await expect(dialog).toBeHidden()
})

test('community navigation fits and remains usable during a calendar outage', async ({ page }) => {
  await page.goto('/community')
  await expect(page.getByRole('link', { name: /Join our Discord/ })).toBeVisible()
  await expect(page.getByText('The event list is temporarily unavailable.')).toBeVisible()
  const navigation = page.getByRole('navigation', { name: 'Community navigation' })
  for (const link of await navigation.getByRole('link').all()) {
    const box = await link.boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1)
  }
  await navigation.getByRole('link', { name: 'Learn' }).click()
  await page.getByLabel('Language').selectOption('zh-CN')
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect(page.getByRole('heading', { name: 'Example course' }).getByRole('link')).toHaveAttribute('href', 'https://example.org/zh')
  await expect(page.getByText(/Basic Python/)).toBeVisible()
  await page.getByLabel('Coding experience').selectOption('none')
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect(page).toHaveURL(/language=zh-CN&coding=none/)
  await expect(page.getByText('No resources match this selection.')).toBeVisible()
})
