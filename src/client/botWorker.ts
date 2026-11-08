import { bots, type Level } from '../bots/index.ts'
import { seededRandom } from '../bots/match.ts'
import type { Action, GameView } from '../engine/game.ts'

export interface BotRequest {
  id: number
  level: Level
  view: GameView
  legal: Action[]
  seed: number
}

// Only the bits of the worker scope used here; the DOM and WebWorker libs clash.
const scope = self as unknown as {
  onmessage: (e: MessageEvent<BotRequest>) => void
  postMessage: (message: { id: number; action: Action }) => void
}

// The hard bot can take a few hundred ms on a slow phone, so bots run off the main thread.
scope.onmessage = (e) => {
  const { id, level, view, legal, seed } = e.data
  scope.postMessage({ id, action: bots[level](view, legal, seededRandom(seed)) })
}
