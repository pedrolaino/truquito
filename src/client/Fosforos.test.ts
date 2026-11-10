import { describe, expect, it } from 'vitest'
import { STICKS } from './Fosforos.tsx'

const corners = (() => {
  const xs = STICKS.flatMap(([x1, , x2]) => [x1, x2])
  const ys = STICKS.flatMap(([, y1, , y2]) => [y1, y2])
  const [left, right, top, bottom] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...ys),
    Math.max(...ys),
  ]
  return [`${left},${top}`, `${right},${top}`, `${right},${bottom}`, `${left},${bottom}`]
})()

describe('matchstick square', () => {
  it('starts with the head of the first match pointing up', () => {
    const [, tailY, , headY] = STICKS[0]
    expect(headY).toBeLessThan(tailY)
  })

  it('joins every match at the corners, with one head on each corner', () => {
    for (const [x1, y1, x2, y2] of STICKS) {
      expect(corners).toContain(`${x1},${y1}`)
      expect(corners).toContain(`${x2},${y2}`)
    }
    const sideHeads = STICKS.slice(0, 4).map(([, , x, y]) => `${x},${y}`)
    expect(new Set(sideHeads)).toEqual(new Set(corners))
  })

  it('puts the diagonal head exactly on a corner head', () => {
    const [, , x, y] = STICKS[4]
    expect(STICKS.slice(0, 4).map(([, , hx, hy]) => `${hx},${hy}`)).toContain(`${x},${y}`)
  })
})
