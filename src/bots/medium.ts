import { type Card, cardPower, envidoPoints } from '../engine/cards.ts'
import { type GameView, handOf, nextSeat } from '../engine/game.ts'
import { config } from '../shared/config.ts'
import { type Bot, find } from './bot.ts'

/** Rough chance of winning the round with the cards left and the tricks so far. */
export function handStrength(view: GameView): number {
  const r = view.round
  const me = view.seat
  const done = r.tricks.filter((t) => t.winner !== null)
  const won = done.filter((t) => t.winner === me).length
  const lost = done.filter((t) => t.winner !== me && t.winner !== 'parda').length
  const powers = handOf(r, me)
    .map(cardPower)
    .sort((a, b) => b - a)
  const top = (powers[0] ?? 0) / 14
  const second = (powers[1] ?? powers[0] ?? 0) / 14
  const base = powers.length > 1 ? 0.6 * top + 0.4 * second : top
  return Math.min(1, Math.max(0, base + 0.25 * won - 0.25 * lost))
}

export function chooseCard(view: GameView): Card {
  const r = view.round
  const me = view.seat
  const trick = r.tricks.at(-1)!
  const opponentCard = trick.cards[nextSeat(view, me)]
  const sorted = handOf(r, me).sort((a, b) => cardPower(a) - cardPower(b))
  const wonBefore = r.tricks.some((t) => t.winner === me)

  if (opponentCard) {
    const beat = sorted.find((c) => cardPower(c) > cardPower(opponentCard))
    if (beat) return beat
    const tie = sorted.find((c) => cardPower(c) === cardPower(opponentCard))
    // A parda after winning a trick wins the round.
    if (tie && wonBefore) return tie
    return sorted[0]!
  }
  // Leading the first trick: try with the middle card and keep the best one.
  if (r.tricks.length === 1 && sorted.length === 3) return sorted[1]!
  return sorted.at(-1)!
}

/** Plays like an average player: knows its points, saves its best card and bluffs a bit. */
export const mediumBot: Bot = (view, legal, random) => {
  const r = view.round
  const points = envidoPoints(r.dealt[view.seat]!)
  const bluff = () => random() < config.bot.bluffChance

  if (r.envido.status === 'pending') {
    const last = r.envido.calls.at(-1)
    if (points >= 33) return find(legal, 'envido', 'faltaEnvido') ?? find(legal, 'quiero')!
    if (points >= 31) return find(legal, 'envido', 'realEnvido') ?? find(legal, 'quiero')!
    const needed = last === 'faltaEnvido' ? 31 : last === 'realEnvido' ? 29 : 27
    return points >= needed ? find(legal, 'quiero')! : find(legal, 'noQuiero')!
  }

  const envido = (): ReturnType<Bot> | undefined => {
    if (points >= 30) return find(legal, 'envido', 'realEnvido')
    if (points >= 26 || bluff()) return find(legal, 'envido', 'envido')
  }
  const strength = handStrength(view)

  if (r.truco.pending) {
    const answer = envido()
    if (answer) return answer
    if (strength > 0.85) return find(legal, 'truco') ?? find(legal, 'quiero')!
    if (strength > 0.5 || (strength > 0.35 && bluff())) return find(legal, 'quiero')!
    return find(legal, 'noQuiero')!
  }

  const call = envido()
  if (call) return call
  if (find(legal, 'truco') && (strength > 0.7 || bluff())) return find(legal, 'truco')!
  return { type: 'play', card: chooseCard(view) }
}
