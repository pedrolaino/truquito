import { config } from '../shared/config.ts'
import type { Bot } from './bot.ts'
import { easyBot } from './easy.ts'
import { hardBot } from './hard.ts'
import { mediumBot } from './medium.ts'

export type { Bot } from './bot.ts'
export type Level = 'easy' | 'medium' | 'hard'

export const bots: Record<Level, Bot> = { easy: easyBot, medium: mediumBot, hard: hardBot }

export function thinkingTime(random: () => number): number {
  const { minDelayMs, maxDelayMs } = config.bot
  return minDelayMs + random() * (maxDelayMs - minDelayMs)
}
