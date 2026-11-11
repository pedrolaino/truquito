import { fitsWhatTheySaid, winChance } from '../../bots/estimate.ts'
import { seededRandom } from '../../bots/match.ts'
import { type Card, cardPower, createDeck, envidoPoints, sameCard } from '../../engine/cards.ts'
import {
  type Action,
  type EnvidoCall,
  type GameView,
  type RoundView,
  type Trick,
  handOf,
  nextSeat,
  roundWinner,
} from '../../engine/game.ts'
import { cardName } from '../text.ts'

/** What a piece of advice is about, to point the learner to the right lesson. */
export type Topic = 'cartas' | 'truco' | 'envido'

export interface Advice {
  action: Action
  /** What to do, in a few words. */
  say: string
  /** Why, in one line, shown when the learner asks. */
  why: string
  topic: Topic
}

const has = (legal: Action[], action: Action) =>
  legal.some(
    (a) =>
      a.type === action.type &&
      (a.type !== 'envido' || (action.type === 'envido' && a.call === action.call)),
  )

const RAISES = { 1: 'truco', 2: 'retruco', 3: 'vale cuatro' } as const
const ORDINALS = ['la primera', 'la segunda', 'la tercera']
const tenths = (chance: number) => Math.round(chance * 10)

/** Whether every card in hand loses the round once the rival's card is on the table. */
function handIsLost(view: GameView): boolean {
  const r = view.round
  const me = view.seat
  const rival = nextSeat(view, me)
  const theirs = r.tricks.at(-1)!.cards[rival]
  if (!theirs) return false
  return handOf(r, me).every((card) => {
    const diff = cardPower(card) - cardPower(theirs)
    const winner: Trick['winner'] = diff > 0 ? me : diff < 0 ? rival : 'parda'
    const tricks = [...r.tricks.slice(0, -1), { ...r.tricks.at(-1)!, winner }]
    return roundWinner({ tricks, mano: r.mano }) === rival
  })
}

/** Nothing in hand saves the round: bluff a raise so the rival gives it up, or leave. */
function lostAdvice(view: GameView, legal: Action[]): Advice | null {
  const level = view.round.truco.level
  if (has(legal, { type: 'truco' }) && level < 4)
    return {
      action: { type: 'truco' },
      say: `Mentí: cantá ${RAISES[level as 1 | 2 | 3]}.`,
      why: `Con ninguna carta ganás la mano. Si no lo quieren, sumás ${level}. Si no, andate al mazo.`,
      topic: 'truco',
    }
  if (!has(legal, { type: 'mazo' })) return null
  return {
    action: { type: 'mazo' },
    say: 'Andate al mazo.',
    why: 'No le ganás con ninguna: la mano está perdida.',
    topic: 'truco',
  }
}

/** The card to play now and why, as an average player would think it. */
function cardAdvice(view: GameView): Advice {
  const r = view.round
  const me = view.seat
  const theirs = r.tricks.at(-1)!.cards[nextSeat(view, me)]
  const sorted = handOf(r, me).sort((a, b) => cardPower(a) - cardPower(b))
  const play = (card: Card, say: string, why: string): Advice => ({
    action: { type: 'play', card },
    say,
    why,
    topic: 'cartas',
  })

  if (sorted.length === 1)
    return play(sorted[0]!, `Tirá el ${cardName(sorted[0]!)}.`, 'Es tu última carta.')
  if (theirs) {
    const beat = sorted.find((c) => cardPower(c) > cardPower(theirs))
    if (beat)
      return play(
        beat,
        `Ganale con el ${cardName(beat)}.`,
        'Es la más baja que le gana: guardás las otras para después.',
      )
    const tie = sorted.find((c) => cardPower(c) === cardPower(theirs))
    const won = r.tricks.findIndex((t) => t.winner === me)
    if (tie && won !== -1)
      return play(
        tie,
        `Empardá con el ${cardName(tie)}.`,
        `Ganaste ${ORDINALS[won]}: si empardás esta, la mano es tuya.`,
      )
    return play(
      sorted[0]!,
      `Tirá el ${cardName(sorted[0]!)}.`,
      'No le ganás con ninguna: tirá la más baja y guardá las buenas.',
    )
  }
  if (r.tricks.length === 1 && sorted.length === 3)
    return play(
      sorted[1]!,
      `Arrancá con el ${cardName(sorted[1]!)}.`,
      'Es tu carta del medio: guardás la mejor para después.',
    )
  const best = sorted.at(-1)!
  return play(best, `Jugá el ${cardName(best)}.`, 'Es tu carta más fuerte: te llevás esta baza.')
}

