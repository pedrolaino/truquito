import { describe, expect, it } from 'vitest'
import type { Card, Rank, Suit } from './cards.ts'
import {
  type Action,
  type GameConfig,
  type GameEvent,
  type GameState,
  actorOf,
  applyAction,
  createGame,
  legalActions,
  startRound,
  trucoWaitsForAFour,
  viewFor,
} from './game.ts'

const c = (rank: Rank, suit: Suit): Card => ({ rank, suit })
const play = (card: Card): Action => ({ type: 'play', card })
const ENVIDO: Action = { type: 'envido', call: 'envido' }
const REAL: Action = { type: 'envido', call: 'realEnvido' }
const FALTA: Action = { type: 'envido', call: 'faltaEnvido' }
const TRUCO: Action = { type: 'truco' }
const QUIERO: Action = { type: 'quiero' }
const NO_QUIERO: Action = { type: 'noQuiero' }
const MAZO: Action = { type: 'mazo' }

// Seat 0 is mano unless a test says otherwise.
function setup(
  hands: Card[][],
  opts: Partial<GameConfig> & { scores?: number[]; mano?: number } = {},
): GameState {
  const state = createGame({ flor: opts.flor ?? false, target: opts.target ?? 30 }, 1)
  state.scores = opts.scores ? [...opts.scores] : [0, 0]
  startRound(state, opts.mano ?? 0, hands)
  return state
}

class Game {
  events: GameEvent[] = []
  constructor(public state: GameState) {}
  do(seat: number, action: Action): this {
    const result = applyAction(this.state, seat, action)
    if (!result.ok) throw new Error(`${JSON.stringify(action)} by ${seat}: ${result.error}`)
    this.state = result.state
    this.events.push(...result.events)
    return this
  }
  // Plays the given cards in order, alternating with whoever has the turn.
  plays(...cards: Card[]): this {
    for (const card of cards) this.do(actorOf(this.state)!, play(card))
    return this
  }
  scored(reason?: string) {
    return this.events.filter(
      (e): e is Extract<GameEvent, { type: 'score' }> =>
        e.type === 'score' && (!reason || e.reason === reason),
    )
  }
}

const has = (state: GameState, seat: number, action: Action) =>
  legalActions(state, seat).some((a) => JSON.stringify(a) === JSON.stringify(action))

// Envido 30 (7 and 3 of oro) against 25 (5 and 12 of copa).
const manoHand = [c(7, 'oro'), c(3, 'oro'), c(4, 'basto')]
const pieHand = [c(5, 'copa'), c(12, 'copa'), c(6, 'espada')]

describe('dealing', () => {
  it('deals three cards each from a full deck', () => {
    const state = createGame({ flor: false, target: 15 }, 99)
    const cards = state.round.dealt.flat()
    expect(cards).toHaveLength(6)
    expect(new Set(cards.map((x) => `${x.rank}${x.suit}`)).size).toBe(6)
  })

  it('draws the first mano at random', () => {
    const manos = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map(
        (seed) => createGame({ flor: false, target: 15 }, seed).round.mano,
      ),
    )
    expect(manos).toEqual(new Set([0, 1]))
  })

  it('is reproducible from the seed', () => {
    expect(createGame({ flor: true, target: 30 }, 5)).toEqual(
      createGame({ flor: true, target: 30 }, 5),
    )
  })

  it('alternates the mano every round', () => {
    const g = new Game(setup([manoHand, pieHand])).do(0, MAZO)
    expect(g.state.round.mano).toBe(1)
    expect(actorOf(g.state)).toBe(1)
    g.do(1, MAZO)
    expect(g.state.round.mano).toBe(0)
  })
})

