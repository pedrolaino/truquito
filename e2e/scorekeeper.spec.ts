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
  const reset = page.getByRole('dialog', { name: '¿Empezar de nuevo?' })
  await reset.getByRole('button', { name: 'Seguir jugando' }).click()
  await expect(nosotros).toContainText('15 buenas')
  await page.getByRole('button', { name: 'Nueva partida' }).click()
  await reset.getByRole('button', { name: 'Nueva partida' }).click()
  await expect(page.getByRole('button', { name: 'A 15' })).toBeVisible()
})

test('plays puntas apart from the score and adds only the difference', async ({ page }) => {
  await page.goto('/anotador')
  await page.getByRole('button', { name: 'A 30' }).click()
  const nosotros = page.getByRole('button', { name: 'Sumar un punto a Nosotros' })
  const ellos = page.getByRole('button', { name: 'Sumar un punto a Ellos' })
  await nosotros.click()

  await page.getByRole('button', { name: 'Jugar puntas' }).click()
  const puntas = page.getByRole('dialog', { name: 'Puntas' })
  await expect(puntas).toBeVisible()
  const ours = puntas.getByRole('button', { name: 'Sumar un punto de puntas a Nosotros' })
  const theirs = puntas.getByRole('button', { name: 'Sumar un punto de puntas a Ellos' })
  for (let i = 0; i < 5; i++) await ours.click()
  for (let i = 0; i < 7; i++) await theirs.click()
  // The regular score stays in view behind the dialog but cannot be touched.
  await expect(nosotros.click({ timeout: 500 })).rejects.toThrow()

  await page.reload()
  await expect(puntas).toContainText('5')

  await puntas.getByRole('button', { name: 'Terminar puntas' }).click()
  await expect(puntas).toContainText('Nosotros 5, Ellos 7: +2 para Ellos')
  await puntas.getByRole('button', { name: 'Sumar al anotador' }).click()

  await expect(puntas).toBeHidden()
  await expect(page.getByRole('status')).toContainText('+2 para Ellos')
  await expect(nosotros).toContainText('1 mala')
  await expect(ellos).toContainText('2 malas')
})
