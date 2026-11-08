import {
  type GameConfig,
  actorOf,
  applyAction,
  createGame,
  legalActions,
  viewFor,
} from '../engine/game.ts'
import { nextRandom } from '../engine/rng.ts'
import type { Bot } from './bot.ts'

export function seededRandom(seed: number): () => number {
  return () => {
    const r = nextRandom(seed)
    seed = r.seed
    return r.value
  }
}

/** Plays a whole game between two bots and returns the winning seat. */
export function playMatch(players: [Bot, Bot], seed: number, game: GameConfig): number {
  const random = seededRandom(seed ^ 0x9e3779b9)
  let state = createGame(game, seed)
  while (state.winner === null) {
    const seat = actorOf(state)!
    const action = players[seat]!(viewFor(state, seat), legalActions(state, seat), random)
    const result = applyAction(state, seat, action)
    if (!result.ok) throw new Error(`bot in seat ${seat}: ${result.error}`)
    state = result.state
  }
  return state.winner
}

/** Share of games won by `a` against `b`, swapping seats every game. */
export function winRate(a: Bot, b: Bot, games: number, seed: number, game: GameConfig): number {
  let wins = 0
  for (let i = 0; i < games; i++) {
    const swap = i % 2 === 1
    const winner = playMatch(swap ? [b, a] : [a, b], seed + i, game)
    if (winner === (swap ? 1 : 0)) wins++
  }
  return wins / games
}
