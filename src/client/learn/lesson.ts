import type { ReactNode } from 'react'
import type { GuideSection } from './Guide.tsx'
import { bots } from '../../bots/index.ts'
import { seededRandom } from '../../bots/match.ts'
import { type Card, envidoPoints } from '../../engine/cards.ts'
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

/** What the coach answers to a move the learner tries at a free cue. */
export interface Reply {
  action: Action
  say: string
  /** The move is not made: the learner reads why and tries another. */
  retry?: boolean
}

/** A guided move: what the coach says, and what the learner may do. */
export interface Cue {
  say: string
  /** The best move, which the hint points to and tests take. */
  expect: Action
  /** Other moves that are just as good. */
  or?: Action[]
  /**
   * The learner decides: nothing is highlighted until they ask for the hint,
   * and each reply's move can be tried.
   */
  free?: { hint: string; replies: Reply[] }
}

/** Which calls a practice hand allows, on both sides. */
export type Calls = 'none' | 'truco'

/** A short hand on the real table, with the rival's moves and the learner's cues scripted. */
export interface Play {
  /** The hands to deal; a practice hand deals at random when left out. */
  hands?: [Card[], Card[]]
  mano: 0 | 1
  rival: Action[]
  cues: Cue[]
  /**
   * A practice hand: no cues, the learner plays freely against the easy bot and
   * can ask for a hint. Only plays, or plays and truco, are allowed.
   */
  practice?: Calls
  /** The play is over once this holds; then `done` is shown. */
  goal: (state: GameState, events: GameEvent[]) => boolean
  done: string | ((state: GameState) => string)
}

/** Fields every step can have. */
interface Common {
  /** A small reminder under the step, like where to find the quick guide. */
  hint?: string
}

/** Fields of a question. */
interface Question extends Common {
  explain: string
  /** Added to the explanation only when the answer was right. */
  praise?: string
  /** What to tell the learner after a wrong option, by option id, before they try again. */
  wrong?: Record<string, string>
}

export type Step =
  | (Common & {
      kind: 'say'
      title: string
      text: string
      visual?: ReactNode
      /** Short items shown under the text, one per row: a name and what it means. */
      rows?: [string, string][]
      /** A note folded away: its label and its text. */
      more?: [string, string]
    })
  | (Question & { kind: 'whichWins'; a: Card; b: Card })
  | (Question & { kind: 'strongest'; cards: Card[] })
  | (Question & { kind: 'order'; cards: Card[] })
  | (Question & {
      kind: 'count'
      hand: Card[]
      options: number[]
      /** First tap the cards that count, then pick the total. */
      pick?: boolean
    })
  | (Question & {
      kind: 'choose'
      prompt: string
      options: string[]
      answer: number
      visual?: ReactNode
    })
  | (Common & { kind: 'play'; title: string; play: Play })

export interface Lesson {
  id: string
  title: string
  summary: string
  /** Index of its stage in the learning path. */
  stage: number
  /** Not needed to finish the path, like the flor. */
  optional?: boolean
  /** The quick guide section it is about. */
  guide?: GuideSection
  /** Shown when the lesson ends: what the learner did and what comes next. */
  outro: string
  /** Suggest a game with the helper when the lesson ends. */
  helperAfter?: boolean
  steps: Step[]
}

/** Whether the learner may take this move at this cue. */
export function cueAllows(cue: Cue, action: Action): boolean {
  return [cue.expect, ...(cue.or ?? [])].some((a) => sameAction(a, action))
}

/** Every move the learner may try at a cue, including the ones that get a retry. */
export function cueMoves(cue: Cue): Action[] {
  return [cue.expect, ...(cue.or ?? []), ...(cue.free?.replies.map((r) => r.action) ?? [])]
}

/** Whether an action is allowed in a practice hand. */
export function practiceAllows(calls: Calls, action: Action): boolean {
  if (action.type === 'play') return true
  return calls === 'truco' && action.type !== 'envido'
}

const envidoValue = (card: Card) => (card.rank >= 10 ? 0 : card.rank)

