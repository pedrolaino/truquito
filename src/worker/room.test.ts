import { env, evictDurableObject, runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test'
import { exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { legalActions } from '../engine/game.ts'
import { config } from '../shared/config.ts'
import type { RoomSnapshot, ServerMessage } from '../shared/protocol.ts'
import type { Room } from './room.ts'

const base = 'https://truquito.test'
let ip = 1

async function api(path: string, body?: unknown) {
  const res = await exports.default.fetch(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
    // Each request looks like a different client so the room creation limit stays out of the way.
    headers: { 'CF-Connecting-IP': `10.0.${ip >> 8}.${ip++ & 255}` },
  })
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}

async function createRoom(gameConfig = { flor: false, target: 15 }) {
  const res = await api('/api/rooms', { name: 'Ana', ...gameConfig })
  expect(res.status).toBe(201)
  return { roomId: res.body.roomId as string, token: res.body.token as string }
}

class Client {
  messages: ServerMessage[] = []
  private waiters: (() => void)[] = []
  closed = false

  constructor(public ws: WebSocket) {
    ws.addEventListener('message', (e) => {
      this.messages.push(JSON.parse(e.data as string) as ServerMessage)
      this.waiters.splice(0).forEach((w) => w())
    })
    ws.addEventListener('close', () => (this.closed = true))
  }

  static async connect(roomId: string, token?: string): Promise<Client> {
    const res = await exports.default.fetch(`${base}/api/rooms/${roomId}/ws`, {
      headers: { Upgrade: 'websocket' },
    })
    expect(res.status).toBe(101)
    res.webSocket!.accept()
    const client = new Client(res.webSocket!)
    if (token) {
      client.send({ type: 'auth', token })
      await client.next((m) => m.type === 'state')
    }
    return client
  }

  send(message: unknown) {
    this.ws.send(typeof message === 'string' ? message : JSON.stringify(message))
  }

  /** Waits for the next message (from now on) that matches. */
  /** Waits for a message that matches, received after `from` (default: now). */
  async next(
    match: (m: ServerMessage) => boolean = () => true,
    from = this.messages.length,
  ): Promise<ServerMessage> {
    for (;;) {
      const found = this.messages.slice(from).find(match)
      if (found) return found
      await new Promise<void>((resolve, reject) => {
        this.waiters.push(resolve)
        setTimeout(() => reject(new Error('no message')), 2000)
      })
    }
  }

  get state(): RoomSnapshot {
    const last = this.messages.findLast((m) => m.type === 'state')
    if (!last || last.type !== 'state') throw new Error('no state yet')
    return last.state
  }
}

async function startGame() {
  const { roomId, token } = await createRoom()
  const a = await Client.connect(roomId, token)
  const mark = a.messages.length
  const joined = await api(`/api/rooms/${roomId}/join`, { name: 'Beto' })
  expect(joined.body.seat).toBe(1)
  await a.next((m) => m.type === 'state' && m.state.game !== null, mark)
  const seen = a.messages.length
  const b = await Client.connect(roomId, joined.body.token as string)
  await a.next((m) => m.type === 'state' && m.state.players[1]!.connected, seen)
  return { roomId, a, b, tokens: [token, joined.body.token as string] }
}

const stub = (roomId: string) => env.ROOMS.get(env.ROOMS.idFromName(roomId))

describe('rooms over HTTP', () => {
  it('creates a room with a 128-bit id and shows its info', async () => {
    const { roomId, token } = await createRoom({ flor: true, target: 30 })
    expect(roomId).toMatch(/^[0-9a-f]{32}$/)
    expect(token).toMatch(/^[0-9a-f]{32}$/)
    const info = await api(`/api/rooms/${roomId}`)
    expect(info.body).toEqual({
      config: { flor: true, target: 30 },
      players: [{ name: 'Ana', connected: false }],
      full: false,
    })
  })

  it('validates the name and the settings', async () => {
    expect((await api('/api/rooms', { name: '', flor: true, target: 15 })).status).toBe(400)
    expect((await api('/api/rooms', { name: 'x'.repeat(21), flor: true, target: 15 })).status).toBe(
      400,
    )
    expect((await api('/api/rooms', { name: 'Ana', flor: 'si', target: 15 })).status).toBe(400)
    expect((await api('/api/rooms', { name: 'Ana', flor: true, target: 20 })).status).toBe(400)
    const { roomId } = await createRoom()
    expect((await api(`/api/rooms/${roomId}/join`, { name: '   ' })).status).toBe(400)
  })

  it('says when a room is full or does not exist', async () => {
    const { roomId } = await createRoom()
    expect((await api(`/api/rooms/${roomId}/join`, { name: 'Beto' })).status).toBe(200)
    expect((await api(`/api/rooms/${roomId}/join`, { name: 'Caro' })).status).toBe(409)
    expect((await api(`/api/rooms/${'f'.repeat(32)}`)).status).toBe(404)
    expect((await api(`/api/rooms/${'f'.repeat(32)}/join`, { name: 'Caro' })).status).toBe(404)
    expect((await api('/api/rooms/not-an-id')).status).toBe(404)
  })
})

describe('playing', () => {
  it('starts when the second player joins and only shows each seat its own cards', async () => {
    const { a, b } = await startGame()
    expect(a.state.game?.round.dealt[0]).toHaveLength(3)
    expect(a.state.game?.round.dealt[1]).toBeNull()
    expect(b.state.game?.round.dealt[0]).toBeNull()
    expect(b.state.players).toEqual([
      { name: 'Ana', connected: true },
      { name: 'Beto', connected: true },
    ])
    expect(JSON.stringify(a.state)).not.toContain('seed')
  })

  it('applies legal actions and sends both players the new state', async () => {
    const { a, b } = await startGame()
    const actor = a.state.game!.round.turn === 0 ? a : b
    const seat = actor.state.seat
    const action = legalActions(actor.state.game!, seat).find((x) => x.type === 'play')!
    const seq = actor.state.seq
    actor.send({ type: 'action', seq, action })
    const [ma, mb] = await Promise.all([
      a.next((m) => m.type === 'state' && m.state.seq > seq),
      b.next((m) => m.type === 'state' && m.state.seq > seq),
    ])
    for (const m of [ma, mb])
      expect(m.type === 'state' && m.state.events[0]).toEqual({ ...action, seat })
  })

  it('rejects illegal and stale actions', async () => {
    const { a, b } = await startGame()
    const waiting = a.state.game!.round.turn === 0 ? b : a
    waiting.send({ type: 'action', seq: waiting.state.seq, action: { type: 'mazo' } })
    expect(await waiting.next()).toEqual({ type: 'error', error: 'illegal' })
    const actor = waiting === a ? b : a
    actor.send({ type: 'action', seq: -1, action: { type: 'mazo' } })
    expect(await actor.next()).toEqual({ type: 'error', error: 'stale' })
  })
})

describe('invalid messages', () => {
  it('rejects garbage, oversized messages and unknown tokens', async () => {
    const { roomId } = await createRoom()
    const c = await Client.connect(roomId)
    c.send('not json')
    expect(await c.next()).toEqual({ type: 'error', error: 'bad_message' })
    c.send({ type: 'action', seq: 0, action: { type: 'play', card: { rank: 8, suit: 'oro' } } })
    expect(await c.next()).toEqual({ type: 'error', error: 'bad_message' })
    c.send({ type: 'rematch', padding: 'x'.repeat(config.room.maxMessageBytes) })
    expect(await c.next()).toEqual({ type: 'error', error: 'bad_message' })
    c.send({ type: 'rematch' })
    expect(await c.next()).toEqual({ type: 'error', error: 'not_authenticated' })
    c.send({ type: 'auth', token: '0'.repeat(32) })
    expect(await c.next()).toEqual({ type: 'error', error: 'bad_token' })
  })

  it('limits how many messages a connection can send', async () => {
    const { roomId } = await createRoom()
    const c = await Client.connect(roomId)
    for (let i = 0; i <= config.room.messageBurst; i++) c.send({ type: 'rematch' })
    await c.next((m) => m.type === 'error' && m.error === 'too_many_messages')
  })
})

describe('reconnecting', () => {
  it('shows the opponent as disconnected and gives the seat back with the token', async () => {
    const { roomId, a, b, tokens } = await startGame()
    const hand = a.state.game!.round.dealt[0]
    a.ws.close()
    const seen = await b.next((m) => m.type === 'state' && !m.state.players[0]!.connected)
    expect(seen.type === 'state' && seen.state.deadlines[0]).toBeGreaterThan(Date.now())

    const mark = b.messages.length
    const again = await Client.connect(roomId, tokens[0])
    expect(again.state.seat).toBe(0)
    expect(again.state.game!.round.dealt[0]).toEqual(hand)
    await b.next((m) => m.type === 'state' && m.state.players[0]!.connected, mark)
  })

  it('the opponent wins if the player does not come back in time', async () => {
    const { roomId, a, b } = await startGame()
    a.ws.close()
    await b.next((m) => m.type === 'state' && !m.state.players[0]!.connected)
    await runInDurableObject(stub(roomId), (room: Room) => {
      room.data!.disconnectedAt[0] = Date.now() - config.room.reconnectGraceMs - 1
    })
    const mark = b.messages.length
    expect(await runDurableObjectAlarm(stub(roomId))).toBe(true)
    const end = await b.next((m) => m.type === 'state' && m.state.abandonedBy !== null, mark)
    expect(end.type === 'state' && end.state.abandonedBy).toBe(0)
  })

  it('survives hibernation with the game and the connections', async () => {
    const { roomId, a, b } = await startGame()
    const before = a.state
    await evictDurableObject(stub(roomId))
    const actor = before.game!.round.turn === 0 ? a : b
    const action = legalActions(actor.state.game!, actor.state.seat).find((x) => x.type === 'play')!
    actor.send({ type: 'action', seq: actor.state.seq, action })
    const after = await a.next((m) => m.type === 'state')
    expect(after.type === 'state' && after.state.seq).toBe(before.seq + 1)
    expect(after.type === 'state' && after.state.game?.round.dealt[0]).toEqual(
      before.game!.round.dealt[0],
    )
  })
})

describe('rematch', () => {
  it('starts a new game in the same room when both accept', async () => {
    const { roomId, a, b } = await startGame()
    await runInDurableObject(stub(roomId), (room: Room) => {
      room.data!.game!.winner = 1
    })
    a.send({ type: 'rematch' })
    await b.next((m) => m.type === 'state' && m.state.rematch[0] === true)
    b.send({ type: 'rematch' })
    const fresh = await a.next((m) => m.type === 'state' && m.state.rematch.every((r) => !r))
    expect(fresh.type === 'state' && fresh.state.game?.winner).toBeNull()
    expect(fresh.type === 'state' && fresh.state.game?.scores).toEqual([0, 0])
    expect(fresh.type === 'state' && fresh.state.config).toEqual({ flor: false, target: 15 })
  })

  it('is not allowed while the game is on', async () => {
    const { a } = await startGame()
    a.send({ type: 'rematch' })
    expect(await a.next()).toEqual({ type: 'error', error: 'illegal' })
  })
})

describe('cleanup', () => {
  it('deletes the room after a day without activity', async () => {
    const { roomId } = await createRoom()
    await runInDurableObject(stub(roomId), (room: Room) => {
      room.data!.lastActivity = Date.now() - config.room.idleTtlMs - 1
    })
    await runDurableObjectAlarm(stub(roomId))
    expect((await api(`/api/rooms/${roomId}`)).status).toBe(404)
  })
})
