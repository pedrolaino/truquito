import { type Card, cardPower, createDeck, envidoPoints, sameCard } from '../engine/cards.ts'
import { type GameView, type Trick, handOf, nextSeat, roundWinner } from '../engine/game.ts'

/**
 * The card an average player picks: the lowest that wins, a parda when it
 * already won a trick, otherwise the lowest. Leading the first trick it keeps
 * its best card and plays the middle one.
 */
export function pickCard(hand: Card[], tricks: Trick[], seat: number, rival: number): Card {
  const sorted = [...hand].sort((a, b) => cardPower(a) - cardPower(b))
  const theirs = tricks.at(-1)!.cards[rival]
  if (theirs) {
    const beat = sorted.find((c) => cardPower(c) > cardPower(theirs))
    if (beat) return beat
    const tie = sorted.find((c) => cardPower(c) === cardPower(theirs))
    if (tie && tricks.some((t) => t.winner === seat)) return tie
    return sorted[0]!
  }
  if (tricks.length === 1 && sorted.length === 3) return sorted[1]!
  return sorted.at(-1)!
}

/** Whether a hand the opponent could hold matches the points they said out loud. */
export function fitsWhatTheySaid(view: GameView, hand: Card[]): boolean {
  const opponent = nextSeat(view, view.seat)
  const said = view.round.announced.filter((a) => a.kind === 'envido')
  const exact = said.find((a) => a.seat === opponent)?.points
  // "Son buenas" means they had no more than the points said before.
  const max = exact === undefined ? said[0]?.points : undefined
  const points = envidoPoints(hand)
  return (exact === undefined || points === exact) && (max === undefined || points <= max)
}

/** Plays the round out with both seats picking cards like an average player. */
function playOut(view: GameView, mine: Card[], theirs: Card[]): boolean {
  const me = view.seat
  const rival = nextSeat(view, me)
  const hands = { [me]: [...mine], [rival]: [...theirs] }
  const tricks: Trick[] = view.round.tricks.map((t) => ({ ...t, cards: [...t.cards] }))
  for (;;) {
    const trick = tricks.at(-1)!
    const seat = trick.cards[trick.lead] === null ? trick.lead : nextSeat(view, trick.lead)
    const other = seat === me ? rival : me
    const hand = hands[seat]!
    if (hand.length === 0) return false
    const card = pickCard(hand, tricks, seat, other)
    hand.splice(
      hand.findIndex((c) => sameCard(c, card)),
      1,
    )
    trick.cards[seat] = card
    if (trick.cards[other] === null) continue
    const diff = cardPower(trick.cards[me]!) - cardPower(trick.cards[rival]!)
    trick.winner = diff > 0 ? me : diff < 0 ? rival : 'parda'
    const winner = roundWinner({ tricks, mano: view.round.mano })
    if (winner !== null) return winner === me
    const lead = trick.winner === 'parda' ? view.round.mano : trick.winner
    tricks.push({ lead, cards: trick.cards.map(() => null), winner: null })
  }
}

/**
 * Chance of winning the round from here, by dealing the opponent random hands
 * that fit what this seat has seen and playing each one out. It only uses the
 * seat's view, so it knows the cards on the table but never the rival's hand.
 */
export function winChance(view: GameView, random: () => number, samples = 24): number {
  const r = view.round
  const me = view.seat
  const rival = nextSeat(view, me)
  const played = r.tricks.map((t) => t.cards[rival]).filter((c): c is Card => c !== null)
  const seen = [...r.dealt[me]!, ...played]
  const unseen = createDeck().filter((c) => !seen.some((s) => sameCard(s, c)))
  const missing = 3 - played.length
  const mine = handOf(r, me)

  let wins = 0
  for (let i = 0; i < samples; i++) {
    let rest: Card[] = []
    // A few tries to find a hand that matches their envido; fall back to any.
    for (let tries = 0; tries < 8; tries++) {
      const pool = [...unseen]
      rest = Array.from(
        { length: missing },
        () => pool.splice(Math.floor(random() * pool.length), 1)[0]!,
      )
      if (fitsWhatTheySaid(view, [...played, ...rest])) break
    }
    if (playOut(view, mine, rest)) wins++
  }
  return wins / samples
}