describe('tricks', () => {
  const a = [c(1, 'espada'), c(4, 'oro'), c(3, 'copa')]
  const b = [c(1, 'basto'), c(4, 'copa'), c(3, 'oro')]

  it('the mano plays first and the trick winner leads the next one', () => {
    const g = new Game(setup([a, b]))
    expect(actorOf(g.state)).toBe(0)
    g.plays(c(4, 'oro'), c(1, 'basto'))
    expect(actorOf(g.state)).toBe(1)
  })

  const x = [c(1, 'espada'), c(7, 'espada'), c(4, 'oro')]
  const y = [c(4, 'copa'), c(5, 'copa'), c(6, 'copa')]

  it('two tricks win the round', () => {
    const g = new Game(setup([x, y])).plays(
      c(1, 'espada'),
      c(4, 'copa'),
      c(7, 'espada'),
      c(5, 'copa'),
    )
    expect(g.scored('round')).toEqual([{ type: 'score', seat: 0, points: 1, reason: 'round' }])
  })

  it('the round ends as soon as it is decided', () => {
    const g = new Game(setup([x, y])).plays(
      c(1, 'espada'),
      c(4, 'copa'),
      c(7, 'espada'),
      c(5, 'copa'),
    )
    expect(g.state.roundNumber).toBe(2)
    expect(g.state.previous?.winner).toBe(0)
    expect(g.state.round.tricks).toEqual([{ lead: 1, cards: [null, null], winner: null }])
  })

  it('after a parda the mano leads', () => {
    const g = new Game(setup([a, b], { mano: 1 })).plays(c(4, 'copa'), c(4, 'oro'))
    expect(actorOf(g.state)).toBe(1)
  })

  it('parda first: the second trick decides', () => {
    const g = new Game(setup([a, b])).plays(c(4, 'oro'), c(4, 'copa'), c(3, 'copa'), c(1, 'basto'))
    expect(g.scored('round')[0]?.seat).toBe(1)
  })

  it('first won, second parda: the first trick winner takes it', () => {
    const g = new Game(setup([a, b])).plays(c(1, 'espada'), c(4, 'copa'), c(3, 'copa'), c(3, 'oro'))
    expect(g.scored('round')[0]?.seat).toBe(0)
    const h = new Game(setup([a, b])).plays(c(4, 'oro'), c(1, 'basto'), c(3, 'oro'), c(3, 'copa'))
    expect(h.scored('round')[0]?.seat).toBe(1)
  })

  it('two pardas: the third trick decides', () => {
    const g = new Game(setup([a, b])).plays(c(4, 'oro'), c(4, 'copa'), c(3, 'copa'), c(3, 'oro'))
    expect(g.state.roundNumber).toBe(1)
    g.plays(c(1, 'espada'), c(1, 'basto'))
    expect(g.scored('round')[0]?.seat).toBe(0)
  })

  it('three pardas: the mano wins', () => {
    const x = [c(4, 'oro'), c(3, 'copa'), c(12, 'oro')]
    const y = [c(4, 'copa'), c(3, 'oro'), c(12, 'copa')]
    const g = new Game(setup([x, y], { mano: 1 })).plays(c(4, 'copa'), c(4, 'oro'))
    g.plays(c(3, 'oro'), c(3, 'copa'), c(12, 'copa'), c(12, 'oro'))
    expect(g.scored('round')).toEqual([{ type: 'score', seat: 1, points: 1, reason: 'round' }])
  })

  it('one trick each and a parda in the third: the first trick winner takes it', () => {
    const x = [c(1, 'espada'), c(4, 'oro'), c(12, 'oro')]
    const y = [c(5, 'copa'), c(7, 'oro'), c(12, 'copa')]
    const g = new Game(setup([x, y], { mano: 1 })).plays(c(5, 'copa'), c(1, 'espada'))
    g.plays(c(4, 'oro'), c(7, 'oro'), c(12, 'copa'), c(12, 'oro'))
    expect(g.scored('round')[0]?.seat).toBe(0)
  })

  it('one trick each: the third trick decides', () => {
    const g = new Game(setup([a, b])).plays(c(1, 'espada'), c(4, 'copa'), c(4, 'oro'), c(3, 'oro'))
    g.plays(c(1, 'basto'), c(3, 'copa'))
    expect(g.scored('round')[0]?.seat).toBe(1)
  })

  it('rejects cards that are not in the hand', () => {
    const state = setup([a, b])
    expect(applyAction(state, 0, play(c(1, 'basto'))).ok).toBe(false)
    expect(applyAction(state, 1, play(c(1, 'basto'))).ok).toBe(false)
  })
})