/** What some picked cards are worth for the envido, or null if they can't be the ones that count. */
function pickedEnvido(cards: Card[]): number | null {
  const [a, b] = cards
  if (!a) return 0
  if (!b) return envidoValue(a)
  return cards.length === 2 && a.suit === b.suit ? 20 + envidoValue(a) + envidoValue(b) : null
}

/** Whether the picked cards are the ones that make the hand's envido. */
export const countsForEnvido = (hand: Card[], picked: Card[]) =>
  pickedEnvido(picked) === envidoPoints(hand)

/** One way to pick the cards that make the hand's envido. */
export function envidoCards(hand: Card[]): Card[] {
  const pairs = hand.flatMap((a, i) => hand.slice(i + 1).map((b) => [a, b]))
  const options = [...pairs, ...hand.map((a) => [a]), []]
  return options.find((cards) => countsForEnvido(hand, cards))!
}

/** The envido of these cards written out, like "20 + 6 + 3". */
export function envidoSum(cards: Card[]): string {
  const values = cards.map(envidoValue)
  return cards.length === 2 ? `20 + ${values.join(' + ')}` : String(values[0] ?? 0)
}

/** The text shown when a play ends. */
export const doneText = (play: Play, state: GameState) =>
  typeof play.done === 'string' ? play.done : play.done(state)

export function sameAction(a: Action, b: Action): boolean {
  if (a.type !== b.type) return false
  if (a.type === 'play' && b.type === 'play')
    return a.card.rank === b.card.rank && a.card.suit === b.card.suit
  if (a.type === 'envido' && b.type === 'envido') return a.call === b.call
  return true
}

/** The game a play starts from: a 15-point game, no flor, with the prepared hands. */
export function playStart(play: Play, seed = 1): GameState {
  const state = createGame({ flor: false, target: 15 }, seed)
  state.scores = [0, 0]
  startRound(state, play.mano, play.hands)
  return state
}

/**
 * The rival's move: the next scripted one while it is legal, or the easy bot,
 * which in a practice hand only gets the allowed moves.
 */
export function rivalMove(play: Play, state: GameState, used: number, seed = 1): Action {
  const legal = legalActions(state, RIVAL).filter(
    (a) => !play.practice || practiceAllows(play.practice, a),
  )
  const scripted = play.rival[used]
  if (scripted && legal.some((a) => sameAction(a, scripted))) return scripted
  const move = bots.easy(viewFor(state, RIVAL), legal, seededRandom(seed))
  return legal.some((a) => sameAction(a, move)) ? move : legal[0]!
}

/**
 * Plays a lesson's hand without delays, the learner taking the first legal of
 * each cue's moves, or in a practice hand the first allowed move. Throws if a
 * move is illegal or the goal is never reached; used by tests.
 */
export function runPlay(
  play: Play,
  seed = 1,
  /** Told the state each time the learner is about to take a cue. */
  onCue?: (index: number, state: GameState) => void,
): { state: GameState; events: GameEvent[] } {
  let state = playStart(play, seed)
  const events: GameEvent[] = []
  let cue = 0
  let rival = 0
  for (let i = 0; i < 80 && !play.goal(state, events); i++) {
    const seat = actorOf(state)
    if (seat === null) break
    let action: Action
    if (seat === ME) {
      const legal = legalActions(state, ME)
      if (play.practice) {
        action = legal.find((a) => practiceAllows(play.practice!, a))!
      } else {
        onCue?.(cue, state)
        const next = play.cues[cue++]
        if (!next) throw new Error('the learner has no cue left')
        const moves = [next.expect, ...(next.or ?? [])]
        action = moves.find((m) => legal.some((a) => sameAction(a, m))) ?? next.expect
      }
    } else {
      action = rivalMove(play, state, rival++, seed + i)
    }
    const result = applyAction(state, seat, action)
    if (!result.ok) throw new Error(`illegal ${JSON.stringify(action)} for seat ${seat}`)
    state = result.state
    events.push(...result.events)
  }
  if (!play.goal(state, events)) throw new Error('goal not reached')
  return { state, events }
}
