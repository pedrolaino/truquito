import type { GameEvent } from '../engine/game.ts'
import { savedMuted } from './storage.ts'

// Short sounds made with the Web Audio API, so there are no audio files.
let audio: AudioContext | null = null

function context(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null
  audio ??= new AudioContext()
  if (audio.state === 'suspended') void audio.resume()
  return audio
}

function tone(freq: number, at: number, length: number, volume = 0.12) {
  const ctx = context()
  if (!ctx) return
  const start = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(volume, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
  osc.connect(gain).connect(ctx.destination)
  osc.start(start)
  osc.stop(start + length)
}

/** A card hitting the table: a short burst of filtered noise. */
function slap() {
  const ctx = context()
  if (!ctx) return
  const length = 0.09
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++)
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3
  const source = ctx.createBufferSource()
  const filter = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  source.buffer = buffer
  filter.type = 'bandpass'
  filter.frequency.value = 1800
  gain.gain.value = 0.5
  source.connect(filter).connect(gain).connect(ctx.destination)
  source.start()
}

const notes = (freqs: number[], step = 0.11, length = 0.25) =>
  freqs.forEach((f, i) => tone(f, i * step, length))

export function playSound(event: GameEvent, me: number) {
  const mine = 'seat' in event && event.seat === me
  switch (event.type) {
    case 'play':
      return slap()
    case 'call':
    case 'flor':
      return notes(mine ? [523, 659] : [659, 880], 0.09, 0.2)
    case 'quiero':
      return notes([523, 784], 0.08, 0.18)
    case 'noQuiero':
    case 'mazo':
      return notes([440, 330], 0.1, 0.22)
    case 'trick':
      if (event.winner === 'parda') return tone(440, 0, 0.2)
      return event.winner === me ? tone(988, 0, 0.18) : tone(294, 0, 0.22)
    case 'roundEnd':
      return event.winner === me ? notes([523, 659, 784]) : notes([392, 311])
    case 'gameEnd':
      return event.winner === me
        ? notes([523, 659, 784, 1047], 0.13, 0.4)
        : notes([392, 370, 349, 262], 0.16, 0.4)
    default:
      return
  }
}

/** Right or wrong answer in a lesson. */
export function playFeedback(right: boolean) {
  if (savedMuted()) return
  if (right) notes([659, 880], 0.09, 0.22)
  else notes([330, 262], 0.12, 0.25)
}
