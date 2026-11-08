import { describe, expect, it } from 'vitest'
import { type Card, createDeck, sameCard } from './cards.ts'
import { type GameState, actorOf, applyAction, createGame, legalActions, viewFor } from './game.ts'
import { nextRandom } from './rng.ts'

const GAMES = 2000
const MAX_ACTIONS = 2000

const key = (c: Card) => `${c.rank}-${c.suit}`

function cardsIn(value: unknown, found: Card[] = []): Card[] {
  if (Array.isArray(value)) value.forEach((v) => cardsIn(v, found))
  else if (value && typeof value === 'object') {
    if ('rank' in value && 'suit' in value) found.push(value as Card)
    else Object.values(value).forEach((v) => cardsIn(v, found))
  }
  return found
}

function check(state: GameState, fail: (msg: string) => void) {
  const deck = new Set(createDeck().map(key))
  const dealt = state.round.dealt.flat().map(key)
  if (new Set(dealt).size !== 6 || !dealt.every((k) => deck.has(k))) fail('bad deal')

  const played = [state.round, state.previous]
    .flatMap((r) => r?.tricks ?? [])
    .flatMap((t) => t.cards)
    .filter((c): c is Card => c !== null)
    .map(key)
  for (let seat = 0; seat < state.seats; seat++) {
    const own = [...state.round.dealt[seat]!, ...(state.previous?.dealt[seat] ?? [])].map(key)
    const allowed = new Set([...own, ...played])
    for (const card of cardsIn(viewFor(state, seat)))
      if (!allowed.has(key(card))) fail(`seat ${seat} sees ${key(card)}`)
  }
}

describe('random games', () => {
  it(`${GAMES} games with random legal actions keep every invariant`, { timeout: 60_000 }, () => {
    const failures: string[] = []
    for (let g = 0; g < GAMES && failures.length === 0; g++) {
      const fail = (msg: string) => failures.push(`game ${g}: ${msg}`)
      let rand = g + 1
      const config = { flor: g % 2 === 0, target: g % 3 === 0 ? 30 : 15 } as const
      let state = createGame(config, rand)
      let actions = 0

      while (state.winner === null && failures.length === 0) {
        if (actions++ > MAX_ACTIONS) fail('never ends')
        check(state, fail)
        const seat = actorOf(state)!
        const legal = legalActions(state, seat)
        if (legal.length === 0) fail('no legal actions')
        const r = nextRandom(rand)
        rand = r.seed
        const result = applyAction(state, seat, legal[Math.floor(r.value * legal.length)]!)
        if (!result.ok) {
          fail(result.error)
          break
        }
        for (const event of result.events) {
          if (event.type !== 'play') continue
          if (!state.round.dealt[event.seat]!.some((c) => sameCard(c, event.card)))
            fail(`seat ${event.seat} played a card it did not have`)
          if (state.round.tricks.some((t) => t.cards.some((c) => c && sameCard(c, event.card))))
            fail('card played twice')
        }
        state = result.state
      }
      if (failures.length === 0 && Math.max(...state.scores) !== config.target)
        fail('bad final score')
    }
    expect(failures).toEqual([])
  })
})
