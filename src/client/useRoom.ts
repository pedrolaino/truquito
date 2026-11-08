import { useCallback, useEffect, useRef, useState } from 'react'
import type { Action, GameEvent } from '../engine/game.ts'
import type { RoomInfo, RoomSnapshot, ServerMessage } from '../shared/protocol.ts'
import { saveToken, savedToken } from './storage.ts'

export type Lobby =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'full' }
  | { kind: 'join'; info: RoomInfo }
  | { kind: 'error' }

function parseServerMessage(raw: unknown): ServerMessage | null {
  if (typeof raw !== 'string') return null
  try {
    const data = JSON.parse(raw) as ServerMessage
    if (data.type === 'error' && typeof data.error === 'string') return data
    if (data.type === 'state' && Number.isSafeInteger(data.state?.seq)) return data
  } catch {
    // ignored below
  }
  return null
}

/** Joins a room by link and keeps a WebSocket to it, reconnecting when it drops. */
export function useRoom(roomId: string) {
  const [token, setToken] = useState(() => savedToken(roomId))
  const [lobby, setLobby] = useState<Lobby>({ kind: 'loading' })
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null)
  const [events, setEvents] = useState<GameEvent[]>([])
  const [online, setOnline] = useState(false)
  const socket = useRef<WebSocket | null>(null)
  const lastSeq = useRef(-1)

  useEffect(() => {
    if (token) return
    let active = true
    fetch(`/api/rooms/${roomId}`)
      .then(async (res) => {
        if (!active) return
        if (res.status === 404) return setLobby({ kind: 'missing' })
        if (!res.ok) return setLobby({ kind: 'error' })
        const info = (await res.json()) as RoomInfo
        setLobby(info.full ? { kind: 'full' } : { kind: 'join', info })
      })
      .catch(() => active && setLobby({ kind: 'error' }))
    return () => {
      active = false
    }
  }, [roomId, token])

  useEffect(() => {
    if (!token) return
    let stopped = false
    let retries = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const forget = () => {
      saveToken(roomId, null)
      setToken(null)
    }

    const connect = () => {
      const scheme = location.protocol === 'https:' ? 'wss' : 'ws'
      const ws = new WebSocket(`${scheme}://${location.host}/api/rooms/${roomId}/ws`)
      let opened = false
      socket.current = ws
      ws.onopen = () => {
        opened = true
        retries = 0
        ws.send(JSON.stringify({ type: 'auth', token }))
      }
      ws.onmessage = (e) => {
        const message = parseServerMessage(e.data)
        if (!message) return
        if (message.type === 'error') {
          if (message.error === 'bad_token') forget()
          return
        }
        const { state } = message
        if (state.seq <= lastSeq.current) return
        lastSeq.current = state.seq
        setOnline(true)
        setSnapshot(state)
        if (state.events.length > 0) setEvents((list) => [...list, ...state.events])
      }
      ws.onclose = () => {
        setOnline(false)
        if (socket.current === ws) socket.current = null
        if (stopped) return
        // A socket that never opened may mean the room is gone.
        if (!opened)
          void fetch(`/api/rooms/${roomId}`).then(
            (res) => res.status === 404 && !stopped && forget(),
            () => {},
          )
        timer = setTimeout(connect, Math.min(10_000, 500 * 2 ** retries++))
      }
    }
    connect()
    return () => {
      stopped = true
      clearTimeout(timer)
      socket.current?.close()
    }
  }, [roomId, token])

  const send = useCallback((message: object) => {
    socket.current?.send(JSON.stringify(message))
  }, [])

  const act = useCallback(
    (action: Action) => send({ type: 'action', seq: lastSeq.current, action }),
    [send],
  )
  const rematch = useCallback(() => send({ type: 'rematch' }), [send])

  const join = useCallback(
    async (name: string) => {
      const res = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (res.status === 409) return setLobby({ kind: 'full' })
      if (res.status === 404) return setLobby({ kind: 'missing' })
      if (!res.ok) return setLobby({ kind: 'error' })
      const body = (await res.json()) as { token: string }
      saveToken(roomId, body.token)
      setToken(body.token)
    },
    [roomId],
  )

  return { token, lobby, snapshot, events, online, act, rematch, join }
}
