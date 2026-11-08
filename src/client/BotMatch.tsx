import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Level } from '../bots/index.ts'
import { seededRandom } from '../bots/match.ts'
import { type GameConfig, viewFor } from '../engine/game.ts'
import { BotGame, HUMAN } from './botGame.ts'
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
  return new BotGame(
    level,
    config,
    seed,
    decideInWorker,
    (fn, ms) => {
      const id = setTimeout(fn, ms)
      return () => clearTimeout(id)
    },
    seededRandom(seed ^ 0x5bd1e995),
  )
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

  const names = ['Vos', LEVELS[level]]
  return (
    <main>
      <h1>Truquito</h1>
      <Table
        view={viewFor(state, HUMAN)}
        names={names}
        events={events}
        onAction={(a) => game.play(a)}
      />
      {state.winner !== null && (
        <GameOver won={state.winner === HUMAN}>
          <button type="button" onClick={() => setGame(newGame(level, config))}>
            Jugar de nuevo
          </button>
          <button type="button" onClick={onExit}>
            Volver al inicio
          </button>
        </GameOver>
      )}
      {state.winner === null && (
        <button type="button" onClick={onExit}>
          Salir
        </button>
      )}
    </main>
  )
}
