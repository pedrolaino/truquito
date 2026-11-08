import type { ReactNode } from 'react'
import {
  type Action,
  type GameEvent,
  type GameView,
  actorOf,
  handOf,
  legalActions,
  nextSeat,
} from '../engine/game.ts'
import { actionLabel, cardName, eventText, scoreText } from './text.ts'

interface Props {
  view: GameView
  /** Display names by seat. */
  names: string[]
  events: GameEvent[]
  onAction: (action: Action) => void
  /** Shown under the rival's name, e.g. when they are disconnected. */
  rivalStatus?: ReactNode
}

export function Table({ view, names, events, onAction, rivalStatus }: Props) {
  const me = view.seat
  const rival = nextSeat(view, me)
  const legal = legalActions(view, me)
  const actor = actorOf(view)
  const round = view.round
  const hand = handOf(round, me)
  const rivalCards = 3 - round.tricks.filter((t) => t.cards[rival]).length
  const canPlay = (i: number) =>
    legal.some(
      (a) => a.type === 'play' && a.card.rank === hand[i]!.rank && a.card.suit === hand[i]!.suit,
    )
  const calls = legal.filter((a) => a.type !== 'play')
  const recent = events
    .map((e) => eventText(e, names))
    .filter((t): t is string => t !== null)
    .slice(-4)

  return (
    <section aria-label="Mesa">
      <p>
        <strong>Puntos</strong> (a {view.config.target}
        {view.config.flor ? ', con flor' : ', sin flor'}): {names[me]}{' '}
        {scoreText(view.scores[me]!, view.config.target)} · {names[rival]}{' '}
        {scoreText(view.scores[rival]!, view.config.target)}
      </p>

      <p>
        {names[rival]} tiene {rivalCards} {rivalCards === 1 ? 'carta' : 'cartas'}.{' '}
        {round.mano === rival ? 'Es mano.' : ''} {rivalStatus}
      </p>

      <ol aria-label="Bazas">
        {round.tricks.map((trick, i) => (
          <li key={i}>
            Baza {i + 1}: {names[rival]} {trick.cards[rival] ? cardName(trick.cards[rival]) : '—'} ·{' '}
            {names[me]} {trick.cards[me] ? cardName(trick.cards[me]) : '—'}
            {trick.winner !== null &&
              ` → ${trick.winner === 'parda' ? 'parda' : `gana ${names[trick.winner]}`}`}
          </li>
        ))}
      </ol>

      <p>
        {actor === null
          ? 'Partida terminada.'
          : actor === me
            ? 'Te toca.'
            : `Esperando a ${names[actor]}…`}
      </p>

      <div role="group" aria-label="Tus cartas">
        {hand.map((card, i) => (
          <button
            key={cardName(card)}
            type="button"
            disabled={!canPlay(i)}
            onClick={() => onAction({ type: 'play', card })}
          >
            {cardName(card)}
          </button>
        ))}
      </div>

      <div role="group" aria-label="Cantos">
        {calls.map((action) => (
          <button key={actionLabel(action, view)} type="button" onClick={() => onAction(action)}>
            {actionLabel(action, view)}
          </button>
        ))}
      </div>

      <div aria-live="polite" aria-label="Últimas jugadas">
        {recent.map((line, i) => (
          <p key={`${events.length}-${i}`}>{line}</p>
        ))}
      </div>
    </section>
  )
}
