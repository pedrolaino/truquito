import {
  type Card,
  createDeck,
  envidoPoints,
  florPoints,
  hasFlor,
  cardPower,
  sameCard,
} from './cards.ts'
import { nextRandom, shuffle } from './rng.ts'

export interface GameConfig {
  flor: boolean
  target: 15 | 30
}

export type EnvidoCall = 'envido' | 'realEnvido' | 'faltaEnvido'
export type TrucoCall = 'truco' | 'retruco' | 'valeCuatro'

export type Action =
  | { type: 'play'; card: Card }
  | { type: 'envido'; call: EnvidoCall }
  | { type: 'truco' }
  | { type: 'quiero' }
  | { type: 'noQuiero' }
  | { type: 'mazo' }

export type GameEvent =
  | { type: 'deal'; round: number; mano: number }
  | { type: 'play'; seat: number; card: Card }
  | { type: 'trick'; winner: number | 'parda' }
  | { type: 'call'; seat: number; call: EnvidoCall | TrucoCall }
  | { type: 'quiero'; seat: number }
  | { type: 'noQuiero'; seat: number }
  | { type: 'mazo'; seat: number }
  | { type: 'flor'; seat: number }
  | { type: 'points'; kind: 'envido' | 'flor'; seat: number; points: number }
  | { type: 'sonBuenas'; seat: number }
  | { type: 'score'; seat: number; points: number; reason: 'envido' | 'flor' | 'round' }
  | { type: 'roundEnd'; winner: number }
  | { type: 'gameEnd'; winner: number }

export interface Trick {
  lead: number
  /** Card played by each seat, null until played. */
  cards: (Card | null)[]
  winner: number | 'parda' | null
}

export interface Round {
  mano: number
  /** The three cards each seat got. Views hide every seat but their own. */
  dealt: Card[][]
  tricks: Trick[]
  /** Seat that plays next when nothing is pending. */
  turn: number
  envido: { calls: EnvidoCall[]; caller: number | null; status: 'open' | 'pending' | 'closed' }
  truco: {
    /** Points the round is worth right now. */
    level: 1 | 2 | 3 | 4
    /** Seat that accepted the last call: only they can raise. */
    holder: number | null
    pending: { level: 2 | 3 | 4; caller: number } | null
  }
  /** Seats that had flor, which is public once sung. */
  flor: number[]
  /** Envido or flor points said out loud. */
  announced: { kind: 'envido' | 'flor'; seat: number; points: number }[]
  winner: number | null
}

export interface GameState {
  config: GameConfig
  seats: number
  scores: number[]
  /** PRNG state. Never leaves the server: it would reveal future hands. */
  seed: number
  roundNumber: number
  round: Round
  previous: Round | null
  winner: number | null
}

export type RoundView = Omit<Round, 'dealt'> & { dealt: (Card[] | null)[] }
export type GameView = Omit<GameState, 'seed' | 'round' | 'previous'> & {
  seat: number
  round: RoundView
  previous: RoundView | null
}

export type ActionResult =
  { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: string }

type Public = Pick<GameView, 'seats' | 'winner'> & { round: RoundView }

const TRUCO_CALLS: Record<2 | 3 | 4, TrucoCall> = { 2: 'truco', 3: 'retruco', 4: 'valeCuatro' }
const ENVIDO_VALUE = { envido: 2, realEnvido: 3 } as const

export const nextSeat = (game: Pick<GameState, 'seats'>, seat: number) => (seat + 1) % game.seats

export function createGame(config: GameConfig, seed: number): GameState {
  const draw = nextRandom(seed >>> 0)
  const seats = 2
  const state: GameState = {
    config,
    seats,
    scores: Array<number>(seats).fill(0),
    seed: draw.seed,
    roundNumber: 1,
    round: undefined as unknown as Round,
    previous: null,
    winner: null,
  }
  startRound(state, Math.floor(draw.value * seats))
  return state
}

/** Deals a new round in place. Tests pass `dealt` to choose the hands. */
export function startRound(state: GameState, mano: number, dealt?: Card[][]): GameEvent[] {
  if (!dealt) {
    const shuffled = shuffle(createDeck(), state.seed)
    state.seed = shuffled.seed
    dealt = Array.from({ length: state.seats }, (_, s) => shuffled.items.slice(s * 3, s * 3 + 3))
  }
  state.round = {
    mano,
    dealt,
    tricks: [newTrick(state, mano)],
    turn: mano,
    envido: { calls: [], caller: null, status: 'open' },
    truco: { level: 1, holder: null, pending: null },
    flor: [],
    announced: [],
    winner: null,
  }
  const events: GameEvent[] = [{ type: 'deal', round: state.roundNumber, mano }]
  if (state.config.flor) singFlor(state, events)
  return events
}

function newTrick(state: GameState, lead: number): Trick {
  return { lead, cards: Array<Card | null>(state.seats).fill(null), winner: null }
}

