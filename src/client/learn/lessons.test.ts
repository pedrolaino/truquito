import { describe, expect, it } from 'vitest'
import { cardPower, envidoPoints } from '../../engine/cards.ts'
import { type Action, legalActions } from '../../engine/game.ts'
import { LESSONS, STAGES } from './lessons.tsx'
import {
  ME,
  type Play,
  countsForEnvido,
  envidoCards,
  envidoSum,
  runPlay,
  sameAction,
} from './lesson.ts'

/** The play with cue `index` answered by `action` instead. */
const answering = (play: Play, index: number, action: Action): Play => ({
  ...play,
  cues: play.cues.map((cue, j) =>
    j === index ? { ...cue, expect: action, or: [cue.expect, ...(cue.or ?? [])] } : cue,
  ),
})

describe('lessons', () => {
  it('have unique ids, a known stage and at least one step each', () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length)
    for (const lesson of LESSONS) {
      expect(lesson.steps.length).toBeGreaterThan(0)
      expect(STAGES[lesson.stage]).toBeDefined()
    }
  })

  it('keep the stages in order and leave the optional flor for the end', () => {
    const stages = LESSONS.map((l) => l.stage)
    expect(stages).toEqual([...stages].sort((a, b) => a - b))
    expect(LESSONS.filter((l) => l.optional).map((l) => l.id)).toEqual(['flor'])
    expect(LESSONS.at(-1)!.id).toBe('flor')
  })

  for (const lesson of LESSONS)
    for (const [i, step] of lesson.steps.entries()) {
      const name = `${lesson.id} step ${i + 1}`
      if (step.kind === 'play') {
        const { play } = step
        if (play.practice)
          it(`${name}: the practice hand ends for any deal`, () => {
            for (let seed = 1; seed <= 20; seed++) expect(() => runPlay(play, seed)).not.toThrow()
          })
        else
          it(`${name}: the scripted hand is legal and reaches its goal`, () => {
            expect(() => runPlay(play)).not.toThrow()
          })
        for (const [c, cue] of play.cues.entries()) {
          for (const other of cue.or ?? [])
            it(`${name}: cue ${c + 1} also works with another good move`, () => {
              expect(() => runPlay(answering(play, c, other))).not.toThrow()
            })
          for (const reply of cue.free?.replies ?? []) {
            if (reply.retry) continue
            it(`${name}: cue ${c + 1} goes on after the reply "${reply.say}"`, () => {
              expect(() => runPlay(answering(play, c, reply.action))).not.toThrow()
            })
          }
        }
      }
      if (step.kind === 'count')
        it(`${name}: exactly one option is the real envido`, () => {
          const right = envidoPoints(step.hand)
          expect(step.options.filter((o) => o === right)).toHaveLength(1)
          for (const id of Object.keys(step.wrong ?? {}))
            expect(step.options.map(String)).toContain(id)
        })
      if (step.kind === 'choose')
        it(`${name}: the answer and the hinted options exist`, () => {
          expect(step.options[step.answer]).toBeDefined()
          for (const id of Object.keys(step.wrong ?? {})) {
            expect(step.options[Number(id)]).toBeDefined()
            expect(Number(id)).not.toBe(step.answer)
          }
        })
      if (step.kind === 'strongest')
        it(`${name}: one card is clearly the strongest`, () => {
          const powers = step.cards.map(cardPower).sort((a, b) => b - a)
          expect(powers[0]).toBeGreaterThan(powers[1]!)
        })
      if (step.kind === 'order')
        it(`${name}: no two cards tie`, () => {
          expect(new Set(step.cards.map(cardPower)).size).toBe(step.cards.length)
        })
    }

  it('the retry answers are moves the learner could really make', () => {
    for (const lesson of LESSONS)
      for (const step of lesson.steps) {
        if (step.kind !== 'play') continue
        step.play.cues.forEach((cue, c) => {
          for (const reply of cue.free?.replies ?? []) {
            if (!reply.retry) continue
            let legal: Action[] = []
            runPlay(step.play, 1, (index, state) => {
              if (index === c) legal = legalActions(state, ME)
            })
            expect(legal.some((a) => sameAction(a, reply.action))).toBe(true)
          }
        })
      }
  })
})

describe('envido helpers', () => {
  it('find the cards that count and write the sum', () => {
    const c = (
      rank: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12,
      suit: 'oro' | 'copa' | 'espada' | 'basto',
    ) => ({ rank, suit })
    const pair = [c(6, 'copa'), c(3, 'copa'), c(1, 'espada')]
    expect(envidoSum(envidoCards(pair))).toBe('20 + 6 + 3')
    expect(countsForEnvido(pair, [c(6, 'copa'), c(1, 'espada')])).toBe(false)

    const three = [c(7, 'copa'), c(5, 'copa'), c(2, 'copa')]
    expect(envidoSum(envidoCards(three))).toBe('20 + 7 + 5')

    const negras = [c(10, 'espada'), c(11, 'copa'), c(12, 'basto')]
    expect(envidoPoints(negras)).toBe(0)
    expect(countsForEnvido(negras, [])).toBe(true)

    const twoNegras = [c(12, 'oro'), c(11, 'oro'), c(4, 'basto')]
    expect(envidoSum(envidoCards(twoNegras))).toBe('20 + 0 + 0')
  })
})
