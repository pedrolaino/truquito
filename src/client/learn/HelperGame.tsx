import { ChevronLeft, Lightbulb, LightbulbOff, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { seededRandom } from '../../bots/match.ts'
import { actorOf, legalActions, viewFor } from '../../engine/game.ts'
import { BOT, BotGame, HUMAN } from '../botGame.ts'
import { decideInWorker } from '../decide.ts'
import { GameOver } from '../GameOver.tsx'
import { Table } from '../Table.tsx'
import { advise } from './coach.ts'
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

/** A real game against the easy bot with a coach that suggests each move and says why. */
export function HelperGame({ onExit }: { onExit: () => void }) {
  const [game, setGame] = useState(newGame)
  useEffect(() => () => game.dispose(), [game])
  const { state, events, failed } = useSyncExternalStore(game.subscribe, game.getSnapshot)
  const [hints, setHints] = useState(true)
  const [busy, setBusy] = useState(true)
  const onBusyChange = useCallback((b: boolean) => setBusy(b), [])

  const view = viewFor(state, HUMAN)
  const myTurn = state.winner === null && actorOf(state) === HUMAN && !busy
  const advice = myTurn ? advise(view, legalActions(state, HUMAN)) : null
  if (failed) throw new Error('The bot stopped working')

  // The advice sits right above the hand, where the learner is looking.
  const tip = !hints
    ? undefined
    : advice
      ? advice.why
      : state.winner === null
        ? 'Mirá lo que hace el rival…'
        : null

  return (
    <main className="helper screen">
      <header className="helper-bar">
        <button type="button" className="icon-btn" aria-label="Volver a Aprender" onClick={onExit}>
          <ChevronLeft aria-hidden="true" />
        </button>
        <h1>Partida con ayudante</h1>
        <button
          type="button"
          className="btn btn-quiet hint-toggle"
          aria-pressed={hints}
          onClick={() => setHints(!hints)}
        >
          {hints ? <Lightbulb aria-hidden="true" /> : <LightbulbOff aria-hidden="true" />} Ayuda
        </button>
      </header>
      <Table
        key={game.id}
        view={view}
        names={['Vos', 'Bot fácil']}
        events={events}
        onAction={(a) => game.play(a)}
        highlight={hints && advice ? (a) => sameAction(a, advice.action) : undefined}
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
              <button type="button" className="btn btn-primary" onClick={() => setGame(newGame())}>
                <RotateCcw aria-hidden="true" /> Jugar otra
              </button>
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
