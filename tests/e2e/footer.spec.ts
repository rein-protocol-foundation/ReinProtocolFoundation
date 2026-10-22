import { expect, test } from '@playwright/test'

test('footer notes work without expanding the layout', async ({ page, isMobile }) => {
  await page.goto('/giving')
  const footer = page.locator('.site-footer')
  await footer.scrollIntoViewIfNeeded()
  await expect(page.locator('#foundation-status')).toHaveCount(0)
  await expect(footer.locator('details')).toHaveCount(0)
  await expect(footer).toContainText('researcher support, and public participation')
  const height = (await footer.boundingBox())!.height
  expect(height).toBeLessThan(isMobile ? 450 : 300)
  const name = footer.getByRole('button', { name: 'Our name' })
  if (isMobile) await name.tap()
  else await name.hover()
  const tooltip = footer.getByRole('tooltip')
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toContainText('guidance for AI agents')
  const box = (await tooltip.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  expect((await footer.boundingBox())!.height).toBe(height)
  await page.keyboard.press('Escape')
  await expect(tooltip).toBeHidden()
  const status = footer.getByRole('button', { name: 'Wyoming nonprofit' })
  await status.focus()
  await expect(footer.getByRole('tooltip')).toContainText('Oct 2026')
  await page.keyboard.press('Escape')
  await expect(footer.getByRole('tooltip')).toBeHidden()
  const credits = footer.getByRole('button', { name: 'Image credits' })
  await credits.click()
  const panel = footer.getByRole('dialog', { name: 'Image credits' })
  await expect(panel).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(panel.getByRole('link').first()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(credits).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})


test('notes stay inside a narrow viewport and dismiss on outside taps', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto('/giving')
  const footer = page.locator('.site-footer')
  await footer.scrollIntoViewIfNeeded()
  for (const name of ['Our name', 'Wyoming nonprofit', 'Image credits']) {
    await footer.getByRole('button', { name }).click()
    const panel = footer.locator('.footer-note__panel:not([hidden])')
    await expect(panel).toBeVisible()
    const bounds = (await panel.boundingBox())!
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(320)
    await page.mouse.click(2, 100)
    await expect(panel).toHaveCount(0)
  }
})
