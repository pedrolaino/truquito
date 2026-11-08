import { config } from '../shared/config.ts'
import { cleanName, isId, parseGameConfig, randomId } from '../shared/protocol.ts'

export { Room } from './room.ts'

const json = (body: unknown, status = 200) => Response.json(body, { status })

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const text = await request.text()
  if (text.length > config.room.maxMessageBytes) return null
  try {
    const data: unknown = JSON.parse(text)
    return typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null
  } catch {
    return null
  }
}

// shortcut: per-isolate counter, so the real limit is this times the isolates
// serving the app; move to a rate limiting binding if abuse shows up.
const created = new Map<string, number[]>()
function tooManyRooms(ip: string): boolean {
  const now = Date.now()
  const recent = (created.get(ip) ?? []).filter((t) => now - t < config.room.createWindowMs)
  if (recent.length >= config.room.createBurst) return true
  recent.push(now)
  created.set(ip, recent)
  if (created.size > 10_000) created.clear()
  return false
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const room = (id: string) => env.ROOMS.get(env.ROOMS.idFromName(id))

    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      if (tooManyRooms(request.headers.get('CF-Connecting-IP') ?? 'local'))
        return json({ error: 'rate_limited' }, 429)
      const body = await readJson(request)
      const name = cleanName(body?.name)
      const gameConfig = parseGameConfig(body)
      if (!name || !gameConfig) return json({ error: 'bad_request' }, 400)
      const roomId = randomId()
      const token = await room(roomId).create(gameConfig, name)
      if (!token) return json({ error: 'conflict' }, 409)
      return json({ roomId, token, seat: 0 }, 201)
    }

    const match = url.pathname.match(/^\/api\/rooms\/([^/]+)(\/join|\/ws)?$/)
    if (!match) return json({ error: 'not_found' }, 404)
    const [, roomId, action] = match
    if (!isId(roomId)) return json({ error: 'not_found' }, 404)
    const stub = room(roomId)

    if (action === '/ws') return stub.fetch(request)
    if (action === '/join' && request.method === 'POST') {
      const name = cleanName((await readJson(request))?.name)
      if (!name) return json({ error: 'bad_request' }, 400)
      const result = await stub.join(name)
      if (!result.ok) return json({ error: result.error }, result.error === 'full' ? 409 : 404)
      return json({ token: result.token, seat: result.seat })
    }
    if (!action && request.method === 'GET') {
      const info = await stub.info()
      return info ? json(info) : json({ error: 'not_found' }, 404)
    }
    return json({ error: 'not_found' }, 404)
  },
} satisfies ExportedHandler<Env>
