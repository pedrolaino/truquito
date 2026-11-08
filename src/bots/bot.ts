import type { Action, GameView } from '../engine/game.ts'

/**
 * A bot sees exactly what a person in its seat would see: its own view and
 * the actions it may take. It never gets the full game state.
 */
export type Bot = (view: GameView, legal: Action[], random: () => number) => Action

export const find = (legal: Action[], type: Action['type'], call?: string) =>
  legal.find(
    (a) => a.type === type && (call === undefined || (a.type === 'envido' && a.call === call)),
  )
