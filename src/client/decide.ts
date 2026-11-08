import type { Action } from '../engine/game.ts'
import type { Decide } from './botGame.ts'
import type { BotRequest } from './botWorker.ts'

let worker: Worker | null = null
let nextId = 0
const pending = new Map<number, { resolve: (a: Action) => void; reject: (e: unknown) => void }>()

function start(): Worker {
  const w = new Worker(new URL('./botWorker.ts', import.meta.url), { type: 'module' })
  w.onmessage = (e: MessageEvent<{ id: number; action: Action }>) => {
    pending.get(e.data.id)?.resolve(e.data.action)
    pending.delete(e.data.id)
  }
  w.onerror = (e) => {
    pending.forEach((p) => p.reject(e))
    pending.clear()
  }
  return w
}

/** Asks the bot worker for a move. */
export const decideInWorker: Decide = (level, view, legal, seed) => {
  worker ??= start()
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    worker!.postMessage({ id, level, view, legal, seed } satisfies BotRequest)
  })
}
