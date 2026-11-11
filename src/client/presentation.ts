import type { GameEvent, GameView, RoundView, Trick } from '../engine/game.ts'
import { config } from '../shared/config.ts'
import { cardName } from './text.ts'

/** How long an event stays on screen before the next one shows. */
export function eventDuration(event: GameEvent, me: number): number {
  const { pace } = config
  const mine = 'seat' in event && event.seat === me
  switch (event.type) {
    case 'play':
      return mine ? pace.play.mine : pace.play.theirs
    case 'quiero':
    case 'noQuiero':
    case 'sonBuenas':
      return mine ? pace.speech.mine : pace.answer
    case 'call':
    case 'mazo':
    case 'flor':
    case 'points':
      return mine ? pace.speech.mine : pace.speech.theirs
    case 'trick':
      return pace.trick
    case 'score':
      return event.reason === 'round' ? pace.play.mine : pace.score
    case 'roundEnd':
      return pace.roundEnd
    case 'deal':
      return pace.deal
    case 'gameEnd':
      return 0
  }
}

/**
 * Moves the view on screen one event forward, so a move that settles a
 * trick, a round or an envido can be shown step by step. `final` is the real
 * state after all events; the screen snaps to it once the queue is empty.
 */
export function stepView(view: GameView, event: GameEvent, final: GameView): GameView {
  switch (event.type) {
    case 'play': {
      const tricks = view.round.tricks.map((t) => ({ ...t, cards: [...t.cards] }))
      let last = tricks.at(-1)
      if (!last || last.cards.every((c) => c !== null)) {
        last = {
          lead: event.seat,
          cards: Array<null>(view.seats).fill(null),
          winner: null,
        } as Trick
        tricks.push(last)
      }
      last.cards[event.seat] = event.card
      return { ...view, round: { ...view.round, tricks } }
    }
    case 'trick': {
      const tricks = view.round.tricks.map((t, i, all) =>
        i === all.length - 1 ? { ...t, winner: event.winner } : t,
      )
      return { ...view, round: { ...view.round, tricks } }
    }
    case 'score': {
      const scores = [...view.scores]
      scores[event.seat] = Math.min(view.config.target, scores[event.seat]! + event.points)
      return { ...view, scores }
    }
    case 'roundEnd':
      return { ...view, round: { ...view.round, winner: event.winner } }
    case 'deal':
      return {
        ...view,
        roundNumber: event.round,
        previous: view.round,
        round: dealtRound(event, final),
      }
    case 'gameEnd':
      return { ...view, winner: event.winner }
    default:
      return view
  }
}

/**
 * The round as it was right after `event` dealt it. Later moves may already be
 * in `final`, so the round comes back with no cards played and nothing called.
 */
function dealtRound(event: Extract<GameEvent, { type: 'deal' }>, final: GameView): RoundView {
  if (final.roundNumber === event.round && final.round.tricks[0]!.cards.every((c) => c === null))
    return final.round
  const round = final.roundNumber === event.round ? final.round : final.previous!
  return {
    ...round,
    tricks: [{ lead: event.mano, cards: Array<null>(final.seats).fill(null), winner: null }],
    turn: event.mano,
    envido: { calls: [], caller: null, status: round.flor.length > 0 ? 'closed' : 'open' },
    truco: { level: 1, holder: null, pending: null },
    announced: round.announced.filter((a) => a.kind === 'flor'),
    winner: null,
  }
}

export interface Announcement {
  text: string
  /** Who said it, or null for results like a trick or a round. */
  seat: number | null
}

const REASONS = { envido: 'el envido', flor: 'la flor', round: 'la mano' } as const

const SPOKEN = {
  envido: '¡Envido!',
  realEnvido: '¡Real envido!',
  faltaEnvido: '¡Falta envido!',
  truco: '¡Truco!',
  retruco: '¡Quiero retruco!',
  valeCuatro: '¡Quiero vale cuatro!',
} as const

/** The big line shown in the middle of the table while an event plays. */
export function announce(
  event: GameEvent,
  names: string[],
  me: number,
  before: GameEvent[],
): Announcement | null {
  const who = (seat: number) => (seat === me ? 'Vos' : names[seat]!)
  const said = (text: string) => ({ text, seat: 'seat' in event ? event.seat : null })
  switch (event.type) {
    case 'call':
      return said(SPOKEN[event.call])
    case 'quiero':
      return said('Quiero')
    case 'noQuiero':
      return said('No quiero')
    case 'mazo':
      return said('Me voy al mazo')
    case 'flor':
      return said('¡Flor!')
    case 'points':
      return said(`${event.points} de ${event.kind}`)
    case 'sonBuenas':
      return said('Son buenas')
    case 'play':
      return event.seat === me ? null : said(cardName(event.card))
    case 'trick':
      // The cards on the table already show it.
      return null
    case 'score': {
      // Round points are summed up with the round.
      if (event.reason === 'round') return null
      const plural = event.points === 1 ? 'punto' : 'puntos'
      const who = event.seat === me ? 'Sumás' : `${names[event.seat]} suma`
      return { text: `${who} ${event.points} ${plural} por ${REASONS[event.reason]}`, seat: null }
    }
    case 'roundEnd': {
      const lastDeal = before.findLastIndex((e) => e.type === 'deal')
      const points = before
        .slice(lastDeal + 1)
        .filter((e) => e.type === 'score')
        .map(
          (e) => `${e.seat === me ? 'Vos' : names[e.seat]} +${e.points} por ${REASONS[e.reason]}`,
        )
      const title = event.winner === me ? 'Ganaste la mano' : `Mano para ${names[event.winner]}`
      return { text: [title, ...points].join('\n'), seat: null }
    }
    case 'deal':
      return {
        text: `Mano ${event.round}. ${event.mano === me ? 'Sos mano' : `Es mano ${who(event.mano)}`}`,
        seat: null,
      }
    case 'gameEnd':
      return null
  }
}