describe('envido', () => {
  it('compares automatically: the mano announces first and the loser says son buenas', () => {
    const g = new Game(setup([manoHand, pieHand])).do(0, ENVIDO).do(1, QUIERO)
    const announced = g.events.filter((e) => e.type === 'points' || e.type === 'sonBuenas')
    expect(announced).toEqual([
      { type: 'points', kind: 'envido', seat: 0, points: 30 },
      { type: 'sonBuenas', seat: 1 },
    ])
    expect(g.scored('envido')).toEqual([{ type: 'score', seat: 0, points: 2, reason: 'envido' }])
  })

  it('shows the other points only when they beat the mano', () => {
    const g = new Game(setup([pieHand, manoHand])).do(0, ENVIDO).do(1, QUIERO)
    expect(g.state.round.announced).toEqual([
      { kind: 'envido', seat: 0, points: 25 },
      { kind: 'envido', seat: 1, points: 30 },
    ])
    expect(g.scored('envido')[0]?.seat).toBe(1)
  })

  it('the mano wins a tie', () => {
    const x = [c(7, 'oro'), c(3, 'oro'), c(4, 'basto')]
    const y = [c(7, 'copa'), c(3, 'copa'), c(4, 'espada')]
    const g = new Game(setup([x, y], { mano: 1 })).do(1, ENVIDO).do(0, QUIERO)
    expect(g.scored('envido')[0]?.seat).toBe(1)
    expect(g.state.round.announced).toEqual([{ kind: 'envido', seat: 1, points: 30 }])
  })

  it.each([
    [[ENVIDO], 2],
    [[REAL], 3],
    [[ENVIDO, ENVIDO], 4],
    [[ENVIDO, REAL], 5],
    [[ENVIDO, ENVIDO, REAL], 7],
  ])('accepted %j is worth %i', (calls, points) => {
    const g = new Game(setup([manoHand, pieHand]))
    calls.forEach((call, i) => g.do(i % 2, call))
    g.do(calls.length % 2, QUIERO)
    expect(g.scored('envido')).toEqual([{ type: 'score', seat: 0, points, reason: 'envido' }])
  })

  it.each([
    [[ENVIDO], 1],
    [[REAL], 1],
    [[FALTA], 1],
    [[ENVIDO, ENVIDO], 2],
    [[ENVIDO, REAL], 2],
    [[REAL, FALTA], 3],
    [[ENVIDO, ENVIDO, REAL], 4],
    [[ENVIDO, ENVIDO, FALTA], 4],
    [[ENVIDO, REAL, FALTA], 5],
    [[ENVIDO, ENVIDO, REAL, FALTA], 7],
  ])('declined %j gives %i to the last caller', (calls, points) => {
    const g = new Game(setup([manoHand, pieHand]))
    calls.forEach((call, i) => g.do(i % 2, call))
    const responder = calls.length % 2
    g.do(responder, NO_QUIERO)
    expect(g.scored('envido')).toEqual([
      { type: 'score', seat: 1 - responder, points, reason: 'envido' },
    ])
    expect(g.state.round.announced).toEqual([])
  })

  it('allows at most two envidos in a row', () => {
    const g = new Game(setup([manoHand, pieHand])).do(0, ENVIDO).do(1, ENVIDO)
    expect(has(g.state, 0, ENVIDO)).toBe(false)
    expect(has(g.state, 0, REAL)).toBe(true)
    expect(applyAction(g.state, 0, ENVIDO).ok).toBe(false)
  })

  it('after real envido only falta envido can follow', () => {
    const g = new Game(setup([manoHand, pieHand])).do(0, REAL)
    expect(legalActions(g.state, 1)).toEqual([QUIERO, NO_QUIERO, FALTA, MAZO])
  })

  it('after falta envido only quiero or no quiero', () => {
    const g = new Game(setup([manoHand, pieHand])).do(0, ENVIDO).do(1, FALTA)
    expect(legalActions(g.state, 0)).toEqual([QUIERO, NO_QUIERO, MAZO])
  })

  it('only the responder can answer', () => {
    const g = new Game(setup([manoHand, pieHand])).do(0, ENVIDO)
    expect(legalActions(g.state, 0)).toEqual([])
    expect(applyAction(g.state, 0, QUIERO).ok).toBe(false)
  })

  it('no cards are played while it is pending', () => {
    const g = new Game(setup([manoHand, pieHand])).do(0, ENVIDO)
    expect(applyAction(g.state, 1, play(pieHand[0]!)).ok).toBe(false)
  })

  it('can be called only once per round', () => {
    const g = new Game(setup([manoHand, pieHand])).do(0, ENVIDO).do(1, NO_QUIERO)
    expect(has(g.state, 0, ENVIDO)).toBe(false)
    g.plays(manoHand[2]!)
    expect(has(g.state, 1, ENVIDO)).toBe(false)
  })

  it('each player can call it only before playing their first card', () => {
    const g = new Game(setup([manoHand, pieHand])).plays(manoHand[2]!)
    expect(has(g.state, 1, ENVIDO)).toBe(true)
    g.do(1, ENVIDO).do(0, QUIERO).plays(pieHand[2]!)
    expect(g.scored('envido')[0]?.seat).toBe(0)
  })

  it('cannot be called after the first trick', () => {
    const g = new Game(setup([manoHand, pieHand])).plays(manoHand[2]!, pieHand[0]!)
    expect(has(g.state, 1, ENVIDO)).toBe(false)
    expect(has(g.state, 1, REAL)).toBe(false)
  })

  it('mano that already played cannot call it', () => {
    const g = new Game(setup([manoHand, pieHand])).plays(manoHand[1]!).do(1, TRUCO)
    expect(has(g.state, 0, ENVIDO)).toBe(false)
  })

  it('el envido está primero: answering truco with envido, then the truco', () => {
    const g = new Game(setup([manoHand, pieHand])).do(0, TRUCO)
    expect(has(g.state, 1, ENVIDO)).toBe(true)
    g.do(1, ENVIDO).do(0, QUIERO)
    expect(g.scored('envido')[0]).toEqual({ type: 'score', seat: 0, points: 2, reason: 'envido' })
    expect(actorOf(g.state)).toBe(1)
    expect(legalActions(g.state, 1)).toEqual([QUIERO, NO_QUIERO, TRUCO, MAZO])
    g.do(1, QUIERO)
    expect(g.state.round.truco.level).toBe(2)
    expect(actorOf(g.state)).toBe(0)
  })

  it('is closed once the truco is accepted', () => {
    const g = new Game(setup([manoHand, pieHand])).do(0, TRUCO).do(1, QUIERO)
    expect(has(g.state, 0, ENVIDO)).toBe(false)
  })

  it('cannot answer a retruco', () => {
    const g = new Game(setup([manoHand, pieHand])).do(0, TRUCO).do(1, TRUCO)
    expect(has(g.state, 0, ENVIDO)).toBe(false)
  })

  describe('falta envido', () => {
    it('is worth what the leader needs to finish', () => {
      const g = new Game(setup([manoHand, pieHand], { target: 15, scores: [4, 10] }))
      g.do(0, FALTA).do(1, QUIERO)
      expect(g.scored('envido')).toEqual([{ type: 'score', seat: 0, points: 5, reason: 'envido' }])
    })

    it('when tied it is what either one needs', () => {
      const g = new Game(setup([manoHand, pieHand], { target: 30, scores: [12, 12] }))
      g.do(0, ENVIDO).do(1, FALTA).do(0, QUIERO)
      expect(g.scored('envido')).toEqual([{ type: 'score', seat: 0, points: 18, reason: 'envido' }])
    })

    it('replaces the previous calls when accepted', () => {
      const g = new Game(setup([manoHand, pieHand], { target: 30, scores: [20, 5] }))
      g.do(0, ENVIDO).do(1, ENVIDO).do(0, FALTA).do(1, QUIERO)
      expect(g.scored('envido')).toEqual([{ type: 'score', seat: 0, points: 10, reason: 'envido' }])
    })
  })
})

