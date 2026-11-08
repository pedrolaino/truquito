import type { CSSProperties, ReactNode } from 'react'
import { sameCard } from '../engine/cards.ts'
import {
  type Action,
  type GameEvent,
  type GameView,
  type RoundView,
  actorOf,
  handOf,
  legalActions,
  nextSeat,
} from '../engine/game.ts'
import { CardBack, CardButton, CardView } from './Card.tsx'
import { Fosforos } from './Fosforos.tsx'
import { actionLabel, eventText, scoreText, spokenText } from './text.ts'

interface Props {
  view: GameView
  /** Display names by seat. */
  names: string[]
  events: GameEvent[]
  onAction: (action: Action) => void
  /** Shown next to the rival's name, e.g. when they are disconnected. */
  rivalStatus?: ReactNode
}

const tilt = (deg: number) => ({ '--tilt': `${deg}deg` }) as CSSProperties

export function Table({ view, names, events, onAction, rivalStatus }: Props) {
  const me = view.seat
  const rival = nextSeat(view, me)
  const legal = legalActions(view, me)
  const actor = actorOf(view)
  const round = view.round
  const hand = handOf(round, me)
  const rivalCards = 3 - round.tricks.filter((t) => t.cards[rival]).length
  const calls = legal.filter((a) => a.type !== 'play')
  const canPlay = (card: (typeof hand)[number]) =>
    legal.some((a) => a.type === 'play' && sameCard(a.card, card))

  // Until the first card of a new round, keep the last round on the table.
  const fresh = round.tricks.length === 1 && round.tricks[0]!.cards.every((c) => c === null)
  const shown: RoundView = fresh && view.previous ? view.previous : round
  const lines = events.map((e) => eventText(e, names)).filter((t): t is string => t !== null)
  const bubble = rivalSpeech(events, rival)

  const score = (seat: number, side: string) => (
    <div className={`score ${side}`}>
      <span className="score-name">
        {names[seat]} <small>{scoreText(view.scores[seat]!, view.config.target)}</small>
      </span>
      <Fosforos points={view.scores[seat]!} target={view.config.target} />
    </div>
  )

  return (
    <section className="game" aria-label="Mesa">
      <header className="scorebar" aria-label="Puntos">
        {score(me, 'score-me')}
        <p className="round-info">
          <b>Ronda {view.roundNumber}</b>A {view.config.target},{' '}
          {view.config.flor ? 'con flor' : 'sin flor'}
        </p>
        {score(rival, 'score-rival')}
      </header>

      <div className="board">
        <div className="rival">
          <div className="rival-hand">
            {Array.from({ length: rivalCards }, (_, i) => (
              <CardBack key={i} style={tilt((i - (rivalCards - 1) / 2) * 6)} />
            ))}
          </div>
          <p className="rival-name">
            {names[rival]} {round.mano === rival && <span className="tag">mano</span>}
            {rivalStatus}
          </p>
          {bubble && (
            <p className="bubble" key={events.length} aria-hidden="true">
              {bubble}
            </p>
          )}
        </div>

        <ol className={shown === round ? 'tricks' : 'tricks previous'} aria-label="Bazas">
          {shown !== round && (
            <li className="tricks-caption">Ronda anterior: {roundResult(shown, names)}</li>
          )}
          {[0, 1, 2].map((i) => {
            const trick = shown.tricks[i]
            const rivalCard = trick?.cards[rival]
            const myCard = trick?.cards[me]
            return (
              <li key={`${view.roundNumber}-${i}`} className="trick" aria-label={`Baza ${i + 1}`}>
                <div className="slot from-rival">{rivalCard && <CardView card={rivalCard} />}</div>
                <div className="slot from-me">{myCard && <CardView card={myCard} />}</div>
                <span className={trick?.winner === me ? 'trick-result won' : 'trick-result'}>
                  {trick?.winner === null || trick?.winner === undefined
                    ? ''
                    : trick.winner === 'parda'
                      ? 'Parda'
                      : trick.winner === me
                        ? 'Ganaste'
                        : `Ganó ${names[rival]}`}
                </span>
              </li>
            )
          })}
        </ol>

        <p className="turn" role="status">
          {actor === null
            ? 'Partida terminada'
            : actor === me
              ? 'Te toca'
              : `Esperando a ${names[actor]}…`}
        </p>

        <div
          role="group"
          aria-label="Tus cartas"
          className={actor === me ? 'hand' : 'hand waiting'}
        >
          {hand.map((card, i) => (
            <CardButton
              key={`${view.roundNumber}-${card.rank}-${card.suit}`}
              card={card}
              disabled={!canPlay(card)}
              onPlay={() => onAction({ type: 'play', card })}
              style={{ '--i': i } as CSSProperties}
            />
          ))}
        </div>

        <div role="group" aria-label="Cantos" className="calls">
          {calls.map((action) => (
            <button
              key={actionLabel(action, view)}
              type="button"
              className={
                action.type === 'mazo'
                  ? 'btn btn-quiet'
                  : action.type === 'quiero'
                    ? 'btn btn-primary'
                    : 'btn'
              }
              onClick={() => onAction(action)}
            >
              {actionLabel(action, view)}
            </button>
          ))}
        </div>
      </div>

      <aside className="log" aria-label="Jugadas">
        <h2>Jugadas</h2>
        {lines.slice(-14).map((line, i) => (
          <p key={lines.length - 14 + i}>{line}</p>
        ))}
      </aside>
      <div className="sr-only" aria-live="polite">
        {lines.slice(-3).map((line, i) => (
          <p key={lines.length - 3 + i}>{line}</p>
        ))}
      </div>
    </section>
  )
}

/** What the rival just said out loud, if it is the latest thing that happened. */
function rivalSpeech(events: GameEvent[], rival: number): string | null {
  for (let i = events.length - 1; i >= Math.max(0, events.length - 3); i--) {
    const e = events[i]!
    if (e.type === 'score' || e.type === 'roundEnd' || e.type === 'deal' || e.type === 'trick')
      continue
    return 'seat' in e && e.seat === rival ? spokenText(e) : null
  }
  return null
}

function roundResult(round: RoundView, names: string[]): string {
  return round.winner === null ? 'sin terminar' : `ganó ${names[round.winner]}`
}
