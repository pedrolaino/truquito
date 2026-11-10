import type { ReactNode } from 'react'
import { bots } from '../../bots/index.ts'
import { seededRandom } from '../../bots/match.ts'
import type { Card } from '../../engine/cards.ts'
import {
  type Action,
  type GameEvent,
  type GameState,
  actorOf,
  applyAction,
  createGame,
  legalActions,
  startRound,
  viewFor,
} from '../../engine/game.ts'

export const ME = 0
export const RIVAL = 1

/** A guided move: the only action the learner can take, and what the coach says. */
export interface Cue {
  say: string
  expect: Action
}

/** A short hand on the real table, with the rival's moves and the learner's cues scripted. */
export interface Play {
  hands: [Card[], Card[]]
  mano: 0 | 1
  rival: Action[]
  cues: Cue[]
  /** The play is over once this holds; then `done` is shown. */
  goal: (state: GameState, events: GameEvent[]) => boolean
  done: string
}

export type Step =
  | {
      kind: 'say'
      title: string
      text: string
      visual?: ReactNode
      /** Short items shown under the text, one per row: a name and what it means. */
      rows?: [string, string][]
    }
  | { kind: 'whichWins'; a: Card; b: Card; explain: string }
  | { kind: 'count'; hand: Card[]; options: number[]; explain: string }
  | { kind: 'choose'; prompt: string; options: string[]; answer: number; explain: string }
  | { kind: 'play'; title: string; play: Play }

export interface Lesson {
  id: string
  title: string
  summary: string
  steps: Step[]
}

export function sameAction(a: Action, b: Action): boolean {
  if (a.type !== b.type) return false
  if (a.type === 'play' && b.type === 'play')
    return a.card.rank === b.card.rank && a.card.suit === b.card.suit
  if (a.type === 'envido' && b.type === 'envido') return a.call === b.call
  return true
}

/** The game a play starts from: a 15-point game, no flor, with the prepared hands. */
export function playStart(play: Play): GameState {
  const state = createGame({ flor: false, target: 15 }, 1)
  state.scores = [0, 0]
  startRound(state, play.mano, play.hands)
  return state
}

/** The rival's move: the next scripted one, or an easy bot once the script runs out. */
export function rivalMove(play: Play, state: GameState, used: number, seed = 1): Action {
  const scripted = play.rival[used]
  if (scripted) return scripted
  return bots.easy(viewFor(state, RIVAL), legalActions(state, RIVAL), seededRandom(seed))
}

/**
 * Plays a lesson's hand without delays, the learner always taking the cued
 * move. Throws if any move is illegal or the goal is never reached; used by tests.
 */
export function runPlay(play: Play): { state: GameState; events: GameEvent[] } {
  let state = playStart(play)
  const events: GameEvent[] = []
  let cue = 0
  let rival = 0
  for (let i = 0; i < 50 && !play.goal(state, events); i++) {
    const seat = actorOf(state)
    if (seat === null) break
    let action: Action
    if (seat === ME) {
      const next = play.cues[cue++]
      if (!next) throw new Error('the learner has no cue left')
      action = next.expect
    } else {
      action = rivalMove(play, state, rival++)
    }
    const result = applyAction(state, seat, action)
    if (!result.ok) throw new Error(`illegal ${JSON.stringify(action)} for seat ${seat}`)
    state = result.state
    events.push(...result.events)
  }
  if (!play.goal(state, events)) throw new Error('goal not reached')
  return { state, events }
}