describe('flor', () => {
  const flor = [c(7, 'copa'), c(5, 'copa'), c(1, 'copa')]
  const flor2 = [c(6, 'basto'), c(4, 'basto'), c(2, 'basto')]

  it('is sung automatically and scores 3 for a single flor', () => {
    const state = setup([manoHand, flor], { flor: true })
    expect(state.round.flor).toEqual([1])
    expect(state.scores).toEqual([0, 3])
  })

  it('disables the envido for that round', () => {
    const state = setup([manoHand, flor], { flor: true })
    expect(has(state, 0, ENVIDO)).toBe(false)
    expect(has(state, 0, TRUCO)).toBe(true)
  })

  it('with two flores the higher one scores 6', () => {
    const state = setup([flor2, flor], { flor: true })
    expect(state.round.announced).toEqual([
      { kind: 'flor', seat: 0, points: 32 },
      { kind: 'flor', seat: 1, points: 33 },
    ])
    expect(state.scores).toEqual([0, 6])
  })

  it('with equal flores the mano wins', () => {
    const tie = [c(6, 'oro'), c(4, 'oro'), c(3, 'oro')]
    const state = setup([tie, flor], { flor: true, mano: 0 })
    expect(state.scores).toEqual([6, 0])
    expect(state.round.announced).toEqual([{ kind: 'flor', seat: 0, points: 33 }])
  })

  it('does not exist when the room plays without flor', () => {
    const state = setup([manoHand, flor], { flor: false })
    expect(state.round.flor).toEqual([])
    expect(state.scores).toEqual([0, 0])
    expect(has(state, 0, ENVIDO)).toBe(true)
  })

  it('can end the game when it is dealt', () => {
    const state = setup([manoHand, flor], { flor: true, target: 15, scores: [0, 13] })
    expect(state.winner).toBe(1)
    expect(legalActions(state, 0)).toEqual([])
  })
})

