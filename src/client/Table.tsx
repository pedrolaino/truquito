import type { CSSProperties, ReactNode } from 'react'
import { sameCard } from '../engine/cards.ts'
import {
  type Action,
  type GameEvent,
  type GameView,
  actorOf,
  handOf,
  legalActions,
  nextSeat,
} from '../engine/game.ts'
import { CardBack, CardButton, CardView } from './Card.tsx'
import { Fosforos } from './Fosforos.tsx'
import { actionLabel, eventText, scoreText } from './text.ts'
import { useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { playSound } from './sound.ts'
import { saveMuted, savedMuted } from './storage.ts'
import { usePresentation } from './usePresentation.ts'

interface Props {
  view: GameView
  /** Display names by seat. */
  names: string[]
  events: GameEvent[]
  onAction: (action: Action) => void
  /** Shown next to the rival's name, e.g. when they are disconnected. */
  rivalStatus?: ReactNode
  /** Game over panel, shown once the last move has played out. */
  over?: ReactNode
}

const tilt = (deg: number) => ({ '--tilt': `${deg}deg` }) as CSSProperties

export function Table({ view: realView, names, events, onAction, rivalStatus, over }: Props) {
  const [muted, setMuted] = useState(savedMuted)
  const { view, busy, announcement, shownEvents } = usePresentation(
    realView,
    events,
    names,
    (e) => {
      if (!muted) playSound(e, realView.seat)
    },
  )
  const me = view.seat
  const rival = nextSeat(view, me)
  // While a move is still being shown nothing can be played.
  const legal = busy ? [] : legalActions(view, me)
  const actor = actorOf(view)
  const round = view.round
  const hand = handOf(round, me)
  const rivalCards = 3 - round.tricks.filter((t) => t.cards[rival]).length
  const calls = legal.filter((a) => a.type !== 'play')
  const canPlay = (card: (typeof hand)[number]) =>
    legal.some((a) => a.type === 'play' && sameCard(a.card, card))
  const lines = shownEvents.map((e) => eventText(e, names)).filter((t): t is string => t !== null)

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
        <button
          type="button"
          className="sound-toggle"
          aria-pressed={!muted}
          aria-label="Sonido"
          title={muted ? 'Activar sonido' : 'Silenciar'}
          onClick={() => {
            setMuted(!muted)
            saveMuted(!muted)
          }}
        >
          {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
        </button>
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
          {announcement?.seat === rival && (
            <p className="bubble" key={shownEvents.length} aria-hidden="true">
              {announcement.text}
            </p>
          )}
        </div>

        <div className="table-center">
          <ol className="tricks" aria-label="Bazas">
            {[0, 1, 2].map((i) => {
              const trick = round.tricks[i]
              const outcome = (seat: number) =>
                !trick || trick.winner === null || trick.winner === 'parda'
                  ? ''
                  : trick.winner === seat
                    ? ' won'
                    : ' lost'
              const rivalCard = trick?.cards[rival]
              const myCard = trick?.cards[me]
              return (
                <li key={`${view.roundNumber}-${i}`} className="trick" aria-label={`Baza ${i + 1}`}>
                  <div className={`slot from-rival${outcome(rival)}`}>
                    {rivalCard && <CardView card={rivalCard} />}
                  </div>
                  <div className={`slot from-me${outcome(me)}`}>
                    {myCard && <CardView card={myCard} />}
                  </div>
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
          {announcement && announcement.seat === null && (
            <p className="banner" key={shownEvents.length} aria-hidden="true">
              {announcement.text}
            </p>
          )}
        </div>

        {announcement?.seat === me ? (
          <p className="bubble bubble-me" key={shownEvents.length} aria-hidden="true">
            {announcement.text}
          </p>
        ) : (
          <p className="turn">
            {busy
              ? ''
              : actor === null
                ? 'Partida terminada'
                : actor === me
                  ? 'Te toca'
                  : `Esperando a ${names[actor]}…`}
          </p>
        )}

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
      {!busy && over}
      <div className="sr-only" aria-live="polite">
        {announcement && <p key={shownEvents.length}>{announcement.text}</p>}
        {!busy && actor === me && <p>Te toca</p>}
      </div>
    </section>
  )
}
