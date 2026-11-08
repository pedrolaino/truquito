import { exports } from 'cloudflare:workers'
import { expect, it } from 'vitest'

const id = 'a'.repeat(32)

it('keeps state in the room across requests', async () => {
  const first = await exports.default.fetch(`https://x/api/rooms/${id}/ping`)
  const second = await exports.default.fetch(`https://x/api/rooms/${id}/ping`)
  expect(await first.json()).toEqual({ pings: 1 })
  expect(await second.json()).toEqual({ pings: 2 })
})

it('returns 404 for unknown routes', async () => {
  const res = await exports.default.fetch('https://x/api/nope')
  expect(res.status).toBe(404)
})
