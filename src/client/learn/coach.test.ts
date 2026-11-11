import { describe, expect, it } from 'vitest'
import { seededRandom } from '../../bots/match.ts'
import type { Card } from '../../engine/cards.ts'
import {
  type GameState,
  actorOf,
  applyAction,
  createGame,
  legalActions,
  startRound,
  viewFor,
} from '../../engine/game.ts'
import { advise, envidoStakes, reviewRound } from './coach.ts'
import { sameAction } from './lesson.ts'

const c = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })

function setup(hands: Card[][], mano = 0): GameState {
  const state = createGame({ flor: false, target: 15 }, 1)
  state.scores = [0, 0]
  startRound(state, mano, hands)
  return state
}

const adviceFor = (state: GameState, seat = 0) =>
  advise(viewFor(state, seat), legalActions(state, seat))

describe('coach', () => {
  it('always suggests a legal move', () => {
    const random = seededRandom(3)
    for (let g = 0; g < 200; g++) {
      let state = createGame({ flor: g % 2 === 0, target: 15 }, g + 1)
      while (state.winner === null) {
        const seat = actorOf(state)!
        const legal = legalActions(state, seat)
        const advice = advise(viewFor(state, seat), legal)
        expect(advice && legal.some((a) => sameAction(a, advice.action))).toBe(true)
        // It has to fit in two lines above the hand.
        expect(advice!.say.length).toBeLessThanOrEqual(40)
        expect(advice!.why.length).toBeLessThanOrEqual(90)
        const pick = legal[Math.floor(random() * legal.length)]!
        const result = applyAction(state, seat, pick)
        if (!result.ok) throw new Error(result.error)
        state = result.state
      }
    }
  })

  it('calls envido with good points and explains why', () => {
    const advice = adviceFor(
      setup([
        [c(7, 'oro'), c(6, 'oro'), c(4, 'copa')],
        [c(4, 'basto'), c(5, 'copa'), c(6, 'espada')],
      ]),
    )
    expect(advice?.action).toEqual({ type: 'envido', call: 'envido' })
    expect(advice?.why).toContain('33')
  })

  it('wins the trick with the lowest card that is enough', () => {
    let state = setup([
      [c(4, 'oro'), c(5, 'copa'), c(6, 'basto')],
      [c(12, 'oro'), c(7, 'copa'), c(4, 'copa')],
    ])
    const played = applyAction(state, 0, { type: 'play', card: c(6, 'basto') })
    if (!played.ok) throw new Error(played.error)
    state = played.state
    state.round.envido.status = 'closed'
    expect(adviceFor(state, 1)?.action).toEqual({ type: 'play', card: c(7, 'copa') })
  })

  it('throws the lowest card when it cannot win', () => {
    let state = setup([
      [c(1, 'espada'), c(5, 'copa'), c(6, 'basto')],
      [c(4, 'oro'), c(7, 'copa'), c(12, 'oro')],
    ])
    const played = applyAction(state, 0, { type: 'play', card: c(1, 'espada') })
    if (!played.ok) throw new Error(played.error)
    state = played.state
    state.round.envido.status = 'closed'
    const advice = adviceFor(state, 1)
    expect(advice?.action).toEqual({ type: 'play', card: c(4, 'oro') })
    expect(advice?.why).toContain('No le ganás')
  })

  it('turns down a truco with a weak hand', () => {
    let state = setup(
      [
        [c(4, 'oro'), c(5, 'copa'), c(11, 'basto')],
        [c(1, 'espada'), c(7, 'oro'), c(3, 'copa')],
      ],
      1,
    )
    const called = applyAction(state, 1, { type: 'truco' })
    if (!called.ok) throw new Error(called.error)
    state = called.state
    expect(adviceFor(state)?.action).toEqual({ type: 'noQuiero' })
  })

  it('says the hand is lost when no card can save it', () => {
    let state = setup(
      [
        [c(6, 'copa'), c(11, 'espada'), c(10, 'espada')],
        [c(2, 'oro'), c(12, 'copa'), c(4, 'basto')],
      ],
      1,
    )
    state.round.envido.status = 'closed'
    for (const [seat, card] of [
      [1, c(2, 'oro')],
      [0, c(6, 'copa')],
      [1, c(12, 'copa')],
    ] as const) {
      const played = applyAction(state, seat, { type: 'play', card })
      if (!played.ok) throw new Error(played.error)
      state = played.state
    }
    const advice = adviceFor(state)
    expect(advice?.action).toEqual({ type: 'truco' })
    expect(advice?.say).toBe('Mentí: cantá truco.')
    expect(advice?.why).toContain('Si no lo quieren, sumás 1')

    state.round.truco.level = 4
    const noBluff = adviceFor(state)
    expect(noBluff?.action).toEqual({ type: 'mazo' })
    expect(noBluff?.why).toContain('perdida')
  })

  it('plays the last card without talking about saving cards', () => {
    let state = setup([
      [c(3, 'oro'), c(4, 'copa'), c(1, 'espada')],
      [c(4, 'basto'), c(7, 'oro'), c(6, 'copa')],
    ])
    state.round.envido.status = 'closed'
    for (const [seat, card] of [
      [0, c(3, 'oro')],
      [1, c(4, 'basto')],
      [0, c(4, 'copa')],
      [1, c(7, 'oro')],
      [1, c(6, 'copa')],
    ] as const) {
      const played = applyAction(state, seat, { type: 'play', card })
      if (!played.ok) throw new Error(played.error)
      state = played.state
    }
    state.round.truco.level = 4
    const advice = adviceFor(state)
    expect(advice?.action).toEqual({ type: 'play', card: c(1, 'espada') })
    expect(advice?.say).toBe('Tirá el 1 de espada.')
    expect(advice?.why).toBe('Es tu última carta.')
  })

  it('weighs an envido by what is at stake, not by a fixed number', () => {
    let state = setup([
      [c(7, 'oro'), c(1, 'oro'), c(4, 'copa')],
      [c(4, 'basto'), c(5, 'copa'), c(6, 'espada')],
    ])
    const called = applyAction(state, 0, { type: 'envido', call: 'envido' })
    if (!called.ok) throw new Error(called.error)
    state = called.state
    expect(adviceFor(state, 1)?.action.type).toBe('noQuiero')
    expect(envidoStakes(viewFor(state, 1))).toEqual({ accepted: 2, declined: 1 })

    const answer = (scores: number[]) => {
      const game = setup(
        [
          [c(7, 'oro'), c(2, 'oro'), c(1, 'copa')],
          [c(4, 'basto'), c(5, 'copa'), c(6, 'espada')],
        ],
        1,
      )
      game.scores = scores
      const call = applyAction(game, 1, { type: 'envido', call: 'envido' })
      if (!call.ok) throw new Error(call.error)
      return adviceFor(call.state, 0)
    }
    // 29 is worth accepting early in the game...
    expect(answer([0, 0])?.action.type).toBe('quiero')
    // ...but not when losing it hands the rival the game.
    const late = answer([3, 13])
    expect(late?.action.type).toBe('noQuiero')
    expect(late?.why).toContain('llega a 15')
  })

  it('counts a falta envido as what the leader is missing', () => {
    let state = setup([
      [c(7, 'oro'), c(6, 'oro'), c(4, 'copa')],
      [c(4, 'basto'), c(5, 'copa'), c(6, 'espada')],
    ])
    state.scores = [8, 12]
    const called = applyAction(state, 0, { type: 'envido', call: 'faltaEnvido' })
    if (!called.ok) throw new Error(called.error)
    state = called.state
    expect(envidoStakes(viewFor(state, 1))).toEqual({ accepted: 3, declined: 1 })
  })

  it('reviews one card choice after the round', () => {
    const round = (mine: Card[], theirs: Card[], moves: [number, number][]) => {
      let state = setup([mine, theirs], 1)
      state.round.envido.status = 'closed'
      for (const [seat, i] of moves) {
        const card = (seat === 0 ? mine : theirs)[i]!
        const played = applyAction(state, seat, { type: 'play', card })
        if (!played.ok) throw new Error(played.error)
        state = played.state
      }
      return state.previous!
    }
    // The ancho won the first, but the 3 was enough.
    const overkill = round(
      [c(1, 'espada'), c(3, 'copa'), c(4, 'oro')],
      [c(12, 'oro'), c(5, 'basto'), c(6, 'copa')],
      [
        [1, 0],
        [0, 0],
        [0, 2],
        [1, 1],
        [1, 2],
        [0, 1],
      ],
    )
    expect(reviewRound(overkill, 0, 1)).toBe(
      'Usaste el 1 de espada, pero el 3 de copa también ganaba y te guardabas el 1 de espada.',
    )
    // A trick thrown away with a winner in hand, and the round lost.
    const missed = round(
      [c(4, 'oro'), c(5, 'copa'), c(3, 'copa')],
      [c(12, 'oro'), c(1, 'espada'), c(7, 'espada')],
      [
        [1, 0],
        [0, 0],
        [1, 1],
        [0, 1],
      ],
    )
    expect(reviewRound(missed, 0, 1)).toBe(
      'Perdiste la primera con el 4 de oro, pero el 3 de copa le ganaba.',
    )
  })
})
