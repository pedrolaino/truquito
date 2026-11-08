import { RANKS, SUITS, type Card } from '../engine/cards.ts'
import type { Action, GameConfig, GameEvent, GameView } from '../engine/game.ts'
import { config } from './config.ts'

export interface PlayerInfo {
  name: string
  connected: boolean
}

export interface RoomInfo {
  config: GameConfig
  players: PlayerInfo[]
  full: boolean
}

/** Everything one seat gets after each change in the room. */
export interface RoomSnapshot {
  seq: number
  seat: number
  config: GameConfig
  players: PlayerInfo[]
  game: GameView | null
  events: GameEvent[]
  rematch: boolean[]
  /** Seat that lost by not coming back in time. */
  abandonedBy: number | null
  /** When each disconnected player loses, in ms since epoch. */
  deadlines: (number | null)[]
}

export type ClientMessage =
  | { type: 'auth'; token: string }
  | { type: 'action'; seq: number; action: Action }
  | { type: 'rematch' }

export type ServerMessage =
  { type: 'state'; state: RoomSnapshot } | { type: 'error'; error: ErrorCode }

export type ErrorCode =
  'bad_message' | 'bad_token' | 'not_authenticated' | 'stale' | 'illegal' | 'too_many_messages'

const HEX_128 = /^[0-9a-f]{32}$/
export const isId = (value: unknown): value is string =>
  typeof value === 'string' && HEX_128.test(value)

export function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Trims and checks a player name; null when invalid. */
export function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const name = value.trim().replace(/\s+/g, ' ')
  const length = [...name].length
  return length >= 1 && length <= config.room.maxNameLength ? name : null
}

export function parseGameConfig(value: unknown): GameConfig | null {
  if (!isObject(value)) return null
  const { flor, target } = value
  if (typeof flor !== 'boolean' || (target !== 15 && target !== 30)) return null
  return { flor, target }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function parseCard(value: unknown): Card | null {
  if (!isObject(value)) return null
  const { rank, suit } = value
  if (!RANKS.includes(rank as Card['rank']) || !SUITS.includes(suit as Card['suit'])) return null
  return { rank: rank as Card['rank'], suit: suit as Card['suit'] }
}

function parseAction(value: unknown): Action | null {
  if (!isObject(value)) return null
  switch (value.type) {
    case 'play': {
      const card = parseCard(value.card)
      return card && { type: 'play', card }
    }
    case 'envido':
      return value.call === 'envido' || value.call === 'realEnvido' || value.call === 'faltaEnvido'
        ? { type: 'envido', call: value.call }
        : null
    case 'truco':
    case 'quiero':
    case 'noQuiero':
    case 'mazo':
      return { type: value.type }
    default:
      return null
  }
}

export function parseClientMessage(raw: string | ArrayBuffer): ClientMessage | null {
  if (typeof raw !== 'string' || raw.length > config.room.maxMessageBytes) return null
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isObject(data)) return null
  switch (data.type) {
    case 'auth':
      return isId(data.token) ? { type: 'auth', token: data.token } : null
    case 'action': {
      const action = parseAction(data.action)
      return action && Number.isSafeInteger(data.seq)
        ? { type: 'action', seq: data.seq as number, action }
        : null
    }
    case 'rematch':
      return { type: 'rematch' }
    default:
      return null
  }
}
