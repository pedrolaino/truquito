import { expect, test } from '@playwright/test'

test('the front page offers play without asking the bot for a name', async ({ page }) => {
  for (const viewport of [
    { width: 375, height: 553 },
    { width: 1366, height: 768 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    const play = page.getByRole('button', { name: 'Jugar contra el bot' })
    const bounds = await play.boundingBox()
    expect(bounds).not.toBeNull()
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height)
    await play.click()
    await expect(page).toHaveURL(/\/jugar\?/)
    await expect(page.getByRole('region', { name: 'Mesa' })).toBeVisible()
  }
})

test('navigation supports new tabs and shows the next page title', async ({ page, context }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Ir al contenido' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()
  const learn = page.getByRole('link', { name: 'Aprender a jugar' })
  const [other] = await Promise.all([
    context.waitForEvent('page'),
    learn.click({ modifiers: ['ControlOrMeta'] }),
  ])
  await expect(other).toHaveURL(/\/aprender$/)
  await other.close()
  await learn.click()
  await expect(page).toHaveTitle('Aprendé jugando · Truquito')
  await expect(page.getByRole('heading', { name: 'Aprendé jugando' })).toBeFocused()
})

test('an empty online name receives focus and a field error', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Crear sala' }).click()
  const name = page.getByLabel('Tu nombre')
  await expect(name).toBeFocused()
  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByRole('alert')).toContainText('Poné un nombre')
  await name.fill('Ana')
  await expect(name).toHaveAttribute('aria-invalid', 'false')
})

test('game links validate their settings', async ({ page }) => {
  await page.goto('/jugar?level=unknown&target=999&flor=invalid')
  await expect(page.locator('.round-info')).toContainText('A 15, sin flor')
  await expect(page.locator('.rival-name')).toContainText('Bot medio')
})

test('lesson steps keep their name and move focus to the new question', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 553 })
  await page.goto('/aprender/cartas')
  await expect(page.locator('.lesson-position h1')).toHaveText('Qué carta le gana a cuál')
  await expect(page.locator('.lesson-position small')).toHaveText(/^1 de /)
  await page.getByRole('button', { name: 'Seguir', exact: true }).click()
  await expect(page.locator('.lesson-position small')).toHaveText(/^2 de /)
  await expect(page.locator('.lesson-step h2')).toBeFocused()
  await expect(page.locator('.lesson-bar')).toBeInViewport({ ratio: 1 })
  await expect(page).toHaveTitle('Qué carta le gana a cuál · Truquito')
})

test('server errors do not mark a valid name as invalid', async ({ page }) => {
  await page.route('**/api/rooms', (route) => route.fulfill({ status: 500, body: '{}' }))
  await page.goto('/')
  await page.getByLabel('Tu nombre').fill('Ana')
  await page.getByRole('button', { name: 'Crear sala' }).click()
  await expect(page.getByRole('alert')).toContainText('No pudimos crear la sala')
  await expect(page.getByLabel('Tu nombre')).toHaveAttribute('aria-invalid', 'false')
})

test('a guide topic links to its practice lesson', async ({ page }) => {
  await page.goto('/aprender/guia#guide-envido')
  await page.getByRole('link', { name: 'Probar: contar el envido' }).click()
  await expect(page).toHaveURL(/\/aprender\/contar-envido$/)
  await expect(page.locator('.lesson-position h1')).toHaveText('Contá el envido')
})
