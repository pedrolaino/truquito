import { describe, expect, it } from 'vitest'
import { LEVELS } from './Guide.tsx'

describe('quick guide', () => {
  it('lists the 14 levels of the ranking with all 40 cards', () => {
    expect(LEVELS).toHaveLength(14)
    expect(LEVELS.flat()).toHaveLength(40)
    expect(LEVELS[0]).toEqual([{ rank: 1, suit: 'espada' }])
    expect(LEVELS.at(-1)!.every((c) => c.rank === 4)).toBe(true)
  })
})
