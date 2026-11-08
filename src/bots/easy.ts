import { envidoPoints } from '../engine/cards.ts'
import { type Bot, find } from './bot.ts'

/** Mostly random, with a couple of rules so it is not silly. */
export const easyBot: Bot = (view, legal, random) => {
  const r = view.round
  const pick = <T>(xs: T[]) => xs[Math.floor(random() * xs.length)]!
  if (r.envido.status === 'pending')
    return envidoPoints(r.dealt[view.seat]!) >= 27
      ? find(legal, 'quiero')!
      : find(legal, 'noQuiero')!
  if (r.truco.pending) return random() < 0.5 ? find(legal, 'quiero')! : find(legal, 'noQuiero')!

  const calls = legal.filter((a) => a.type === 'envido' || a.type === 'truco')
  if (calls.length > 0 && random() < 0.2) return pick(calls)
  return pick(legal.filter((a) => a.type === 'play'))
}
