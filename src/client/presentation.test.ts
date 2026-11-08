import { describe, expect, it } from 'vitest'
import type { Card } from '../engine/cards.ts'
import {
  type GameEvent,
  type GameState,
  applyAction,
  createGame,
  startRound,
  viewFor,
} from '../engine/game.ts'
import { announce, stepView } from './presentation.ts'

const c = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })
const a = [c(1, 'espada'), c(7, 'espada'), c(4, 'oro')]
const b = [c(4, 'copa'), c(5, 'copa'), c(6, 'basto')]

function setup(): GameState {
  const state = createGame({ flor: false, target: 15 }, 1)
  state.scores = [0, 0]
  startRound(state, 0, [a, b])
  return state
}

function run(state: GameState, moves: [number, Parameters<typeof applyAction>[2]][]) {
  const events: GameEvent[] = []
  for (const [seat, action] of moves) {
    const result = applyAction(state, seat, action)
    if (!result.ok) throw new Error(result.error)
    state = result.state
    events.push(...result.events)
  }
  return { state, events }
}

function replay(start: GameState, end: GameState, events: GameEvent[], seat: number) {
  const final = viewFor(end, seat)
  return events.map((_, i) =>
    events.slice(0, i + 1).reduce((v, e) => stepView(v, e, final), viewFor(start, seat)),
  )
}

describe('stepping the view through events', () => {
  it('shows each card, the trick result and the score before the next round', () => {
    const start = setup()
    const { state, events } = run(start, [
      [0, { type: 'play', card: a[0]! }],
      [1, { type: 'play', card: b[0]! }],
      [0, { type: 'play', card: a[1]! }],
      [1, { type: 'play', card: b[1]! }],
    ])
    const views = replay(start, state, events, 0)
    const at = (type: string) => views[events.findIndex((e) => e.type === type)]!
    expect(at('trick').round.tricks[0]!.winner).toBe(0)
    const roundEnd = views[events.findIndex((e) => e.type === 'roundEnd')]!
    expect(roundEnd.round.tricks[1]!.cards).toEqual([a[1], b[1]])
    expect(roundEnd.scores).toEqual([1, 0])
    expect(views.at(-1)!.roundNumber).toBe(2)
    expect(views.at(-1)!.round.tricks[0]!.cards).toEqual([null, null])
  })

  it('shows the dealt round even when the game already moved past it', () => {
    const start = setup()
    // Seat 0 goes to the mazo twice: two rounds end before the screen catches up.
    const { state, events } = run(start, [
      [0, { type: 'mazo' }],
      [1, { type: 'mazo' }],
    ])
    expect(state.roundNumber).toBe(3)
    const views = replay(start, state, events, 0)
    const firstDeal = events.findIndex((e) => e.type === 'deal')
    expect(views[firstDeal]!.roundNumber).toBe(2)
    expect(views[firstDeal]!.round.mano).toBe(1)
    expect(views[firstDeal]!.round.tricks).toEqual([{ lead: 1, cards: [null, null], winner: null }])
    expect(views.at(-1)!.roundNumber).toBe(3)
  })
})

describe('announcements', () => {
  const names = ['Pedro', 'Bot medio']
  const banners = (events: GameEvent[]) =>
    events.map((e, i) => announce(e, names, 0, events.slice(0, i))).filter((a) => a !== null)

  it('marks tricks without a banner', () => {
    expect(announce({ type: 'trick', winner: 1 }, names, 0, [])).toBeNull()
    expect(announce({ type: 'trick', winner: 'parda' }, names, 0, [])).toBeNull()
  })

  it('sums up every point of the round in one banner', () => {
    // Bot calls truco, Pedro answers envido, the bot declines it and Pedro declines the truco.
    const start = setup()
    startRound(start, 1, [a, b])
    const { events } = run(start, [
      [1, { type: 'truco' }],
      [0, { type: 'envido', call: 'envido' }],
      [1, { type: 'noQuiero' }],
      [0, { type: 'noQuiero' }],
    ])
    const shown = banners(events.slice(0, events.findIndex((e) => e.type === 'roundEnd') + 1))
    const centre = shown.filter((b) => b.seat === null).map((b) => b.text)
    expect(centre).toEqual([
      'Sumás 1 punto por el envido',
      'Ronda para Bot medio\nVos +1 por el envido\nBot medio +1 por la ronda',
    ])
  })
})
