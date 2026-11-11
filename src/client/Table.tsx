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
  trucoWaitsForAFour,
} from '../engine/game.ts'
import { CardBack, CardButton, CardView } from './Card.tsx'
import { Fosforos } from './Fosforos.tsx'
import { actionLabel, eventText, scoreText } from './text.ts'
import { useEffect, useState } from 'react'
import { CircleHelp, Volume2, VolumeX } from 'lucide-react'
import { GuideSheet } from './learn/GuideSheet.tsx'
import { playSound, playTurn } from './sound.ts'
import { saveMuted, savedMuted } from './storage.ts'
import { config } from '../shared/config.ts'
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
  /** Lessons: only these moves can be made, and they are highlighted. */
  allow?: (action: Action) => boolean
  /** Practice with the coach: moves to point out without restricting the others. */
  highlight?: (action: Action) => boolean
  /** Lessons: leave out the score bar to make room. */
  hideScore?: boolean
  /** Lessons: play moves out slower so a beginner can follow them. */
  slow?: boolean
  /** Advice or a lesson's cue, shown right above the hand instead of the turn line. */
  tip?: ReactNode
  /** Told whenever moves start or stop playing out on screen. */
  onBusyChange?: (busy: boolean) => void
}

const tilt = (deg: number) => ({ '--tilt': `${deg}deg` }) as CSSProperties

export function Table({
  view: realView,
  names,
  events,
  onAction,
  rivalStatus,
  over,
  allow,
  highlight,
  hideScore,
  slow,
  tip,
  onBusyChange,
}: Props) {
  const [muted, setMuted] = useState(savedMuted)
  const [guide, setGuide] = useState(false)
  const { view, busy, announcement, shownEvents } = usePresentation(
    realView,
    events,
    names,
    (e) => {
      if (!muted) playSound(e, realView.seat)
    },
    slow ? config.pace.lesson : 1,
  )
  const me = view.seat
  const rival = nextSeat(view, me)
  // While a move is still being shown nothing can be played.
  const legal = busy ? [] : legalActions(view, me).filter((a) => !allow || allow(a))
  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange])
  const myTurn = !busy && actorOf(view) === me
  // Answers like "quiero" pass quickly, so a chime says the turn is back.
  useEffect(() => {
    if (myTurn && !muted) playTurn()
  }, [myTurn, muted])
  const actor = actorOf(view)
  const round = view.round
  const hand = handOf(round, me)
  const rivalCards = 3 - round.tricks.filter((t) => t.cards[rival]).length
  const calls = legal.filter((a) => a.type !== 'play')
  // The truco button stays in sight, off, so a missing truco isn't a mystery.
  const fourBlocks = !busy && !allow && trucoWaitsForAFour(view, me)
  const buttons = calls.length + (fourBlocks ? 1 : 0)
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
      {!hideScore && (
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
          <button
            type="button"
            className="guide-toggle"
            aria-label="Guía rápida"
            title="Guía rápida"
            onClick={() => setGuide(true)}
          >
            <CircleHelp aria-hidden="true" />
          </button>
          <p className="round-info">
            <b>Mano {view.roundNumber}</b>A {view.config.target},{' '}
            {view.config.flor ? 'con flor' : 'sin flor'}
          </p>
          {score(rival, 'score-rival')}
        </header>
      )}

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

        <div className={tip === undefined ? 'turn-slot' : 'turn-slot has-tip'}>
          {announcement?.seat === me ? (
            <p className="bubble bubble-me" key={shownEvents.length} aria-hidden="true">
              {announcement.text}
            </p>
          ) : tip !== undefined ? (
            <div className="tip" role="status">
              {tip}
            </div>
          ) : (
            <p
              className={myTurn ? 'turn your-turn' : 'turn'}
              // A new key replays the pop each time the turn comes back.
              key={myTurn ? shownEvents.length : 'waiting'}
            >
              {busy
                ? ''
                : actor === null
                  ? 'Partida terminada'
                  : actor === me
                    ? '¡Te toca!'
                    : `Esperando a ${names[actor]}…`}
            </p>
          )}
        </div>

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
              suggested={
                allow ? canPlay(card) : !!highlight?.({ type: 'play', card }) && canPlay(card)
              }
              style={{ '--i': i } as CSSProperties}
            />
          ))}
        </div>

        <div
          role="group"
          aria-label="Cantos"
          className="calls"
          // Two rows always: fewer buttons get wider, so long calls fit.
          style={{ '--cols': buttons <= 4 ? 2 : buttons <= 6 ? 3 : 4 } as CSSProperties}
        >
          {calls.map((action) => (
            <button
              key={actionLabel(action, view)}
              type="button"
              className={
                allow || highlight?.(action)
                  ? 'btn suggested'
                  : action.type === 'mazo'
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
          {fourBlocks && (
            <button type="button" className="btn btn-blocked" disabled>
              Al 4 no se canta truco
            </button>
          )}
        </div>
      </div>

      <aside className="log" aria-label="Jugadas">
        <h2>Jugadas</h2>
        {lines.slice(-14).map((line, i) => (
          <p key={lines.length - 14 + i}>{line}</p>
        ))}
      </aside>
      {!busy && over}
      {guide && <GuideSheet onClose={() => setGuide(false)} />}
      <div className="sr-only" aria-live="polite">
        {announcement && <p key={shownEvents.length}>{announcement.text}</p>}
        {!busy && actor === me && <p>Te toca</p>}
      </div>
    </section>
  )
}
