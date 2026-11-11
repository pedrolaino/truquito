import { ChevronLeft, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { seededRandom } from '../../bots/match.ts'
import { type Action, actorOf, legalActions, nextSeat, viewFor } from '../../engine/game.ts'
import { BOT, BotGame, HUMAN } from '../botGame.ts'
import { decideInWorker } from '../decide.ts'
import { GameOver } from '../GameOver.tsx'
import { Table } from '../Table.tsx'
import { type Topic, advise, reviewRound } from './coach.ts'
import { sameAction } from './lesson.ts'

const randomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]!

function newGame() {
  const seed = randomSeed()
  const schedule = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms)
    return () => clearTimeout(id)
  }
  return new BotGame(
    'easy',
    { flor: false, target: 15 },
    seed,
    decideInWorker,
    schedule,
    seededRandom(seed ^ 0x2545f491),
  )
}

/** How much the coach says: always, only when asked, or nothing. */
type Help = 'always' | 'asked' | 'off'

const HELP_LABELS: Record<Help, string> = {
  always: 'Ayuda siempre',
  asked: 'Ayuda si la pido',
  off: 'Sin ayuda',
}

/** The lesson to suggest when a topic needed help often. */
const PRACTICE: Record<Topic, { lesson: string; label: string }> = {
  cartas: { lesson: 'ronda', label: 'Practicar qué carta tirar' },
  truco: { lesson: 'truco', label: 'Practicar el truco' },
  envido: { lesson: 'cantar-envido', label: 'Practicar el envido' },
}

const NONE: Record<Topic, number> = { cartas: 0, truco: 0, envido: 0 }

interface Props {
  onExit: () => void
  /** Opens a lesson by id. */
  onPractice: (lesson: string) => void
}

/** A real game against the easy bot with a coach that suggests moves and says why. */
export function HelperGame({ onExit, onPractice }: Props) {
  const [game, setGame] = useState(newGame)
  useEffect(() => () => game.dispose(), [game])
  const { state, events, failed } = useSyncExternalStore(game.subscribe, game.getSnapshot)
  const [help, setHelp] = useState<Help>('always')
  const [busy, setBusy] = useState(true)
  const onBusyChange = useCallback((b: boolean) => setBusy(b), [])
  // Per decision: whether the learner asked for the hint and for the reason.
  const [asked, setAsked] = useState({ at: -1, hint: false, why: false })
  // How often each topic needed help in this game.
  const [needed, setNeeded] = useState<Record<Topic, number>>(NONE)
  const count = (topic: Topic) => setNeeded((n) => ({ ...n, [topic]: n[topic] + 1 }))
  if (failed) throw new Error('The bot stopped working')

  const view = viewFor(state, HUMAN)
  const myTurn = state.winner === null && actorOf(state) === HUMAN && !busy
  const advice = myTurn && help !== 'off' ? advise(view, legalActions(state, HUMAN)) : null
  const now = asked.at === events.length ? asked : { at: events.length, hint: false, why: false }
  const shown = advice && (help === 'always' || now.hint) ? advice : null

  // After a round, one remark about the learner's cards, until they play again.
  const review =
    view.previous && view.round.tricks[0]!.cards[HUMAN] === null
      ? reviewRound(view.previous, HUMAN, nextSeat(view, HUMAN))
      : null

  const play = (action: Action) => {
    // Going against visible advice counts as needing help on that topic.
    if (shown && !sameAction(action, shown.action)) count(shown.topic)
    game.play(action)
  }

  const tip =
    help === 'off' ? undefined : shown ? (
      <>
        <span>{shown.say}</span>{' '}
        {now.why ? (
          <span className="tip-why">{shown.why}</span>
        ) : (
          <button type="button" className="tip-btn" onClick={() => setAsked({ ...now, why: true })}>
            ¿Por qué?
          </button>
        )}
      </>
    ) : advice ? (
      <>
        <span>¿Querés una pista?</span>{' '}
        <button
          type="button"
          className="tip-btn"
          onClick={() => {
            count(advice.topic)
            setAsked({ ...now, hint: true })
          }}
        >
          Pista
        </button>
      </>
    ) : state.winner !== null ? null : (
      (review ?? 'Mirá lo que hace el rival…')
    )

  const topic = (Object.entries(needed) as [Topic, number][])
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])[0]?.[0]

  return (
    <main className="helper screen">
      <header className="helper-bar">
        <button type="button" className="icon-btn" aria-label="Volver a Aprender" onClick={onExit}>
          <ChevronLeft aria-hidden="true" />
        </button>
        <h1>Partida con ayudante</h1>
        <select
          className="btn btn-quiet help-level"
          aria-label="Ayuda"
          value={help}
          onChange={(e) => setHelp(e.target.value as Help)}
        >
          {(Object.keys(HELP_LABELS) as Help[]).map((level) => (
            <option key={level} value={level}>
              {HELP_LABELS[level]}
            </option>
          ))}
        </select>
      </header>
      <Table
        key={game.id}
        view={view}
        names={['Vos', 'Bot fácil']}
        events={events}
        onAction={play}
        highlight={shown ? (a) => sameAction(a, shown.action) : undefined}
        tip={tip}
        onBusyChange={onBusyChange}
        over={
          state.winner !== null && (
            <GameOver
              won={state.winner === HUMAN}
              names={['Vos', 'Bot fácil']}
              scores={[state.scores[HUMAN]!, state.scores[BOT]!]}
              target={15}
            >
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setNeeded(NONE)
                  setGame(newGame())
                }}
              >
                <RotateCcw aria-hidden="true" /> Jugar otra
              </button>
              {topic && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => onPractice(PRACTICE[topic].lesson)}
                >
                  {PRACTICE[topic].label}
                </button>
              )}
              <button type="button" className="btn" onClick={onExit}>
                Volver al menú
              </button>
            </GameOver>
          )
        }
      />
    </main>
  )
}