describe('truco', () => {
  const a = [c(1, 'espada'), c(1, 'basto'), c(4, 'copa')]
  const b = [c(4, 'oro'), c(5, 'oro'), c(6, 'copa')]

  it('accepted makes the round worth 2', () => {
    const g = new Game(setup([a, b])).do(0, TRUCO).do(1, QUIERO).plays(a[0]!, b[0]!, a[1]!, b[1]!)
    expect(g.scored('round')).toEqual([{ type: 'score', seat: 0, points: 2, reason: 'round' }])
  })

  it.each([
    [1, 1],
    [2, 2],
    [3, 3],
  ])('declined after %i calls gives the caller %i', (calls, points) => {
    const g = new Game(setup([a, b]))
    for (let i = 0; i < calls; i++) g.do(i % 2, TRUCO)
    const responder = calls % 2
    g.do(responder, NO_QUIERO)
    expect(g.scored('round')).toEqual([
      { type: 'score', seat: 1 - responder, points, reason: 'round' },
    ])
    expect(g.state.roundNumber).toBe(2)
  })

  it('vale cuatro accepted is worth 4 and cannot be raised', () => {
    const g = new Game(setup([a, b])).do(0, TRUCO).do(1, TRUCO).do(0, TRUCO)
    expect(has(g.state, 1, TRUCO)).toBe(false)
    g.do(1, QUIERO).plays(a[0]!, b[0]!, a[1]!, b[1]!)
    expect(g.scored('round')[0]?.points).toBe(4)
  })

  it('announces truco, retruco and vale cuatro', () => {
    const g = new Game(setup([a, b])).do(0, TRUCO).do(1, TRUCO).do(0, TRUCO)
    expect(g.events.filter((e) => e.type === 'call')).toEqual([
      { type: 'call', seat: 0, call: 'truco' },
      { type: 'call', seat: 1, call: 'retruco' },
      { type: 'call', seat: 0, call: 'valeCuatro' },
    ])
  })

  it('cannot be called or raised on a 4 until you play', () => {
    const g = new Game(setup([a, b])).plays(a[2]!)
    expect(has(g.state, 1, TRUCO)).toBe(false)
    expect(trucoWaitsForAFour(g.state, 1)).toBe(true)
    expect(applyAction(g.state, 1, TRUCO).ok).toBe(false)
    g.plays(b[1]!)
    expect(has(g.state, 1, TRUCO)).toBe(true)
    expect(trucoWaitsForAFour(g.state, 1)).toBe(false)

    const raised = new Game(setup([a, b])).do(0, TRUCO).do(1, QUIERO).plays(a[2]!)
    expect(has(raised.state, 1, TRUCO)).toBe(false)
  })

  it('only the player with the quiero can raise', () => {
    const g = new Game(setup([a, b])).do(0, TRUCO).do(1, QUIERO)
    expect(has(g.state, 0, TRUCO)).toBe(false)
    g.plays(a[0]!)
    expect(has(g.state, 1, TRUCO)).toBe(true)
    g.do(1, TRUCO)
    expect(g.events.at(-1)).toEqual({ type: 'call', seat: 1, call: 'retruco' })
    g.do(0, QUIERO)
    expect(has(g.state, 1, TRUCO)).toBe(false)
  })

  it('cannot be called while waiting for an answer', () => {
    const g = new Game(setup([a, b])).do(0, TRUCO)
    expect(legalActions(g.state, 0)).toEqual([])
  })

  it('no cards are played while it is pending', () => {
    const g = new Game(setup([a, b])).do(0, TRUCO)
    expect(legalActions(g.state, 1).some((x) => x.type === 'play')).toBe(false)
  })

  it('the turn goes back to whoever was playing', () => {
    const g = new Game(setup([a, b])).plays(a[0]!).do(1, TRUCO).do(0, QUIERO)
    expect(actorOf(g.state)).toBe(1)
  })
})

