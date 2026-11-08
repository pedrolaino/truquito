import { useEffect, useRef, useState } from 'react'
import type { GameEvent, GameView } from '../engine/game.ts'
import { type Announcement, announce, eventDuration, stepView } from './presentation.ts'

interface Shown {
  view: GameView
  /** Events already shown. */
  index: number
  announcement: Announcement | null
  /** Event on screen right now, kept until its time is up. */
  playing: GameEvent | null
}

/**
 * Plays new game events one at a time with a pause after each, while the
 * table shows the state as of that event. `busy` stays true until the screen
 * has caught up with the real state.
 */
export function usePresentation(view: GameView, events: GameEvent[], names: string[]) {
  const [shown, setShown] = useState<Shown>(() => ({
    view,
    index: events.length,
    announcement: null,
    playing: null,
  }))
  const latest = useRef({ view, events, names })
  // The last state shown with nothing queued: where the next queue starts from.
  const idle = useRef(view)
  const pending = shown.index < events.length
  const busy = shown.playing !== null || pending
  useEffect(() => {
    latest.current = { view, events, names }
    if (!busy) idle.current = view
  })

  const delay = shown.playing ? eventDuration(shown.playing, view.seat) : pending ? 0 : null

  useEffect(() => {
    if (delay === null) return
    const id = setTimeout(() => {
      const { view, events, names } = latest.current
      setShown((s) => {
        const event = events[s.index]
        if (!event) return { ...s, view, playing: null, announcement: null }
        const base = s.playing ? s.view : idle.current
        return {
          view: stepView(base, event, view),
          index: s.index + 1,
          announcement:
            announce(event, names, view.seat, events.slice(0, s.index)) ?? s.announcement,
          playing: event,
        }
      })
    }, delay)
    return () => clearTimeout(id)
  }, [delay, shown.index])

  return {
    view: busy ? shown.view : view,
    busy,
    announcement: busy ? shown.announcement : null,
    playing: shown.playing,
    /** Events shown so far, for the log. */
    shownEvents: events.slice(0, shown.index),
  }
}
