import { describe, expect, it } from 'vitest'
import { bots } from '../bots/index.ts'
import { seededRandom } from '../bots/match.ts'
import { actorOf, legalActions } from '../engine/game.ts'
import { BOT, BotGame, type Decide, HUMAN, type Schedule } from './botGame.ts'

function fakeClock() {
  let timers: { at: number; fn: () => void }[] = []
  let now = 0
  const schedule: Schedule = (fn, ms) => {
    const timer = { at: now + ms, fn }
    timers.push(timer)
    return () => (timers = timers.filter((t) => t !== timer))
  }
  const advance = async (ms: number) => {
    now += ms
    const due = timers.filter((t) => t.at <= now)
    timers = timers.filter((t) => t.at > now)
    due.forEach((t) => t.fn())
    await new Promise((r) => setTimeout(r, 0))
  }
  return { schedule, advance, pending: () => timers.length }
}

const decide: Decide = async (level, view, legal, seed) =>
  bots[level](view, legal, seededRandom(seed))

function setup() {
  const clock = fakeClock()
  // Seed 3 makes the bot the first mano.
  const game = new BotGame(
    'medium',
    { flor: false, target: 15 },
    3,
    decide,
    clock.schedule,
    seededRandom(1),
  )
  return { clock, game }
}

describe('bot game', () => {
  it('the bot waits its thinking time before acting', async () => {
    const { clock, game } = setup()
    expect(actorOf(game.getSnapshot().state)).toBe(BOT)
    await clock.advance(500)
    expect(game.getSnapshot().events).toEqual([])
    await clock.advance(1000)
    expect(game.getSnapshot().events.length).toBeGreaterThan(0)
  })

  it('ignores moves that are not legal or not the human turn', () => {
    const { game } = setup()
    expect(game.play({ type: 'mazo' })).toBe(false)
  })

  it('plays a whole game with the human answering', async () => {
    const { clock, game } = setup()
    for (let i = 0; i < 500 && game.getSnapshot().state.winner === null; i++) {
      const { state } = game.getSnapshot()
      if (actorOf(state) === HUMAN) game.play(legalActions(state, HUMAN)[0]!)
      await clock.advance(1500)
    }
    expect(game.getSnapshot().state.winner).not.toBeNull()
    expect(clock.pending()).toBe(0)
  })

  it('stops the bot when disposed', async () => {
    const { clock, game } = setup()
    game.dispose()
    await clock.advance(5000)
    expect(game.getSnapshot().events).toEqual([])
  })
})