function singFlor(state: GameState, events: GameEvent[]) {
  const r = state.round
  r.flor = seatsFrom(state, r.mano).filter((s) => hasFlor(r.dealt[s]!))
  if (r.flor.length === 0) return
  r.envido.status = 'closed'
  for (const seat of r.flor) events.push({ type: 'flor', seat })
  if (r.flor.length === 1) return addScore(state, r.flor[0]!, 3, 'flor', events)
  const winner = compareAloud(state, 'flor', r.flor, (s) => florPoints(r.dealt[s]!), events)
  addScore(state, winner, 6, 'flor', events)
}

/** Seats in playing order starting from `first`. */
function seatsFrom(state: GameState, first: number): number[] {
  return Array.from({ length: state.seats }, (_, i) => (first + i) % state.seats)
}

/**
 * Announces points in order: each seat speaks only if it beats the best so
 * far, otherwise says "son buenas". Earlier seats win ties.
 */
function compareAloud(
  state: GameState,
  kind: 'envido' | 'flor',
  seats: number[],
  pointsOf: (seat: number) => number,
  events: GameEvent[],
): number {
  let best = -1
  let winner = seats[0]!
  for (const seat of seats) {
    const points = pointsOf(seat)
    if (points > best) {
      best = points
      winner = seat
      state.round.announced.push({ kind, seat, points })
      events.push({ type: 'points', kind, seat, points })
    } else {
      events.push({ type: 'sonBuenas', seat })
    }
  }
  return winner
}

function addScore(
  state: GameState,
  seat: number,
  points: number,
  reason: 'envido' | 'flor' | 'round',
  events: GameEvent[],
) {
  if (state.winner !== null) return
  state.scores[seat] = Math.min(state.config.target, state.scores[seat]! + points)
  events.push({ type: 'score', seat, points, reason })
  if (state.scores[seat] === state.config.target) {
    state.winner = seat
    events.push({ type: 'gameEnd', winner: seat })
  }
}

/** Whose move it is, or null when the game is over. */
export function actorOf(game: Public): number | null {
  if (game.winner !== null) return null
  const { envido, truco, turn } = game.round
  if (envido.status === 'pending') return (envido.caller! + 1) % game.seats
  if (truco.pending) return (truco.pending.caller + 1) % game.seats
  return turn
}

/** Cards a seat still holds. Works on views for the seat's own hand. */
export function handOf(round: RoundView, seat: number): Card[] {
  const played = round.tricks.map((t) => t.cards[seat]).filter((c): c is Card => c !== null)
  return (round.dealt[seat] ?? []).filter((card) => !played.some((p) => sameCard(p, card)))
}

function nextEnvidoCalls(calls: EnvidoCall[]): EnvidoCall[] {
  const last = calls.at(-1)
  if (last === 'faltaEnvido') return []
  if (last === 'realEnvido') return ['faltaEnvido']
  const envidos = calls.filter((c) => c === 'envido').length
  return envidos < 2 ? ['envido', 'realEnvido', 'faltaEnvido'] : ['realEnvido', 'faltaEnvido']
}

function canCallEnvido(round: RoundView, seat: number): boolean {
  const { envido, truco, tricks } = round
  return (
    envido.status === 'open' &&
    tricks.length === 1 &&
    tricks[0]!.cards[seat] === null &&
    truco.level === 1 &&
    (truco.pending === null || truco.pending.level === 2)
  )
}

export function legalActions(game: Public, seat: number): Action[] {
  if (actorOf(game) !== seat) return []
  const r = game.round
  const envidoCalls = (calls: EnvidoCall[]): Action[] =>
    nextEnvidoCalls(calls).map((call) => ({ type: 'envido', call }))
  const actions: Action[] = []

  if (r.envido.status === 'pending') {
    actions.push({ type: 'quiero' }, { type: 'noQuiero' }, ...envidoCalls(r.envido.calls))
  } else if (r.truco.pending) {
    actions.push({ type: 'quiero' }, { type: 'noQuiero' })
    if (r.truco.pending.level < 4) actions.push({ type: 'truco' })
    if (canCallEnvido(r, seat)) actions.push(...envidoCalls([]))
  } else {
    for (const card of handOf(r, seat)) actions.push({ type: 'play', card })
    if (canCallEnvido(r, seat)) actions.push(...envidoCalls([]))
    const { level, holder } = r.truco
    if (level === 1 || (holder === seat && level < 4)) actions.push({ type: 'truco' })
  }
  actions.push({ type: 'mazo' })
  return actions
}

function sameAction(a: Action, b: Action): boolean {
  if (a.type !== b.type) return false
  if (a.type === 'play') return b.type === 'play' && sameCard(a.card, b.card)
  if (a.type === 'envido') return b.type === 'envido' && a.call === b.call
  return true
}

