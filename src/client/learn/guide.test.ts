import { describe, expect, it } from 'vitest'
import { LEVELS, verdict } from './Guide.tsx'

describe('quick guide', () => {
  it('lists the 14 levels of the ranking with all 40 cards', () => {
    expect(LEVELS).toHaveLength(14)
    expect(LEVELS.flat()).toHaveLength(40)
    expect(LEVELS[0]).toEqual([{ rank: 1, suit: 'espada' }])
    expect(LEVELS.at(-1)!.every((c) => c.rank === 4)).toBe(true)
  })

  it('says which card wins or that they tie', () => {
    expect(verdict({ rank: 3, suit: 'copa' }, { rank: 7, suit: 'oro' })).toBe(
      '7 de oro le gana a 3 de copa',
    )
    expect(verdict({ rank: 3, suit: 'copa' }, { rank: 3, suit: 'oro' })).toBe(
      '3 de copa y 3 de oro empatan: es parda',
    )
  })
})
