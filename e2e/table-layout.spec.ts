import { expect, test } from '@playwright/test'

const screens = [
  { width: 320, height: 568 },
  { width: 375, height: 553 },
  { width: 390, height: 844 },
  { width: 393, height: 851 },
  { width: 844, height: 390 },
  { width: 1366, height: 768 },
]

test('hands and calls stay reachable on short and wide screens', async ({ page }) => {
  test.setTimeout(120_000)
  await page.clock.install()
  for (const viewport of screens) {
    await page.setViewportSize(viewport)
    for (const path of ['/', '/aprender/ayudante', '/aprender/objetivo']) {
      await page.goto(path)
      if (path === '/') await page.getByRole('button', { name: 'Jugar contra el bot' }).click()
      await page.clock.fastForward(3000)
      await expect(page.locator('.hand button')).toHaveCount(3)
      await expect(page.locator('.hand button:enabled, .calls button:enabled')).not.toHaveCount(0)
      const controls = page.locator(
        '.hand button, .calls button, .lesson-bar button, .scorebar button',
      )
      for (const control of await controls.all()) {
        const bounds = await control.boundingBox()
        expect(bounds, `${path} at ${viewport.width}×${viewport.height}`).not.toBeNull()
        if (!bounds) continue
        expect(bounds.x).toBeGreaterThanOrEqual(0)
        expect(bounds.y).toBeGreaterThanOrEqual(0)
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1)
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1)
      }
    }
  }
})

test('recent plays are available on a phone and leaving needs confirmation', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 553 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Jugar contra el bot' }).click()
  await page.getByRole('button', { name: /Últimas jugadas/ }).click()
  const history = page.getByRole('dialog', { name: 'Últimas jugadas' })
  await expect(history).toBeVisible()
  await history.getByRole('button', { name: 'Cerrar jugadas' }).click()
  await page.getByRole('button', { name: 'Salir', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Seguir jugando' }).click()
  await expect(page.getByRole('region', { name: 'Mesa' })).toBeVisible()
  await page.getByRole('button', { name: 'Salir', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Salir', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Jugar contra el bot' })).toBeVisible()
})

test('a long rival name leaves cards and both scores visible', async ({
  browser,
  contextOptions,
}) => {
  const host = await browser.newContext({
    ...contextOptions,
    viewport: { width: 320, height: 568 },
  })
  const guest = await browser.newContext(contextOptions)
  try {
    const a = await host.newPage()
    const b = await guest.newPage()
    await a.goto('http://localhost:4173/')
    await a.getByLabel('Tu nombre').fill('Ana')
    await a.getByRole('button', { name: 'Crear sala' }).click()
    const link = a.getByLabel('Link de la sala')
    await expect(link).toBeVisible()
    await b.goto(await link.inputValue())
    await b.getByLabel('Tu nombre').fill('WWWWWWWWWWWWWWWWWWWW')
    await b.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(a.getByRole('region', { name: 'Mesa' })).toBeVisible()
    for (const selector of ['.rival-hand', '.score-me small', '.score-rival small']) {
      const bounds = await a.locator(selector).boundingBox()
      expect(bounds).not.toBeNull()
      expect(bounds!.x).toBeGreaterThanOrEqual(0)
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320)
    }
  } finally {
    await host.close()
    await guest.close()
  }
})
