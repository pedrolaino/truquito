import { describe, expect, it } from 'vitest'
import {
  addPoint,
  addPunta,
  finishPuntas,
  newTally,
  parseTally,
  puntasResult,
  startPuntas,
  tallyWinner,
} from './tally.ts'

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
    expect(parseTally('{"target":30,"points":[3,17]}')).toEqual({
      target: 30,
      points: [3, 17],
      puntas: null,
    })
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

describe('puntas', () => {
  it('counts each team point by point without touching the game score', () => {
    let t = startPuntas(addPoint(newTally(30), 0, 1))
    for (let i = 0; i < 5; i++) t = addPunta(t, 0, 1)
    for (let i = 0; i < 4; i++) t = addPunta(t, 1, 1)
    t = addPunta(t, 1, 1)
    t = addPunta(t, 1, -1)
    expect(t.puntas).toEqual([5, 4])
    expect(t.points).toEqual([1, 0])
  })

  it('adds only the difference to the team that made more', () => {
    let t = startPuntas(newTally(30))
    for (let i = 0; i < 5; i++) t = addPunta(t, 0, 1)
    for (let i = 0; i < 7; i++) t = addPunta(t, 1, 1)
    expect(puntasResult(t)).toEqual({ team: 1, points: 2 })
    t = finishPuntas(t)
    expect(t.points).toEqual([0, 2])
    expect(t.puntas).toBeNull()
  })

  it('adds nothing on a tie and never passes the target', () => {
    let t = startPuntas(newTally(15))
    t = addPunta(addPunta(t, 0, 1), 1, 1)
    expect(puntasResult(t)).toBeNull()
    expect(finishPuntas(t).points).toEqual([0, 0])
    let u = startPuntas({ target: 15, points: [13, 0], puntas: null })
    for (let i = 0; i < 6; i++) u = addPunta(u, 0, 1)
    expect(finishPuntas(u).points).toEqual([15, 0])
  })

  it('never goes below zero', () => {
    expect(addPunta(startPuntas(newTally(15)), 0, -1).puntas).toEqual([0, 0])
  })

  it('restores saved puntas and rejects broken ones', () => {
    expect(parseTally('{"target":30,"points":[3,1],"puntas":[4,2]}')).toEqual({
      target: 30,
      points: [3, 1],
      puntas: [4, 2],
    })
    expect(parseTally('{"target":30,"points":[3,1]}')?.puntas).toBeNull()
    expect(parseTally('{"target":30,"points":[3,1],"puntas":[-1,2]}')).toBeNull()
    expect(parseTally('{"target":30,"points":[3,1],"puntas":[1]}')).toBeNull()
  })
})
