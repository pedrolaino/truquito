import { envidoPoints } from '../engine/cards.ts'
import { type Bot, find } from './bot.ts'
import { winChance } from './estimate.ts'
import { chooseCard } from './medium.ts'

/**
 * A beginner: wants the envido with 27 or more, judges a truco by its cards and
 * what is on the table but reads it loosely, and plays its cards half at random.
 */
export const easyBot: Bot = (view, legal, random) => {
  const r = view.round
  const pick = <T>(xs: T[]) => xs[Math.floor(random() * xs.length)]!
  const points = envidoPoints(r.dealt[view.seat]!)
  if (r.envido.status === 'pending')
    return points >= 27 ? find(legal, 'quiero')! : find(legal, 'noQuiero')!

  // Its read of the hand can be off by up to 15 points either way.
  let known: number | undefined
  const chance = () => (known ??= winChance(view, random, 12) + (random() - 0.5) * 0.3)
  if (r.truco.pending) {
    if (chance() > 0.9 && find(legal, 'truco')) return find(legal, 'truco')!
    return chance() > 0.5 ? find(legal, 'quiero')! : find(legal, 'noQuiero')!
  }

  const envido = find(legal, 'envido', 'envido')
  if (envido && random() < (points >= 27 ? 0.6 : 0.05)) return envido
  const truco = find(legal, 'truco')
  if (truco && (random() < 0.05 || (chance() > 0.7 && random() < 0.5))) return truco
  if (random() < 0.5) return { type: 'play', card: chooseCard(view) }
  return pick(legal.filter((a) => a.type === 'play'))
}
