import { describe, expect, it } from 'vitest'
import { addPoint, newTally, parseTally, tallyWinner } from './tally.ts'

describe('tally', () => {
  it('adds and subtracts points per team', () => {
    let t = newTally(15)
    t = addPoint(t, 0, 1)
    t = addPoint(t, 0, 1)
    t = addPoint(t, 1, 1)
    t = addPoint(t, 0, -1)
    expect(t.points).toEqual([1, 1])
  })

  it('never goes below zero or above the target', () => {
    let t = addPoint(newTally(15), 1, -1)
    expect(t.points).toEqual([0, 0])
    for (let i = 0; i < 20; i++) t = addPoint(t, 1, 1)
    expect(t.points).toEqual([0, 15])
  })

  it('knows who won', () => {
    let t = newTally(15)
    expect(tallyWinner(t)).toBeNull()
    for (let i = 0; i < 15; i++) t = addPoint(t, 1, 1)
    expect(tallyWinner(t)).toBe(1)
  })

  it('only restores valid saved tallies', () => {
    expect(parseTally('{"target":30,"points":[3,17]}')).toEqual({ target: 30, points: [3, 17] })
    expect(parseTally('{"target":15,"points":[3,17]}')).toBeNull()
    expect(parseTally('{"target":20,"points":[3,1]}')).toBeNull()
    expect(parseTally('{"target":15,"points":[-1,1]}')).toBeNull()
    expect(parseTally('{"target":15,"points":[1.5,1]}')).toBeNull()
    expect(parseTally('nope')).toBeNull()
    expect(parseTally(null)).toBeNull()
  })
})

describe('score text', () => {
  it('reads malas and buenas at 30', async () => {
    const { scoreText } = await import('./text.ts')
    expect(scoreText(7, 15)).toBe('7')
    expect(scoreText(0, 30)).toBe('0 malas')
    expect(scoreText(1, 30)).toBe('1 mala')
    expect(scoreText(15, 30)).toBe('15 malas')
    expect(scoreText(16, 30)).toBe('1 buena')
    expect(scoreText(30, 30)).toBe('15 buenas')
  })
})
