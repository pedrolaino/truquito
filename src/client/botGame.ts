import { type Level, thinkingTime } from '../bots/index.ts'
import {
  type Action,
  type GameConfig,
  type GameEvent,
  type GameState,
  type GameView,
  actorOf,
  applyAction,
  createGame,
  legalActions,
  viewFor,
} from '../engine/game.ts'

export type Decide = (
  level: Level,
  view: GameView,
  legal: Action[],
  seed: number,
) => Promise<Action>
/** Runs `fn` after `ms` and returns a cancel function. Injected so tests control time. */
export type Schedule = (fn: () => void, ms: number) => () => void

export const HUMAN = 0
export const BOT = 1

export interface BotGameSnapshot {
  state: GameState
  events: GameEvent[]
  failed: boolean
}

let games = 0

/** A game against a bot that runs entirely in the browser. */
export class BotGame {
  /** Distinct per game, to reset the table between games. */
  readonly id = ++games
  private snapshot: BotGameSnapshot
  private listeners = new Set<() => void>()
  private cancel: (() => void) | null = null
  private turn = 0

  constructor(
    private level: Level,
    config: GameConfig,
    seed: number,
    private decide: Decide,
    private schedule: Schedule,
    private random: () => number,
    /** Start from this state instead of a fresh deal, e.g. a lesson's prepared hands. */
    initial?: GameState,
  ) {
    this.snapshot = { state: initial ?? createGame(config, seed), events: [], failed: false }
    this.botTurn()
  }

  getSnapshot = () => this.snapshot

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  play(action: Action): boolean {
    return this.apply(HUMAN, action)
  }

  dispose() {
    this.turn++
    this.cancel?.()
  }

  private apply(seat: number, action: Action): boolean {
    const result = applyAction(this.snapshot.state, seat, action)
    if (!result.ok) return false
    this.update({ state: result.state, events: [...this.snapshot.events, ...result.events] })
    this.botTurn()
    return true
  }

  private update(changes: Partial<BotGameSnapshot>) {
    this.snapshot = { ...this.snapshot, ...changes }
    this.listeners.forEach((l) => l())
  }

  private botTurn() {
    const { state } = this.snapshot
    if (actorOf(state) !== BOT) return
    const turn = ++this.turn
    const seed = Math.floor(this.random() * 2 ** 32)
    // Think and wait at the same time; act when both are done.
    const decision = this.decide(this.level, viewFor(state, BOT), legalActions(state, BOT), seed)
    this.cancel = this.schedule(() => {
      decision.then(
        (action) => turn === this.turn && this.apply(BOT, action),
        () => this.update({ failed: true }),
      )
    }, thinkingTime(this.random))
  }
}
