import {
  type Card,
  createDeck,
  envidoPoints,
  florPoints,
  hasFlor,
  sameCard,
} from '../engine/cards.ts'
import {
  type Action,
  type GameState,
  type GameView,
  actorOf,
  applyAction,
  legalActions,
  nextSeat,
  viewFor,
} from '../engine/game.ts'
import { config } from '../shared/config.ts'
import type { Bot } from './bot.ts'
import { mediumBot } from './medium.ts'

function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]]
  return items.flatMap((item, i) =>
    combinations(items.slice(i + 1), k - 1).map((rest) => [item, ...rest]),
  )
}

/**
 * Every hand the opponent could have been dealt given what this seat has seen:
 * the cards they played, the envido or flor points they announced (or the
 * "son buenas" that capped them) and whether they sang flor.
 */
export function possibleOpponentHands(view: GameView): Card[][] {
  const r = view.round
  const opponent = nextSeat(view, view.seat)
  const played = r.tricks.map((t) => t.cards[opponent]).filter((c): c is Card => c !== null)
  const seen = [...r.dealt[view.seat]!, ...played]
  const unseen = createDeck().filter((c) => !seen.some((s) => sameCard(s, c)))

  const limits = (kind: 'envido' | 'flor') => {
    const said = r.announced.filter((a) => a.kind === kind)
    const exact = said.find((a) => a.seat === opponent)?.points
    return { exact, max: exact === undefined ? said[0]?.points : undefined }
  }
  const envido = limits('envido')
  const flor = limits('flor')
  const sangFlor = r.flor.includes(opponent)
  const fits = (points: number, limit: { exact?: number; max?: number }) =>
    (limit.exact === undefined || points === limit.exact) &&
    (limit.max === undefined || points <= limit.max)

  return combinations(unseen, 3 - played.length)
    .map((rest) => [...played, ...rest])
    .filter(
      (hand) =>
        fits(envidoPoints(hand), envido) &&
        (!view.config.flor ||
          (hasFlor(hand) === sangFlor && (!sangFlor || fits(florPoints(hand), flor)))),
    )
}

function stateWith(view: GameView, opponentHand: Card[]): GameState {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { seat, round, previous, ...rest } = structuredClone(view)
  const dealt = round.dealt.map((hand) => hand ?? opponentHand)
  return { ...rest, seed: 0, previous: null, round: { ...round, dealt } }
}

/** Plays the rest of the round with both sides on the medium heuristics. */
function rollout(start: GameState, me: number, random: () => number): number {
  let state = start
  const round = state.roundNumber
  while (state.winner === null && state.roundNumber === round) {
    const seat = actorOf(state)!
    const action = mediumBot(viewFor(state, seat), legalActions(state, seat), random)
    const result = applyAction(state, seat, action)
    if (!result.ok) throw new Error(result.error)
    state = result.state
  }
  const opponent = nextSeat(state, me)
  const bonus = state.winner === me ? 30 : state.winner === opponent ? -30 : 0
  return state.scores[me]! - state.scores[opponent]! + bonus
}

/**
 * Determinization: samples opponent hands that match what it has seen, plays
 * each legal action out in every sample and keeps the one that scores best.
 */
export function createHardBot(samples: number = config.bot.hardSamples): Bot {
  return (view, legal, random) => {
    if (legal.length === 1) return legal[0]!
    const hands = possibleOpponentHands(view)
    const picked = Array.from(
      { length: samples },
      () => hands[Math.floor(random() * hands.length)]!,
    )
    let best: Action = legal[0]!
    let bestScore = -Infinity
    for (const action of legal) {
      let total = 0
      for (const hand of picked) {
        const result = applyAction(stateWith(view, hand), view.seat, action)
        if (!result.ok) throw new Error(result.error)
        total += rollout(result.state, view.seat, random)
      }
      if (total > bestScore) {
        bestScore = total
        best = action
      }
    }
    return best
  }
}

export const hardBot = createHardBot()
