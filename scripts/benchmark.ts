// Bot against bot with a fixed seed: npm run benchmark -- [games per pairing]
import { bots, type Level } from '../src/bots/index.ts'
import { winRate } from '../src/bots/match.ts'

const games = Number(process.argv[2] ?? 1000)
const pairings: [Level, Level][] = [
  ['medium', 'easy'],
  ['hard', 'easy'],
  ['hard', 'medium'],
]

console.log(`${games} games per pairing, to 15 points without flor, seats alternate\n`)
for (const [a, b] of pairings) {
  const start = performance.now()
  const rate = winRate(bots[a], bots[b], games, 2024, { flor: false, target: 15 })
  const seconds = ((performance.now() - start) / 1000).toFixed(0)
  console.log(`${a.padEnd(6)} vs ${b.padEnd(6)}  ${(rate * 100).toFixed(1)}% wins  (${seconds}s)`)
}
