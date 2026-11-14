import { expect, test } from '@playwright/test'

test('an incomplete row of large quiz cards is centered on phones', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/aprender/cartas')
  const next = page.getByRole('button', { name: 'Seguir', exact: true })
  await next.click()
  await next.click()
  await page.getByRole('button', { name: '1 de basto', exact: true }).click()
  await next.click()
  await next.click()
  await page.getByRole('button', { name: '3 de basto', exact: true }).click()
  await next.click()
  for (const width of [320, 375, 393]) {
    await page.setViewportSize({ width, height: 700 })
    const cards = page.locator('.quiz-card')
    await expect(cards).toHaveCount(3)
    const first = (await cards.nth(0).boundingBox())!
    const last = (await cards.nth(2).boundingBox())!
    expect(first.width).toBeGreaterThanOrEqual(112)
    expect(last.y).toBeGreaterThan(first.y)
    expect(Math.abs(last.x + last.width / 2 - width / 2)).toBeLessThan(2)
  }
})

test('partner signals are available in the guide and during play', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/*.woff2', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    await route.continue()
  })
  await page.goto('/aprender/guia#guide-senas')
  await expect(page.getByRole('link', { name: 'Señas', exact: true })).toHaveAttribute(
    'aria-current',
    'location',
  )
  await expect(page.getByRole('heading', { name: 'Las señas' })).toBeInViewport()
  await expect(page.locator('.signals-list dt')).toHaveCount(9)
  await expect(page.locator('.signal-row').filter({ hasText: '7 de espada' })).toContainText(
    'tu derecha',
  )
  await expect(page.locator('.signal-row').filter({ hasText: '7 de oro' })).toContainText(
    'tu izquierda',
  )
  await expect(page.getByText('Regla de esta mesa:', { exact: false })).toHaveCount(0)
  await page.goto('/jugar')
  await page.getByRole('button', { name: 'Guía rápida' }).click()
  const guide = page.getByRole('dialog', { name: 'Guía rápida' })
  await guide.getByRole('link', { name: 'Señas', exact: true }).click()
  await expect(guide.getByRole('heading', { name: 'Las señas' })).toBeInViewport()
  await expect(guide.locator('.signals-list dt')).toHaveCount(9)
  const nav = (await guide.locator('.guide-nav').boundingBox())!
  expect(nav.x).toBeGreaterThanOrEqual(0)
  expect(nav.x + nav.width).toBeLessThanOrEqual(320)
  await guide.getByRole('button', { name: 'Cerrar la guía' }).click()
  await expect(guide).toHaveCount(0)
})
