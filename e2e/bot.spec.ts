import { expect, test } from '@playwright/test'
import { gameOver, move } from './helpers.ts'

test('plays a whole game against the bot', async ({ page }) => {
  // The bot waits like a person; the fake clock skips the waiting.
  await page.clock.install()
  await page.goto('/')
  await page.getByLabel('Difícil').check()
  await page.getByLabel('Con flor').check()
  await page.getByRole('button', { name: 'Jugar contra el bot' }).click()
  await expect(page.getByRole('region', { name: 'Mesa' })).toBeVisible()

  for (let i = 0; i < 300 && !(await gameOver(page).isVisible()); i++) {
    await move(page)
    await page.clock.fastForward(2500)
  }
  await expect(gameOver(page)).toBeVisible()
  await expect(page.locator('.final-score')).toContainText('15')

  await page.getByRole('button', { name: 'Jugar de nuevo' }).click()
  await expect(gameOver(page)).toBeHidden()
  await expect(page.getByRole('group', { name: 'Tus cartas' }).getByRole('button')).toHaveCount(3)
})
