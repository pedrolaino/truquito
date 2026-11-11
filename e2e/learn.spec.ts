import { expect, test } from '@playwright/test'

test('the quick guide opens from the menu and over a game', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /No sabés jugar/ }).click()
  await page.getByRole('button', { name: 'Consultar las reglas' }).click()
  await expect(page.getByRole('heading', { name: 'Qué carta gana' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2 })).toHaveText([
    'Qué carta gana',
    'Cómo se cuenta el envido',
    'Cuánto vale cada canto',
  ])
  await expect(page.getByRole('img', { name: '1 de espada', exact: true })).toBeVisible()

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
  test.setTimeout(300_000)
  await page.clock.install()
  await page.goto('/aprender')
  await page.getByRole('button', { name: 'Jugar mi primera mano' }).click()

  const finished = page.getByRole('heading', { name: '¡Lección terminada!' })
  const nextLesson = page.getByRole('button', { name: /^Continuar: / })
  // What to tap, in order: move on, give up on a question, ask for a hint, follow it, answer.
  const taps = [
    page.locator('.feedback .btn-primary'),
    page.getByRole('button', { name: 'Ver explicación' }),
    page.locator('.lesson-actions .btn-primary'),
    page.getByRole('button', { name: 'Pista' }),
    page.locator('.suggested'),
    page.locator('.quiz-option:enabled, .quiz-card:enabled'),
  ]
  for (let lessons = 0; lessons < 20; lessons++) {
    for (let i = 0; i < 120 && !(await finished.isVisible()); i++) {
      for (const tap of taps) {
        const target = tap.first()
        if (await target.isVisible()) {
          await target.click({ timeout: 1000 }).catch(() => {})
          break
        }
      }
      await page.clock.fastForward(1500)
    }
    await expect(finished).toBeVisible()
    if (!(await nextLesson.isVisible())) break
    await nextLesson.click()
  }

  await page.getByRole('button', { name: 'Volver al menú' }).click()
  await expect(page.getByText('Ya practicaste lo básico', { exact: false })).toBeVisible()
  await expect(page.locator('.learn-mark.is-done')).toHaveCount(12)
})

test('the helper suggests a move and the learner can follow it', async ({ page }) => {
  await page.clock.install()
  await page.goto('/aprender/ayudante')
  const coach = page.locator('.tip')
  for (let i = 0; i < 6; i++) {
    await page.clock.fastForward(2500)
    const suggested = page.locator('.suggested').first()
    if (await suggested.isVisible()) {
      await expect(coach).not.toHaveText(/Mirá lo que hace/)
      await suggested.click({ timeout: 1000 }).catch(() => {})
    }
  }
  await page.getByRole('combobox', { name: 'Ayuda' }).selectOption('off')
  await expect(coach).toHaveCount(0)
  await expect(page.locator('.suggested')).toHaveCount(0)
})
