import { describe, expect, it } from 'vitest'
import { cleanName, isId, parseClientMessage, parseGameConfig, randomId } from './protocol.ts'

describe('protocol', () => {
  it('makes 128-bit hex ids', () => {
    const id = randomId()
    expect(isId(id)).toBe(true)
    expect(id).not.toBe(randomId())
    expect(isId('ABC')).toBe(false)
  })

  it('cleans names', () => {
    expect(cleanName('  Ana   María ')).toBe('Ana María')
    expect(cleanName('')).toBeNull()
    expect(cleanName(' ')).toBeNull()
    expect(cleanName('x'.repeat(20))).toBe('x'.repeat(20))
    expect(cleanName('x'.repeat(21))).toBeNull()
    expect(cleanName(42)).toBeNull()
  })

  it('parses game settings', () => {
    expect(parseGameConfig({ flor: true, target: 30, extra: 1 })).toEqual({
      flor: true,
      target: 30,
    })
    expect(parseGameConfig({ flor: 1, target: 30 })).toBeNull()
    expect(parseGameConfig({ flor: true, target: '15' })).toBeNull()
    expect(parseGameConfig(null)).toBeNull()
  })

  it.each([
    ['{"type":"auth","token":"0123456789abcdef0123456789abcdef"}', true],
    ['{"type":"action","seq":3,"action":{"type":"play","card":{"rank":7,"suit":"oro"}}}', true],
    ['{"type":"action","seq":3,"action":{"type":"envido","call":"realEnvido"}}', true],
    ['{"type":"action","seq":3,"action":{"type":"mazo"}}', true],
    ['{"type":"rematch"}', true],
    ['{"type":"auth","token":"short"}', false],
    ['{"type":"action","seq":"3","action":{"type":"mazo"}}', false],
    ['{"type":"action","seq":3,"action":{"type":"play","card":{"rank":9,"suit":"oro"}}}', false],
    ['{"type":"action","seq":3,"action":{"type":"envido","call":"contraflor"}}', false],
    ['{"type":"action","seq":3,"action":{"type":"steal"}}', false],
    ['[]', false],
    ['nope', false],
  ])('%s is valid: %s', (raw, valid) => {
    expect(parseClientMessage(raw) !== null).toBe(valid)
  })

  it('drops the extra fields of an action', () => {
    expect(
      parseClientMessage('{"type":"action","seq":1,"action":{"type":"mazo","seat":1}}'),
    ).toEqual({ type: 'action', seq: 1, action: { type: 'mazo' } })
  })
})
