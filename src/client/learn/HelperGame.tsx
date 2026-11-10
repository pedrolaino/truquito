import { ChevronLeft, Lightbulb, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { seededRandom } from '../../bots/match.ts'
import { actorOf, legalActions, viewFor } from '../../engine/game.ts'
import { BOT, BotGame, HUMAN } from '../botGame.ts'
import { decideInWorker } from '../decide.ts'
import { GameOver } from '../GameOver.tsx'
import { Table } from '../Table.tsx'
import { advise } from './coach.ts'
import { sameAction } from './lesson.ts'
import { scrollToSuggestion } from './scroll.ts'

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
  const hinted = hints && advice ? JSON.stringify(advice.action) : null
  useEffect(() => scrollToSuggestion(), [hinted])
  if (failed) throw new Error('The bot stopped working')

  return (
    <main className="lesson lesson-play">
      <header className="lesson-bar">
        <button type="button" className="back" onClick={onExit}>
          <ChevronLeft aria-hidden="true" /> Aprender
        </button>
        <button
          type="button"
          className="btn btn-quiet hint-toggle"
          aria-pressed={hints}
          onClick={() => setHints(!hints)}
        >
          <Lightbulb aria-hidden="true" /> {hints ? 'Ocultar ayuda' : 'Mostrar ayuda'}
        </button>
      </header>
      <p className="coach" role="status">
        {!hints
          ? 'La ayuda está apagada. Prendela cuando la necesites.'
          : advice
            ? advice.why
            : state.winner === null
              ? 'Mirá lo que hace el rival…'
              : ''}
      </p>
      <Table
        key={game.id}
        view={view}
        names={['Vos', 'Bot fácil']}
        events={events}
        onAction={(a) => game.play(a)}
        highlight={hints && advice ? (a) => sameAction(a, advice.action) : undefined}
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
