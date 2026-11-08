import { type Page, expect } from '@playwright/test'

export const gameOver = (page: Page) => page.getByRole('heading', { name: /Ganaste|Perdiste/ })

/**
 * Makes one move if it is this page's turn: accepts any call, otherwise plays
 * the first card it can. Returns false when there was nothing to do.
 */
export async function move(page: Page): Promise<boolean> {
  const quiero = page
    .getByRole('group', { name: 'Cantos' })
    .getByRole('button', { name: 'Quiero', exact: true })
  const card = page.getByRole('group', { name: 'Tus cartas' }).locator('button:enabled').first()
  for (const target of [quiero, card]) {
    if (!(await target.isVisible())) continue
    // The turn can change between looking and clicking when a new state arrives.
    return target.click({ timeout: 500 }).then(
      () => true,
      () => false,
    )
  }
  return false
}

export async function createRoom(page: Page, name: string): Promise<string> {
  await page.goto('/')
  await page.getByLabel('Tu nombre').fill(name)
  await page.getByRole('button', { name: 'Crear sala' }).click()
  await expect(page.getByRole('heading', { name: 'Esperando a tu rival' })).toBeVisible()
  return page.getByLabel('Link de la sala').inputValue()
}

export async function joinRoom(page: Page, link: string, name: string) {
  await page.goto(link)
  await page.getByLabel('Tu nombre').fill(name)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('region', { name: 'Mesa' })).toBeVisible()
}
