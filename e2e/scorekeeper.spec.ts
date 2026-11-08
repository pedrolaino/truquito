import { expect, test } from '@playwright/test'

test('keeps the score of a real game and survives a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Abrir el anotador' }).click()
  await page.getByRole('button', { name: 'A 30' }).click()

  const nosotros = page.getByRole('button', { name: 'Sumar un punto a Nosotros' })
  const ellos = page.getByRole('button', { name: 'Sumar un punto a Ellos' })
  for (let i = 0; i < 17; i++) await nosotros.click()
  await ellos.click()
  await ellos.click()
  await page.getByRole('button', { name: 'Restar un punto a Ellos' }).click()
  await expect(nosotros).toContainText('2 buenas')
  await expect(ellos).toContainText('1 mala')

  await page.reload()
  await expect(nosotros).toContainText('2 buenas')

  for (let i = 0; i < 13; i++) await nosotros.click()
  await expect(page.getByRole('status')).toHaveText('¡Ganaron Nosotros!')
  await expect(nosotros).toBeDisabled()

  await page.getByRole('button', { name: 'Nueva partida' }).click()
  await expect(page.getByRole('button', { name: 'A 15' })).toBeVisible()
})
