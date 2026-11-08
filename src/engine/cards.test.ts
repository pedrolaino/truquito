import { describe, expect, it } from 'vitest'
import {
  type Card,
  type Rank,
  type Suit,
  compareCards,
  createDeck,
  envidoPoints,
  florPoints,
  hasFlor,
} from './cards'

const c = (rank: Rank, suit: Suit): Card => ({ rank, suit })

describe('deck', () => {
  it('has 40 unique cards without 8s and 9s', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(40)
    expect(new Set(deck.map((d) => `${d.rank}-${d.suit}`)).size).toBe(40)
    expect(deck.some((d) => (d.rank as number) === 8 || (d.rank as number) === 9)).toBe(false)
  })
})

describe('card hierarchy', () => {
  // From strongest to weakest; cards in the same group tie.
  const levels: Card[][] = [
    [c(1, 'espada')],
    [c(1, 'basto')],
    [c(7, 'espada')],
    [c(7, 'oro')],
    [c(3, 'espada'), c(3, 'basto'), c(3, 'oro'), c(3, 'copa')],
    [c(2, 'espada'), c(2, 'basto'), c(2, 'oro'), c(2, 'copa')],
    [c(1, 'oro'), c(1, 'copa')],
    [c(12, 'espada'), c(12, 'basto'), c(12, 'oro'), c(12, 'copa')],
    [c(11, 'espada'), c(11, 'basto'), c(11, 'oro'), c(11, 'copa')],
    [c(10, 'espada'), c(10, 'basto'), c(10, 'oro'), c(10, 'copa')],
    [c(7, 'basto'), c(7, 'copa')],
    [c(6, 'espada'), c(6, 'basto'), c(6, 'oro'), c(6, 'copa')],
    [c(5, 'espada'), c(5, 'basto'), c(5, 'oro'), c(5, 'copa')],
    [c(4, 'espada'), c(4, 'basto'), c(4, 'oro'), c(4, 'copa')],
  ]

  it('covers the whole deck', () => {
    expect(levels.flat()).toHaveLength(40)
  })

  it('orders every pair of cards by level', () => {
    levels.forEach((group, i) =>
      levels.forEach((other, j) => {
        for (const a of group)
          for (const b of other) expect(Math.sign(compareCards(a, b))).toBe(Math.sign(j - i))
      }),
    )
  })
})

describe('envido points', () => {
  it.each([
    [[c(7, 'oro'), c(6, 'oro'), c(1, 'espada')], 33],
    [[c(4, 'copa'), c(5, 'copa'), c(12, 'basto')], 29],
    [[c(10, 'oro'), c(11, 'oro'), c(1, 'basto')], 20],
    [[c(12, 'oro'), c(3, 'oro'), c(7, 'basto')], 23],
    [[c(7, 'espada'), c(6, 'basto'), c(5, 'oro')], 7],
    [[c(10, 'espada'), c(11, 'basto'), c(12, 'oro')], 0],
    [[c(1, 'espada'), c(12, 'basto'), c(4, 'oro')], 4],
    // Three of a suit without flor: the two highest count.
    [[c(7, 'copa'), c(5, 'copa'), c(6, 'copa')], 33],
    [[c(12, 'copa'), c(1, 'copa'), c(11, 'copa')], 21],
  ] as [Card[], number][])('%j is %i', (hand, points) => {
    expect(envidoPoints(hand)).toBe(points)
  })
})

describe('flor', () => {
  it('needs three cards of the same suit', () => {
    expect(hasFlor([c(1, 'oro'), c(5, 'oro'), c(12, 'oro')])).toBe(true)
    expect(hasFlor([c(1, 'oro'), c(5, 'oro'), c(12, 'copa')])).toBe(false)
  })

  it('counts 20 plus the three cards', () => {
    expect(florPoints([c(1, 'oro'), c(5, 'oro'), c(12, 'oro')])).toBe(26)
    expect(florPoints([c(7, 'basto'), c(6, 'basto'), c(5, 'basto')])).toBe(38)
  })
})
