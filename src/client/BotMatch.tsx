import { useEffect, useState, useSyncExternalStore } from 'react'
import { RotateCcw, House } from 'lucide-react'
import type { Level } from '../bots/index.ts'
import { seededRandom } from '../bots/match.ts'
import { type GameConfig, viewFor } from '../engine/game.ts'
import { BOT, BotGame, HUMAN } from './botGame.ts'
import { decideInWorker } from './decide.ts'
import { GameOver } from './GameOver.tsx'
import { Table } from './Table.tsx'

const LEVELS: Record<Level, string> = {
  easy: 'Bot fácil',
  medium: 'Bot medio',
  hard: 'Bot difícil',
}
const randomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]!

function newGame(level: Level, config: GameConfig) {
  const seed = randomSeed()
  const schedule = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms)
    return () => clearTimeout(id)
  }
  return new BotGame(level, config, seed, decideInWorker, schedule, seededRandom(seed ^ 0x5bd1e995))
}

export function BotMatch({
  level,
  config,
  onExit,
}: {
  level: Level
  config: GameConfig
  onExit: () => void
}) {
  const [game, setGame] = useState(() => newGame(level, config))
  useEffect(() => () => game.dispose(), [game])
  const { state, events, failed } = useSyncExternalStore(game.subscribe, game.getSnapshot)
  if (failed) throw new Error('The bot stopped working')

  return (
    <>
      <Table
        key={game.id}
        view={viewFor(state, HUMAN)}
        names={['Vos', LEVELS[level]]}
        events={events}
        onAction={(a) => game.play(a)}
        over={
          state.winner !== null && (
            <GameOver
              won={state.winner === HUMAN}
              names={['Vos', LEVELS[level]]}
              scores={[state.scores[HUMAN]!, state.scores[BOT]!]}
              target={config.target}
            >
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setGame(newGame(level, config))}
              >
                <RotateCcw aria-hidden="true" /> Jugar de nuevo
              </button>
              <button type="button" className="btn" onClick={onExit}>
                <House aria-hidden="true" /> Volver al inicio
              </button>
            </GameOver>
          )
        }
        rivalStatus={
          state.winner === null && (
            <button type="button" className="btn btn-quiet" onClick={onExit}>
              Salir
            </button>
          )
        }
      />
    </>
  )
}
