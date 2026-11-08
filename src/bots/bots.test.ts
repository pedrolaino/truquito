import { describe, expect, it } from 'vitest'
import {
  type Card,
  type Rank,
  type Suit,
  envidoPoints,
  hasFlor,
  sameCard,
} from '../engine/cards.ts'
import {
  type Action,
  type GameState,
  actorOf,
  applyAction,
  createGame,
  legalActions,
  startRound,
  viewFor,
} from '../engine/game.ts'
import { easyBot } from './easy.ts'
import { createHardBot, possibleOpponentHands } from './hard.ts'
import { bots, thinkingTime } from './index.ts'
import { seededRandom, winRate } from './match.ts'
import { mediumBot } from './medium.ts'

const c = (rank: Rank, suit: Suit): Card => ({ rank, suit })

function setup(hands: Card[][], flor = false): GameState {
  const state = createGame({ flor, target: 30 }, 1)
  state.scores = [0, 0]
  startRound(state, 0, hands)
  return state
}

function act(state: GameState, seat: number, action: Action): GameState {
  const result = applyAction(state, seat, action)
  if (!result.ok) throw new Error(result.error)
  return result.state
}

describe('every bot', () => {
  it.each(Object.entries(bots))('%s only picks legal actions', (_, bot) => {
    const random = seededRandom(7)
    for (let g = 0; g < 5; g++) {
      let state = createGame({ flor: g % 2 === 0, target: 15 }, g)
      while (state.winner === null) {
        const seat = actorOf(state)!
        const legal = legalActions(state, seat)
        const action = bot(viewFor(state, seat), legal, random)
        expect(legal).toContainEqual(action)
        state = act(state, seat, action)
      }
    }
  })

  it('waits a human-like time', () => {
    expect(thinkingTime(() => 0)).toBe(600)
    expect(thinkingTime(() => 0.999)).toBeLessThan(1400)
  })
})

describe('easy bot', () => {
  it('wants the envido only with 27 or more', () => {
    const weak = [c(4, 'oro'), c(5, 'copa'), c(6, 'basto')]
    const strong = [c(7, 'oro'), c(6, 'oro'), c(1, 'copa')]
    const envido: Action = { type: 'envido', call: 'envido' }
    const s = act(setup([weak, strong]), 0, envido)
    expect(easyBot(viewFor(s, 1), legalActions(s, 1), () => 0.1)).toEqual({ type: 'quiero' })
    const t = act(setup([strong, weak]), 0, envido)
    expect(easyBot(viewFor(t, 1), legalActions(t, 1), () => 0.1)).toEqual({ type: 'noQuiero' })
  })
})

describe('medium bot', () => {
  it('wins the trick with the lowest card that is enough', () => {
    let s = setup([
      [c(4, 'oro'), c(5, 'copa'), c(6, 'basto')],
      [c(12, 'oro'), c(7, 'copa'), c(4, 'copa')],
    ])
    s = act(s, 0, { type: 'play', card: c(6, 'basto') })
    s.round.envido.status = 'closed'
    const action = mediumBot(viewFor(s, 1), legalActions(s, 1), () => 0.99)
    expect(action).toEqual({ type: 'play', card: c(7, 'copa') })
  })

  it('throws its lowest card when it cannot win', () => {
    let s = setup([
      [c(1, 'espada'), c(5, 'copa'), c(6, 'basto')],
      [c(4, 'oro'), c(7, 'copa'), c(3, 'oro')],
    ])
    s = act(s, 0, { type: 'play', card: c(1, 'espada') })
    s.round.envido.status = 'closed'
    const action = mediumBot(viewFor(s, 1), legalActions(s, 1), () => 0.99)
    expect(action).toEqual({ type: 'play', card: c(4, 'oro') })
  })

  it('calls envido with good points', () => {
    const s = setup([
      [c(7, 'oro'), c(6, 'oro'), c(4, 'copa')],
      [c(4, 'basto'), c(5, 'copa'), c(6, 'espada')],
    ])
    expect(mediumBot(viewFor(s, 0), legalActions(s, 0), () => 0.99)).toEqual({
      type: 'envido',
      call: 'realEnvido',
    })
  })
})

describe('hard bot', () => {
  it('only imagines opponent hands that match the announced envido', () => {
    let s = setup([
      [c(4, 'oro'), c(5, 'copa'), c(6, 'basto')],
      [c(7, 'oro'), c(6, 'oro'), c(1, 'copa')],
    ])
    s = act(s, 0, { type: 'envido', call: 'envido' })
    s = act(s, 1, { type: 'quiero' })
    const hands = possibleOpponentHands(viewFor(s, 0))
    expect(hands.length).toBeGreaterThan(0)
    expect(hands.every((h) => envidoPoints(h) === 33)).toBe(true)
    expect(hands.some((h) => h.some((card) => sameCard(card, c(6, 'basto'))))).toBe(false)
  })

  it('caps the opponent envido after son buenas', () => {
    let s = setup([
      [c(7, 'oro'), c(3, 'oro'), c(1, 'copa')],
      [c(4, 'basto'), c(5, 'copa'), c(6, 'espada')],
    ])
    s = act(s, 0, { type: 'envido', call: 'envido' })
    s = act(s, 1, { type: 'quiero' })
    const hands = possibleOpponentHands(viewFor(s, 0))
    expect(hands.every((h) => envidoPoints(h) <= 30)).toBe(true)
  })

  it('knows whether the opponent had flor', () => {
    const s = setup(
      [
        [c(4, 'oro'), c(5, 'copa'), c(6, 'basto')],
        [c(7, 'copa'), c(6, 'copa'), c(1, 'copa')],
      ],
      true,
    )
    expect(possibleOpponentHands(viewFor(s, 0)).every(hasFlor)).toBe(true)
    expect(possibleOpponentHands(viewFor(s, 1)).some(hasFlor)).toBe(false)
  })

  it('includes the cards the opponent already played', () => {
    let s = setup([
      [c(4, 'oro'), c(5, 'copa'), c(6, 'basto')],
      [c(7, 'copa'), c(6, 'espada'), c(1, 'copa')],
    ])
    s = act(s, 0, { type: 'play', card: c(4, 'oro') })
    const hands = possibleOpponentHands(viewFor(s, 1))
    expect(hands.every((h) => h.some((card) => sameCard(card, c(4, 'oro'))))).toBe(true)
  })
})

describe('hard bot against people who accept', () => {
  it('does not risk a falta envido with poor points', () => {
    const poor = [c(7, 'espada'), c(4, 'copa'), c(10, 'oro')]
    const other = [c(5, 'basto'), c(6, 'oro'), c(11, 'copa')]
    const game = createGame({ flor: false, target: 15 }, 1)
    game.scores = [0, 0]
    startRound(game, 0, [poor, other])
    const bot = createHardBot(40)
    for (let seed = 1; seed <= 10; seed++) {
      const action = bot(viewFor(game, 0), legalActions(game, 0), seededRandom(seed))
      expect(action).not.toEqual({ type: 'envido', call: 'faltaEnvido' })
    }
  })
})

describe('levels', () => {
  const game = { flor: false, target: 15 } as const

  it('medium beats easy', () => {
    expect(winRate(mediumBot, easyBot, 200, 1, game)).toBeGreaterThan(0.6)
  })

  it('hard beats medium', { timeout: 120_000 }, () => {
    expect(winRate(createHardBot(20), mediumBot, 40, 1, game)).toBeGreaterThan(0.55)
  })
})
