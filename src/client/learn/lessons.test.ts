import { describe, expect, it } from 'vitest'
import { envidoPoints } from '../../engine/cards.ts'
import { LESSONS } from './lessons.tsx'
import { runPlay } from './lesson.ts'

describe('lessons', () => {
  it('have unique ids and at least one step each', () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length)
    for (const lesson of LESSONS) expect(lesson.steps.length).toBeGreaterThan(0)
  })

  for (const lesson of LESSONS)
    for (const [i, step] of lesson.steps.entries()) {
      const name = `${lesson.id} step ${i + 1}`
      if (step.kind === 'play')
        it(`${name}: the scripted hand is legal and reaches its goal`, () => {
          expect(() => runPlay(step.play)).not.toThrow()
        })
      if (step.kind === 'play')
        for (const [c, cue] of step.play.cues.entries())
          for (const other of cue.or ?? [])
            it(`${name}: cue ${c + 1} also works with the other move`, () => {
              const cues = step.play.cues.map((x, j) => (j === c ? { ...x, expect: other } : x))
              expect(() => runPlay({ ...step.play, cues })).not.toThrow()
            })
      if (step.kind === 'count')
        it(`${name}: exactly one option is the real envido`, () => {
          const right = envidoPoints(step.hand)
          expect(step.options.filter((o) => o === right)).toHaveLength(1)
        })
      if (step.kind === 'choose')
        it(`${name}: the answer is one of the options`, () => {
          expect(step.options[step.answer]).toBeDefined()
        })
    }
})
