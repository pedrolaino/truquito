import { type Browser, type Page, expect, test } from '@playwright/test'
import { createRoom, gameOver, joinRoom, move } from './helpers.ts'

test.setTimeout(120_000)

async function twoPlayers(browser: Browser, contextOptions: object) {
  const ana = await browser.newContext(contextOptions)
  const beto = await browser.newContext(contextOptions)
  const a = await ana.newPage()
  const b = await beto.newPage()
  const link = await createRoom(a, 'Ana')
  expect(link).toMatch(/\/r\/[0-9a-f]{32}$/)
  await joinRoom(b, link, 'Beto')
  await expect(a.getByRole('region', { name: 'Mesa' })).toBeVisible()
  return { ana, beto, a, b, link }
}

async function playUntilOver(pages: Page[]) {
  for (let i = 0; i < 600; i++) {
    if (await gameOver(pages[0]!).isVisible()) return
    for (const page of pages) await move(page)
    // Roughly human pace, well under the per-connection message limit.
    await pages[0]!.waitForTimeout(100)
  }
}

test('two browsers play a whole online game and a rematch', async ({ browser, contextOptions }) => {
  const { ana, beto, a, b } = await twoPlayers(browser, contextOptions)
  await playUntilOver([a, b])
  await expect(gameOver(a)).toBeVisible()
  await expect(gameOver(b)).toBeVisible()
  const results = [await gameOver(a).innerText(), await gameOver(b).innerText()].sort()
  expect(results).toEqual(['Perdiste', '¡Ganaste!'])

  await a.getByRole('button', { name: 'Pedir revancha' }).click()
  await expect(a.getByText('Esperando que Beto acepte la revancha…')).toBeVisible()
  await b.getByRole('button', { name: 'Aceptar la revancha' }).click()
  await expect(gameOver(a)).toBeHidden()
  await expect(b.getByText(/Puntos.*Vos 0/)).toBeVisible()
  await ana.close()
  await beto.close()
})

test('a player who closes the browser gets the seat back', async ({ browser, contextOptions }) => {
  const { ana, beto, a, b, link } = await twoPlayers(browser, contextOptions)
  for (let i = 0; i < 3; i++) await Promise.all([move(a), move(b)])
  await expect(b.getByText(/Te toca|Esperando a Ana/)).toBeVisible()
  await b.waitForTimeout(500)
  const hand = await b.getByRole('group', { name: 'Tus cartas' }).innerText()

  const saved = await beto.storageState()
  await beto.close()
  await expect(a.getByText(/Desconectado, esperando que vuelva/)).toBeVisible()

  const back = await browser.newContext({ ...contextOptions, storageState: saved })
  const b2 = await back.newPage()
  await b2.goto(link)
  await expect(b2.getByRole('group', { name: 'Tus cartas' })).toHaveText(hand)
  await expect(a.getByText(/Desconectado/)).toBeHidden()

  await playUntilOver([a, b2])
  await expect(gameOver(b2)).toBeVisible()
  await ana.close()
  await back.close()
})

test('shows clear messages for full and missing rooms', async ({ browser, contextOptions }) => {
  const { ana, beto, link } = await twoPlayers(browser, contextOptions)
  const third = await (await browser.newContext(contextOptions)).newPage()
  await third.goto(link)
  await expect(third.getByRole('alert')).toHaveText('La sala está llena: ya hay dos jugadores.')
  await third.goto(`/r/${'0'.repeat(32)}`)
  await expect(third.getByRole('alert')).toHaveText('Esta sala no existe o ya cerró.')
  await ana.close()
  await beto.close()
})