export function applyAction(game: GameState, seat: number, action: Action): ActionResult {
  const legal = legalActions(game, seat).find((a) => sameAction(a, action))
  if (!legal) return { ok: false, error: 'illegal action' }

  const state = structuredClone(game)
  const r = state.round
  const events: GameEvent[] = []

  switch (legal.type) {
    case 'play':
      playCard(state, seat, legal.card, events)
      break
    case 'envido':
      r.envido = { calls: [...r.envido.calls, legal.call], caller: seat, status: 'pending' }
      events.push({ type: 'call', seat, call: legal.call })
      break
    case 'truco': {
      const { pending } = r.truco
      // Raising while answering accepts the call being answered.
      if (pending) r.truco = { level: pending.level, holder: seat, pending: null }
      const level = (r.truco.level + 1) as 2 | 3 | 4
      r.truco.pending = { level, caller: seat }
      events.push({ type: 'call', seat, call: TRUCO_CALLS[level] })
      break
    }
    case 'quiero':
      events.push({ type: 'quiero', seat })
      if (r.envido.status === 'pending') playEnvido(state, events)
      else r.truco = { level: r.truco.pending!.level, holder: seat, pending: null }
      break
    case 'noQuiero':
      events.push({ type: 'noQuiero', seat })
      if (r.envido.status === 'pending') declineEnvido(state, events)
      else endRound(state, r.truco.pending!.caller, events)
      break
    case 'mazo':
      events.push({ type: 'mazo', seat })
      if (r.envido.status === 'pending') declineEnvido(state, events)
      endRound(state, nextSeat(state, seat), events)
      break
  }
  return { ok: true, state, events }
}

function declineEnvido(state: GameState, events: GameEvent[]) {
  const { calls, caller } = state.round.envido
  state.round.envido.status = 'closed'
  const before = calls.slice(0, -1)
  const points = before.length === 0 ? 1 : before.reduce((sum, c) => sum + envidoValue(state, c), 0)
  addScore(state, caller!, points, 'envido', events)
}

function envidoValue(state: GameState, call: EnvidoCall): number {
  if (call === 'faltaEnvido') return state.config.target - Math.max(...state.scores)
  return ENVIDO_VALUE[call]
}

function playEnvido(state: GameState, events: GameEvent[]) {
  const r = state.round
  r.envido.status = 'closed'
  const points = r.envido.calls.includes('faltaEnvido')
    ? envidoValue(state, 'faltaEnvido')
    : r.envido.calls.reduce((sum, c) => sum + envidoValue(state, c), 0)
  const winner = compareAloud(
    state,
    'envido',
    seatsFrom(state, r.mano),
    (s) => envidoPoints(r.dealt[s]!),
    events,
  )
  addScore(state, winner, points, 'envido', events)
}

function playCard(state: GameState, seat: number, card: Card, events: GameEvent[]) {
  const r = state.round
  const trick = r.tricks.at(-1)!
  trick.cards[seat] = card
  events.push({ type: 'play', seat, card })
  if (trick.cards.some((c) => c === null)) {
    r.turn = nextSeat(state, seat)
    return
  }
  const powers = trick.cards.map((c) => cardPower(c!))
  const best = Math.max(...powers)
  const top = powers.flatMap((p, s) => (p === best ? [s] : []))
  trick.winner = top.length === 1 ? top[0]! : 'parda'
  events.push({ type: 'trick', winner: trick.winner })

  const winner = roundWinner(r)
  if (winner !== null) return endRound(state, winner, events)
  const lead = trick.winner === 'parda' ? r.mano : trick.winner
  r.tricks.push(newTrick(state, lead))
  r.turn = lead
}

/** Who won the round given its tricks so far, or null while it is still open. */
export function roundWinner(r: Pick<Round, 'tricks' | 'mano'>): number | null {
  const [a, b, c] = r.tricks.map((t) => t.winner)
  if (c !== undefined) {
    if (c !== 'parda') return c
    return a !== 'parda' ? a! : r.mano
  }
  if (b === undefined) return null
  if (a !== 'parda') return a === b || b === 'parda' ? a! : null
  return b !== 'parda' ? b! : null
}

function endRound(state: GameState, winner: number, events: GameEvent[]) {
  if (state.winner !== null) return
  const r = state.round
  addScore(state, winner, r.truco.level, 'round', events)
  r.winner = winner
  events.push({ type: 'roundEnd', winner })
  if (state.winner !== null) return
  state.previous = r
  state.roundNumber++
  events.push(...startRound(state, nextSeat(state, r.mano)))
}

export function viewFor(state: GameState, seat: number): GameView {
  const hide = (round: Round): RoundView => ({
    ...round,
    dealt: round.dealt.map((hand, s) => (s === seat ? hand : null)),
  })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { seed, round, previous, ...rest } = state
  return { ...rest, seat, round: hide(round), previous: previous && hide(previous) }
}
