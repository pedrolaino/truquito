import { describe, expect, it } from 'vitest'
import { nextRandom, shuffle } from './rng'

describe('rng', () => {
  it('is reproducible from the same seed', () => {
    const a = shuffle([...Array(40).keys()], 42)
    const b = shuffle([...Array(40).keys()], 42)
    expect(a).toEqual(b)
    expect(a.seed).not.toBe(42)
  })

  it('keeps every element when shuffling', () => {
    const { items } = shuffle([...Array(40).keys()], 7)
    expect([...items].sort((x, y) => x - y)).toEqual([...Array(40).keys()])
  })

  it('returns values in [0, 1)', () => {
    let seed = 1
    for (let i = 0; i < 1000; i++) {
      const r = nextRandom(seed)
      expect(r.value).toBeGreaterThanOrEqual(0)
      expect(r.value).toBeLessThan(1)
      seed = r.seed
    }
  })
})
