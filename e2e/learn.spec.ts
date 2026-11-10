import { expect, test } from '@playwright/test'

test('the quick guide compares cards and opens over a game', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /No sabés jugar/ }).click()
  await page.getByRole('button', { name: /Guía rápida/ }).click()
  await expect(page.getByRole('heading', { name: 'Qué carta gana' })).toBeVisible()

  await page.getByRole('button', { name: '3 de copa' }).click()
  await page.getByRole('button', { name: '7 de oro' }).click()
  await expect(page.getByRole('status')).toHaveText('7 de oro le gana a 3 de copa')
  await page.getByRole('button', { name: '3 de oro' }).click()
  await page.getByRole('button', { name: '7 de oro' }).click()
  await page.getByRole('button', { name: '3 de espada' }).click()
  await expect(page.getByRole('status')).toHaveText('3 de oro y 3 de espada empatan: es parda')

  await page.goto('/')
  await page.getByLabel('Tu nombre').fill('Ana')
  await page.getByRole('button', { name: 'Jugar contra el bot' }).click()
  await page.getByRole('button', { name: 'Guía rápida' }).click()
  const sheet = page.getByRole('dialog', { name: 'Guía rápida' })
  await expect(sheet.getByRole('heading', { name: 'Cómo se cuenta el envido' })).toBeAttached()
  await sheet.getByRole('button', { name: 'Cerrar la guía' }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('region', { name: 'Mesa' })).toBeVisible()
})

test('a learner can go through every lesson', async ({ page }) => {
  test.setTimeout(120_000)
  await page.clock.install()
  await page.goto('/aprender')
  await page.getByRole('button', { name: /De qué se trata/ }).click()

  const finished = page.getByRole('heading', { name: '¡Lección terminada!' })
  const nextLesson = page.getByRole('button', { name: /^Seguir: / })
  for (let lessons = 0; lessons < 20; lessons++) {
    for (let i = 0; i < 80 && !(await finished.isVisible()); i++) {
      const go = page.getByRole('button', { name: /^(Empezar|Seguir)$/ })
      const option = page.locator('.quiz-option, .quiz-card').first()
      const cue = page.locator('.suggested').first()
      if (await go.isVisible()) await go.click()
      else if (await option.isVisible()) await option.click()
      else if (await cue.isVisible()) await cue.click({ timeout: 1000 }).catch(() => {})
      await page.clock.fastForward(1500)
    }
    await expect(finished).toBeVisible()
    if (!(await nextLesson.isVisible())) break
    await nextLesson.click()
  }

  await page.getByRole('button', { name: 'Volver al menú' }).click()
  await expect(page.getByText('¡Terminaste todas las lecciones!')).toBeVisible()
  await expect(page.locator('.learn-number.is-done')).toHaveCount(9)
})

test('the helper suggests a move and the learner can follow it', async ({ page }) => {
  await page.clock.install()
  await page.goto('/aprender/ayudante')
  const coach = page.locator('.coach')
  for (let i = 0; i < 6; i++) {
    await page.clock.fastForward(2500)
    const suggested = page.locator('.suggested').first()
    if (await suggested.isVisible()) {
      await expect(coach).not.toHaveText(/Mirá lo que hace/)
      await suggested.click({ timeout: 1000 }).catch(() => {})
    }
  }
  await page.getByRole('button', { name: 'Ocultar ayuda' }).click()
  await expect(coach).toHaveText(/La ayuda está apagada/)
  await expect(page.locator('.suggested')).toHaveCount(0)
})
