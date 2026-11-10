import { handStrength } from '../../bots/medium.ts'
import { type Card, cardPower, envidoPoints } from '../../engine/cards.ts'
import {
  type Action,
  type GameView,
  type Trick,
  handOf,
  nextSeat,
  roundWinner,
} from '../../engine/game.ts'
import { cardName } from '../text.ts'

export interface Advice {
  action: Action
  why: string
}

const has = (legal: Action[], action: Action) =>
  legal.some(
    (a) =>
      a.type === action.type &&
      (a.type !== 'envido' || (action.type === 'envido' && a.call === action.call)),
  )

const RAISES = { 1: 'truco', 2: 'retruco', 3: 'vale cuatro' } as const

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
  const r = view.round
  if (has(legal, { type: 'truco' }) && r.truco.level < 4)
    return {
      action: { type: 'truco' },
      why: `Mano perdida: mentí y cantá ${RAISES[r.truco.level as 1 | 2 | 3]}, si no lo quieren ganás ${r.truco.level}. O andate al mazo.`,
    }
  if (!has(legal, { type: 'mazo' })) return null
  return {
    action: { type: 'mazo' },
    why: 'No le ganás con ninguna: la mano está perdida. Andate al mazo.',
  }
}

/** The card to play now and why, as an average player would think it. */
function cardAdvice(view: GameView): Advice {
  const r = view.round
  const me = view.seat
  const theirs = r.tricks.at(-1)!.cards[nextSeat(view, me)]
  const sorted = handOf(r, me).sort((a, b) => cardPower(a) - cardPower(b))
  const play = (card: Card, why: string): Advice => ({ action: { type: 'play', card }, why })

  if (sorted.length === 1) return play(sorted[0]!, `Te queda el ${cardName(sorted[0]!)}: tiralo.`)
  if (theirs) {
    const beat = sorted.find((c) => cardPower(c) > cardPower(theirs))
    if (beat)
      return play(
        beat,
        `Ganale con el ${cardName(beat)}: es la más baja que le gana y guardás las otras.`,
      )
    const tie = sorted.find((c) => cardPower(c) === cardPower(theirs))
    if (tie && r.tricks.some((t) => t.winner === me))
      return play(
        tie,
        `Empardá con el ${cardName(tie)}: como ya ganaste una baza, la parda te da la mano.`,
      )
    return play(
      sorted[0]!,
      `No le ganás: tirá el ${cardName(sorted[0]!)}, la más baja, y guardá las buenas.`,
    )
  }
  if (r.tricks.length === 1 && sorted.length === 3)
    return play(
      sorted[1]!,
      `Arrancá con el ${cardName(sorted[1]!)}, tu carta del medio, y guardá la mejor.`,
    )
  const best = sorted.at(-1)!
  return play(best, `Jugá el ${cardName(best)}, tu carta más fuerte, para llevarte esta baza.`)
}

/**
 * What a learner could do now and a one-line reason. It sees only the seat's
 * view, like the bots, and never bluffs.
 */
export function advise(view: GameView, legal: Action[]): Advice | null {
  if (legal.length === 0) return null
  const r = view.round
  const points = envidoPoints(r.dealt[view.seat]!)
  const strength = handStrength(view)
  const envido: Action = { type: 'envido', call: 'envido' }

  if (r.envido.status === 'pending') {
    const last = r.envido.calls.at(-1)
    const needed = last === 'faltaEnvido' ? 31 : last === 'realEnvido' ? 29 : 27
    return points >= needed
      ? { action: { type: 'quiero' }, why: `Tenés ${points} de envido: es bastante, querelo.` }
      : {
          action: { type: 'noQuiero' },
          why: `Tenés ${points} de envido: es poco para este canto, mejor no lo quieras.`,
        }
  }

  if (r.truco.pending) {
    if (points >= 27 && has(legal, envido))
      return {
        action: envido,
        why: `El envido va primero y tenés ${points}: cantalo antes de responder el truco.`,
      }
    if (strength > 0.8 && has(legal, { type: 'truco' }))
      return { action: { type: 'truco' }, why: 'Tus cartas son muy buenas: subí la apuesta.' }
    return strength > 0.45
      ? { action: { type: 'quiero' }, why: 'Tus cartas alcanzan para jugarla: querelo.' }
      : { action: { type: 'noQuiero' }, why: 'Tus cartas son flojas: no lo quieras y perdés poco.' }
  }

  if (points >= 27 && has(legal, envido))
    return { action: envido, why: `Tenés ${points} de envido: cantalo antes de tirar.` }
  if (handIsLost(view)) {
    const lost = lostAdvice(view, legal)
    if (lost) return lost
  }
  if (strength > 0.75 && has(legal, { type: 'truco' }))
    return { action: { type: 'truco' }, why: 'Tenés cartas fuertes: cantá truco.' }
  return cardAdvice(view)
}
