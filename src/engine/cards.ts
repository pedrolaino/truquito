export const SUITS = ['espada', 'basto', 'oro', 'copa'] as const
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] as const

export type Suit = (typeof SUITS)[number]
export type Rank = (typeof RANKS)[number]
export interface Card {
  rank: Rank
  suit: Suit
}

export function createDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })))
}

export function sameCard(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit
}

/** Truco strength: higher wins, equal values are a parda. */
export function cardPower(card: Card): number {
  const { rank, suit } = card
  if (rank === 1 && suit === 'espada') return 14
  if (rank === 1 && suit === 'basto') return 13
  if (rank === 7 && suit === 'espada') return 12
  if (rank === 7 && suit === 'oro') return 11
  if (rank === 7) return 4
  if (rank === 1) return 8
  return { 2: 9, 3: 10, 4: 1, 5: 2, 6: 3, 10: 5, 11: 6, 12: 7 }[rank]
}

export function compareCards(a: Card, b: Card): number {
  return cardPower(a) - cardPower(b)
}

const envidoValue = (card: Card) => (card.rank >= 10 ? 0 : card.rank)

export function envidoPoints(hand: Card[]): number {
  let best = Math.max(...hand.map(envidoValue))
  for (const suit of SUITS) {
    const values = hand
      .filter((card) => card.suit === suit)
      .map(envidoValue)
      .sort((a, b) => b - a)
    if (values.length >= 2) best = Math.max(best, 20 + values[0]! + values[1]!)
  }
  return best
}

export function hasFlor(hand: Card[]): boolean {
  return hand.length === 3 && hand.every((card) => card.suit === hand[0]!.suit)
}

export function florPoints(hand: Card[]): number {
  return 20 + hand.reduce((sum, card) => sum + envidoValue(card), 0)
}