describe('irse al mazo', () => {
  const a = [c(1, 'espada'), c(1, 'basto'), c(4, 'copa')]
  const b = [c(4, 'oro'), c(5, 'oro'), c(6, 'copa')]

  it('gives 1 when there is no truco', () => {
    const g = new Game(setup([a, b])).do(0, MAZO)
    expect(g.scored()).toEqual([{ type: 'score', seat: 1, points: 1, reason: 'round' }])
  })

  it('gives the accepted truco value', () => {
    const g = new Game(setup([a, b])).do(0, TRUCO).do(1, QUIERO).do(0, MAZO)
    expect(g.scored()).toEqual([{ type: 'score', seat: 1, points: 2, reason: 'round' }])
  })

  it('instead of answering truco counts it as not accepted', () => {
    const g = new Game(setup([a, b])).do(0, TRUCO).do(1, MAZO)
    expect(g.scored()).toEqual([{ type: 'score', seat: 0, points: 1, reason: 'round' }])
  })

  it('instead of answering an envido counts it as not accepted', () => {
    const g = new Game(setup([a, b])).do(0, ENVIDO).do(1, REAL).do(0, MAZO)
    expect(g.scored()).toEqual([
      { type: 'score', seat: 1, points: 2, reason: 'envido' },
      { type: 'score', seat: 1, points: 1, reason: 'round' },
    ])
  })

  it('with envido and truco pending counts both as not accepted', () => {
    const g = new Game(setup([a, b])).do(0, TRUCO).do(1, ENVIDO).do(0, MAZO)
    expect(g.scored()).toEqual([
      { type: 'score', seat: 1, points: 1, reason: 'envido' },
      { type: 'score', seat: 1, points: 1, reason: 'round' },
    ])
  })

  it('is only allowed on your turn or to answer', () => {
    const state = setup([a, b])
    expect(applyAction(state, 1, MAZO).ok).toBe(false)
  })
})

describe('end of the game', () => {
  it('ends in the middle of a round when the target is reached', () => {
    const g = new Game(setup([manoHand, pieHand], { target: 15, scores: [13, 0] }))
    g.do(0, ENVIDO).do(1, QUIERO)
    expect(g.state.scores).toEqual([15, 0])
    expect(g.state.winner).toBe(0)
    expect(g.events.at(-1)).toEqual({ type: 'gameEnd', winner: 0 })
    expect(actorOf(g.state)).toBe(null)
    expect(legalActions(g.state, 0)).toEqual([])
    expect(legalActions(g.state, 1)).toEqual([])
    expect(g.state.roundNumber).toBe(1)
  })

  it('does not score the round after the envido ended the game', () => {
    const g = new Game(setup([manoHand, pieHand], { target: 15, scores: [0, 14] }))
    g.do(0, ENVIDO).do(1, REAL).do(0, MAZO)
    expect(g.state.scores).toEqual([0, 15])
    expect(g.scored()).toHaveLength(1)
    expect(g.events.some((e) => e.type === 'roundEnd')).toBe(false)
  })

  it('caps the score at the target', () => {
    const g = new Game(setup([manoHand, pieHand], { target: 15, scores: [14, 0] }))
    g.do(0, ENVIDO).do(1, QUIERO)
    expect(g.state.scores[0]).toBe(15)
  })
})

describe('seat view', () => {
  it('hides the other hands and the seed', () => {
    const state = setup([manoHand, pieHand])
    const view = viewFor(state, 0)
    expect(view.round.dealt).toEqual([manoHand, null])
    expect(JSON.stringify(view)).not.toContain('"seed"')
    for (const card of pieHand) expect(JSON.stringify(view)).not.toContain(JSON.stringify(card))
  })

  it('shows the cards once played', () => {
    const g = new Game(setup([manoHand, pieHand])).plays(manoHand[0]!)
    expect(viewFor(g.state, 1).round.tricks[0]?.cards[0]).toEqual(manoHand[0])
  })
})
