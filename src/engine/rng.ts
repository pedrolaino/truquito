// Mulberry32: tiny seeded PRNG. The seed is a uint32 kept in the game state,
// so games stay serializable and reproducible.
export function nextRandom(seed: number): { value: number; seed: number } {
  const next = (seed + 0x6d2b79f5) >>> 0
  let t = next
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: next }
}

/** Fisher–Yates shuffle driven by the seeded PRNG. */
export function shuffle<T>(input: readonly T[], seed: number): { items: T[]; seed: number } {
  const items = [...input]
  for (let i = items.length - 1; i > 0; i--) {
    const r = nextRandom(seed)
    seed = r.seed
    const j = Math.floor(r.value * (i + 1))
    ;[items[i], items[j]] = [items[j]!, items[i]!]
  }
  return { items, seed }
}
