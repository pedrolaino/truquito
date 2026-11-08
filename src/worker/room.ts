import { DurableObject } from 'cloudflare:workers'
import {
  type GameConfig,
  type GameEvent,
  type GameState,
  applyAction,
  createGame,
  viewFor,
} from '../engine/game.ts'
import { config } from '../shared/config.ts'
import {
  type ErrorCode,
  type RoomInfo,
  type RoomSnapshot,
  type ServerMessage,
  parseClientMessage,
  randomId,
} from '../shared/protocol.ts'

const SEATS = 2
const MAX_SOCKETS = 8

export interface RoomData {
  config: GameConfig
  players: { name: string; token: string }[]
  game: GameState | null
  seq: number
  /** Last seq that changed the game; actions based on older states are stale. */
  gameSeq: number
  rematch: boolean[]
  abandonedBy: number | null
  disconnectedAt: (number | null)[]
  lastActivity: number
}

interface Attachment {
  seat: number
}

export type JoinResult =
  { ok: true; token: string; seat: number } | { ok: false; error: 'not_found' | 'full' }

const randomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]!

/** One room: two seats, one game at a time, state saved after every change. */
export class Room extends DurableObject<Env> {
  data: RoomData | null
  // Per-connection message counters. Lost on hibernation, which only resets the window.
  private rates = new Map<WebSocket, { start: number; count: number }>()

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.data = ctx.storage.kv.get<RoomData>('room') ?? null
  }

  create(gameConfig: GameConfig, name: string): string | null {
    if (this.data) return null
    const token = randomId()
    this.data = {
      config: gameConfig,
      players: [{ name, token }],
      game: null,
      seq: 0,
      gameSeq: 0,
      rematch: [false, false],
      abandonedBy: null,
      disconnectedAt: [null, null],
      lastActivity: Date.now(),
    }
    this.save()
    return token
  }

  info(): RoomInfo | null {
    if (!this.data) return null
    return {
      config: this.data.config,
      players: this.players(),
      full: this.data.players.length >= SEATS,
    }
  }

  join(name: string): JoinResult {
    const d = this.data
    if (!d) return { ok: false, error: 'not_found' }
    if (d.players.length >= SEATS) return { ok: false, error: 'full' }
    const token = randomId()
    d.players.push({ name, token })
    this.newGame()
    this.changed(true, [])
    return { ok: true, token, seat: d.players.length - 1 }
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket')
      return new Response('Expected a WebSocket', { status: 426 })
    if (!this.data) return new Response('Room not found', { status: 404 })
    if (this.ctx.getWebSockets().length >= MAX_SOCKETS)
      return new Response('Too many connections', { status: 429 })
    const [client, server] = Object.values(new WebSocketPair())
    this.ctx.acceptWebSocket(server!)
    return new Response(null, { status: 101, webSocket: client })
  }

  webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const d = this.data
    if (!d) return ws.close(1008, 'room closed')
    if (this.limited(ws)) return
    const message = parseClientMessage(raw)
    if (!message) return this.fail(ws, 'bad_message')

    if (message.type === 'auth') {
      const seat = d.players.findIndex((p) => p.token === message.token)
      if (seat === -1) {
        this.fail(ws, 'bad_token')
        return ws.close(1008, 'bad token')
      }
      // A new connection for a seat replaces the old one.
      for (const other of this.socketsOf(seat)) if (other !== ws) other.close(1000, 'replaced')
      ws.serializeAttachment({ seat } satisfies Attachment)
      d.disconnectedAt[seat] = null
      return this.changed(false, [])
    }

    const seat = (ws.deserializeAttachment() as Attachment | null)?.seat
    if (seat === undefined) return this.fail(ws, 'not_authenticated')

    if (message.type === 'action') {
      if (!d.game || d.abandonedBy !== null) return this.fail(ws, 'illegal')
      if (message.seq < d.gameSeq) return this.fail(ws, 'stale')
      const result = applyAction(d.game, seat, message.action)
      if (!result.ok) return this.fail(ws, 'illegal')
      d.game = result.state
      return this.changed(true, result.events)
    }

    if (!this.finished()) return this.fail(ws, 'illegal')
    d.rematch[seat] = true
    if (d.rematch.every(Boolean)) {
      this.newGame()
      return this.changed(true, [])
    }
    this.changed(false, [])
  }

  webSocketClose(ws: WebSocket) {
    this.disconnected(ws)
  }

  webSocketError(ws: WebSocket) {
    this.disconnected(ws)
  }

  async alarm() {
    const d = this.data
    if (!d) return
    const now = Date.now()
    if (now >= d.lastActivity + config.room.idleTtlMs) {
      for (const ws of this.ctx.getWebSockets()) ws.close(1001, 'room expired')
      this.data = null
      await this.ctx.storage.deleteAll()
      return
    }
    const late = d.disconnectedAt.findIndex(
      (t) => t !== null && now >= t + config.room.reconnectGraceMs,
    )
    if (this.inProgress() && late !== -1) {
      d.abandonedBy = late
      return this.changed(true, [])
    }
    this.scheduleAlarm()
  }

  private newGame() {
    const d = this.data!
    d.game = createGame(d.config, randomSeed())
    d.rematch = [false, false]
    d.abandonedBy = null
    // Whoever is not connected when the game starts gets the full grace period from now.
    const connected = this.players().map((p) => p.connected)
    d.disconnectedAt = connected.map((on) => (on ? null : Date.now()))
  }

  private disconnected(ws: WebSocket) {
    this.rates.delete(ws)
    const seat = (ws.deserializeAttachment() as Attachment | null)?.seat
    const d = this.data
    if (!d || seat === undefined || this.socketsOf(seat).some((s) => s !== ws)) return
    d.disconnectedAt[seat] = Date.now()
    this.changed(false, [], ws)
  }

  private limited(ws: WebSocket): boolean {
    const now = Date.now()
    let rate = this.rates.get(ws)
    if (!rate || now - rate.start > config.room.messageWindowMs) {
      rate = { start: now, count: 0 }
      this.rates.set(ws, rate)
    }
    rate.count++
    if (rate.count > config.room.messageBurst * 2) ws.close(1008, 'too many messages')
    else if (rate.count > config.room.messageBurst) this.fail(ws, 'too_many_messages')
    return rate.count > config.room.messageBurst
  }

  private inProgress(): boolean {
    const d = this.data
    return !!d?.game && d.game.winner === null && d.abandonedBy === null
  }

  private finished(): boolean {
    const d = this.data
    return !!d?.game && (d.game.winner !== null || d.abandonedBy !== null)
  }

  private socketsOf(seat: number): WebSocket[] {
    return this.ctx
      .getWebSockets()
      .filter((ws) => (ws.deserializeAttachment() as Attachment | null)?.seat === seat)
  }

  private players(closing?: WebSocket) {
    return this.data!.players.map((p, seat) => ({
      name: p.name,
      connected: this.socketsOf(seat).some((ws) => ws !== closing),
    }))
  }

  /** Saves, bumps the sequence and sends every seat its own snapshot. */
  private changed(gameChanged: boolean, events: GameEvent[], closing?: WebSocket) {
    const d = this.data!
    d.seq++
    if (gameChanged) d.gameSeq = d.seq
    this.save()
    const players = this.players(closing)
    const active = this.inProgress()
    for (const ws of this.ctx.getWebSockets()) {
      const seat = (ws.deserializeAttachment() as Attachment | null)?.seat
      if (seat === undefined || ws === closing) continue
      const state: RoomSnapshot = {
        seq: d.seq,
        seat,
        config: d.config,
        players,
        game: d.game && viewFor(d.game, seat),
        events,
        rematch: d.rematch,
        abandonedBy: d.abandonedBy,
        deadlines: d.disconnectedAt.map((t) =>
          t !== null && active ? t + config.room.reconnectGraceMs : null,
        ),
      }
      send(ws, { type: 'state', state })
    }
  }

  private fail(ws: WebSocket, error: ErrorCode) {
    send(ws, { type: 'error', error })
  }

  private save() {
    const d = this.data!
    d.lastActivity = Date.now()
    this.ctx.storage.kv.put('room', d)
    this.scheduleAlarm()
  }

  private scheduleAlarm() {
    const d = this.data!
    const times = [d.lastActivity + config.room.idleTtlMs]
    if (this.inProgress())
      for (const t of d.disconnectedAt) if (t !== null) times.push(t + config.room.reconnectGraceMs)
    void this.ctx.storage.setAlarm(Math.min(...times))
  }
}

function send(ws: WebSocket, message: ServerMessage) {
  try {
    ws.send(JSON.stringify(message))
  } catch {
    // The socket is already closing; its close handler cleans up.
  }
}
