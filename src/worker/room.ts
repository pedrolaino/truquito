import { DurableObject } from 'cloudflare:workers'

export class Room extends DurableObject<Env> {
  async fetch(): Promise<Response> {
    const pings = (this.ctx.storage.kv.get<number>('pings') ?? 0) + 1
    this.ctx.storage.kv.put('pings', pings)
    return Response.json({ pings })
  }
}
