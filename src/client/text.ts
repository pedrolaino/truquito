import type { Card } from '../engine/cards.ts'
import type { Action, GameEvent, GameView } from '../engine/game.ts'

export const cardName = (card: Card) => `${card.rank} de ${card.suit}`

const CALLS = {
  envido: 'Envido',
  realEnvido: 'Real envido',
  faltaEnvido: 'Falta envido',
  truco: 'Truco',
  retruco: 'Quiero retruco',
  valeCuatro: 'Quiero vale cuatro',
} as const

export function actionLabel(action: Action, view: GameView): string {
  switch (action.type) {
    case 'play':
      return cardName(action.card)
    case 'envido':
      return CALLS[action.call]
    case 'truco': {
      const { level, pending } = view.round.truco
      const next = (pending?.level ?? level) + 1
      if (next === 2) return 'Truco'
      const name = next === 3 ? 'retruco' : 'vale cuatro'
      return pending ? `Quiero ${name}` : name[0]!.toUpperCase() + name.slice(1)
    }
    case 'quiero':
      return 'Quiero'
    case 'noQuiero':
      return 'No quiero'
    case 'mazo':
      return 'Me voy al mazo'
  }
}

/** One line per event, for the log and screen readers. */
export function eventText(event: GameEvent, names: string[]): string | null {
  const who = (seat: number) => names[seat] ?? '?'
  switch (event.type) {
    case 'deal':
      return `Ronda ${event.round}. Es mano ${who(event.mano)}.`
    case 'play':
      return `${who(event.seat)}: ${cardName(event.card)}`
    case 'trick':
      return event.winner === 'parda' ? 'Parda' : `Baza para ${who(event.winner)}`
    case 'call':
      return `${who(event.seat)}: ${CALLS[event.call]}`
    case 'quiero':
      return `${who(event.seat)}: Quiero`
    case 'noQuiero':
      return `${who(event.seat)}: No quiero`
    case 'mazo':
      return `${who(event.seat)}: Me voy al mazo`
    case 'flor':
      return `${who(event.seat)}: Flor`
    case 'points':
      return `${who(event.seat)}: ${event.points} de ${event.kind}`
    case 'sonBuenas':
      return `${who(event.seat)}: Son buenas`
    case 'score':
      return `${event.points} ${event.points === 1 ? 'punto' : 'puntos'} para ${who(event.seat)}`
    case 'roundEnd':
      return `Ronda para ${who(event.winner)}`
    case 'gameEnd':
      return `Partida para ${who(event.winner)}`
  }
}

/** At 30 points the score reads as malas (0 to 15) and buenas (16 to 30). */
export function scoreText(points: number, target: number): string {
  if (target !== 30) return String(points)
  return points <= 15 ? `${points} malas` : `${points - 15} buenas`
}