/**
 * Chance that this seat's envido beats the opponent's, dealing them hands that
 * fit what this seat has seen. A tie goes to the mano. Someone who called the
 * envido usually has the points for it, so those hands weigh more.
 */
export function envidoChance(view: GameView, random: () => number, samples = 60): number {
  const r = view.round
  const me = view.seat
  const rival = nextSeat(view, me)
  const mine = envidoPoints(r.dealt[me]!)
  const played = r.tricks.map((t) => t.cards[rival]).filter((c): c is Card => c !== null)
  const seen = [...r.dealt[me]!, ...played]
  const unseen = createDeck().filter((c) => !seen.some((s) => sameCard(s, c)))
  const theyCalled = r.envido.caller === rival
  const likely = (hand: Card[]) =>
    fitsWhatTheySaid(view, hand) && (!theyCalled || envidoPoints(hand) >= 27 || random() < 0.15)
  let wins = 0
  for (let i = 0; i < samples; i++) {
    let hand: Card[] = []
    for (let tries = 0; tries < 8; tries++) {
      const pool = [...unseen]
      const rest = Array.from(
        { length: 3 - played.length },
        () => pool.splice(Math.floor(random() * pool.length), 1)[0]!,
      )
      hand = [...played, ...rest]
      if (likely(hand)) break
    }
    const theirs = envidoPoints(hand)
    if (mine > theirs || (mine === theirs && r.mano === me)) wins++
  }
  return wins / samples
}

/** What a pending envido is worth if accepted, and what the caller gets if it is turned down. */
export function envidoStakes(view: GameView): { accepted: number; declined: number } {
  const value = (call: EnvidoCall) =>
    call === 'faltaEnvido'
      ? view.config.target - Math.max(...view.scores)
      : call === 'envido'
        ? 2
        : 3
  const calls = view.round.envido.calls
  const sum = (list: EnvidoCall[]) => list.reduce((total, call) => total + value(call), 0)
  return {
    accepted: calls.includes('faltaEnvido') ? value('faltaEnvido') : sum(calls),
    declined: calls.length <= 1 ? 1 : sum(calls.slice(0, -1)),
  }
}

/** Accept or turn down an envido, weighing the chance of winning it against what is at stake. */
function answerEnvido(view: GameView, chance: number, points: number): Advice {
  const { accepted, declined } = envidoStakes(view)
  const me = view.seat
  const target = view.config.target
  const theirScore = view.scores[nextSeat(view, me)]!
  const n = tenths(chance)
  const mano = view.round.mano === me ? ' y siendo mano' : ''
  // Losing it would end the game: only accept when it is very likely to win.
  const fatal = theirScore + accepted >= target && theirScore + declined < target
  const winsGame = view.scores[me]! + accepted >= target
  const worth = (2 * chance - 1) * accepted > -declined
  const accept = fatal ? chance >= 0.8 : worth || (winsGame && chance >= 0.5)
  return accept
    ? {
        action: { type: 'quiero' },
        say: 'Querelo.',
        why: `Con ${points}${mano} ganás ${n} de cada 10. Se juegan ${accepted}.`,
        topic: 'envido',
      }
    : {
        action: { type: 'noQuiero' },
        say: 'No lo quieras.',
        why: fatal
          ? `Con ${points} ganás ${n} de cada 10, y si lo perdés el rival llega a ${target}.`
          : `Con ${points} ganás ${n} de cada 10. Si no lo querés, el rival se lleva ${declined} y no ${accepted}.`,
        topic: 'envido',
      }
}

/**
 * What a learner could do now: a short instruction and a one-line reason. It
 * sees only the seat's view, like the bots, and bluffs only when the hand is lost.
 */
