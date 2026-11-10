import { describe, expect, it } from 'vitest'
import { STICKS } from './Fosforos.tsx'

describe('matchstick square', () => {
  it('starts with the head of the first match pointing up', () => {
    const [, tailY, , headY] = STICKS[0]
    expect(headY).toBeLessThan(tailY)
  })

  it('never stacks two match heads on the same spot', () => {
    const heads = STICKS.map(([, , x, y]) => [x, y] as const)
    for (let i = 0; i < heads.length; i++)
      for (let j = i + 1; j < heads.length; j++) {
        const [a, b] = [heads[i]!, heads[j]!]
        expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeGreaterThan(9)
      }
  })
})
