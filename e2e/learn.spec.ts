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