export function advise(view: GameView, legal: Action[]): Advice | null {
  if (legal.length === 0) return null
  const r = view.round
  const points = envidoPoints(r.dealt[view.seat]!)
  // A fixed seed keeps the advice the same while the learner looks at it.
  const strength = winChance(view, seededRandom(1), 40)
  const envido: Action = { type: 'envido', call: 'envido' }
  const envidoOdds = () => envidoChance(view, seededRandom(2))

  if (r.envido.status === 'pending') return answerEnvido(view, envidoOdds(), points)

  if (r.truco.pending) {
    const level = r.truco.pending.level
    const n = tenths(strength)
    if (has(legal, envido)) {
      const chance = envidoOdds()
      if (chance >= 0.65)
        return {
          action: envido,
          say: 'Cantá envido primero.',
          why: `El envido va antes que el truco: con ${points} ganás ${tenths(chance)} de cada 10.`,
          topic: 'envido',
        }
    }
    if (strength > 0.8 && has(legal, { type: 'truco' }))
      return {
        action: { type: 'truco' },
        say: `Querelo y cantá ${RAISES[level as 1 | 2 | 3]}.`,
        why: `Ganás ${n} de cada 10 manos así: subí y la mano vale ${level + 1}.`,
        topic: 'truco',
      }
    return strength > 0.45
      ? {
          action: { type: 'quiero' },
          say: 'Querelo.',
          why: `Con lo que hay en la mesa ganás ${n} de cada 10. Se juega por ${level}.`,
          topic: 'truco',
        }
      : {
          action: { type: 'noQuiero' },
          say: 'No lo quieras.',
          why: `Ganás ${n} de cada 10. Si no lo querés perdés ${level - 1}, y no ${level}.`,
          topic: 'truco',
        }
  }

  if (has(legal, envido)) {
    const chance = envidoOdds()
    if (chance >= 0.65)
      return {
        action: envido,
        say: 'Cantá envido.',
        why: `Tenés ${points}${r.mano === view.seat ? ' y sos mano' : ''}: ganás ${tenths(chance)} de cada 10 envidos.`,
        topic: 'envido',
      }
  }
  if (handIsLost(view)) {
    const lost = lostAdvice(view, legal)
    if (lost) return lost
  }
  if (strength > 0.75 && has(legal, { type: 'truco' })) {
    const level = r.truco.level
    return {
      action: { type: 'truco' },
      say: `Cantá ${RAISES[level as 1 | 2 | 3]}.`,
      why: `Ganás ${tenths(strength)} de cada 10 manos así. Si lo quieren, vale ${level + 1}.`,
      topic: 'truco',
    }
  }
  return cardAdvice(view)
}

/**
 * One useful remark about the learner's cards in a finished round, or null.
 * A trick lost with a card in hand that won comes first, then a trick won with
 * a stronger card than needed.
 */
export function reviewRound(round: RoundView, seat: number, rival: number): string | null {
  const used: Card[] = []
  let overkill: string | null = null
  const lostRound = roundWinner(round) === rival
  for (const [i, trick] of round.tricks.entries()) {
    const mine = trick.cards[seat]
    const theirs = trick.cards[rival]
    if (!mine || !theirs) break
    const inHand = round.dealt[seat]!.filter((c) => !used.some((u) => sameCard(u, c)))
    used.push(mine)
    // Only tricks where the learner saw the rival's card first.
    if (trick.lead !== rival) continue
    const winners = inHand
      .filter((c) => cardPower(c) > cardPower(theirs))
      .sort((a, b) => cardPower(a) - cardPower(b))
    const lowest = winners[0]
    if (!lowest) continue
    if (cardPower(mine) <= cardPower(theirs)) {
      if (lostRound)
        return `Perdiste ${ORDINALS[i]} con el ${cardName(mine)}, pero el ${cardName(lowest)} le ganaba.`
    } else if (!overkill && cardPower(mine) > cardPower(lowest)) {
      overkill = `Usaste el ${cardName(mine)}, pero el ${cardName(lowest)} también ganaba y te guardabas el ${cardName(mine)}.`
    }
  }
  return overkill
}
