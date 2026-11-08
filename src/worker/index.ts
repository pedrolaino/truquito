export { Room } from './room'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const match = url.pathname.match(/^\/api\/rooms\/([0-9a-f]{32})\/ping$/)
    if (match) {
      const stub = env.ROOMS.get(env.ROOMS.idFromName(match[1]!))
      return stub.fetch(request)
    }
    return new Response('Not found', { status: 404 })
  },
} satisfies ExportedHandler<Env>
