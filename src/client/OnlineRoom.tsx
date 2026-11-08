import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { nextSeat } from '../engine/game.ts'
import type { RoomSnapshot } from '../shared/protocol.ts'
import { cleanName } from '../shared/protocol.ts'
import { GameOver } from './GameOver.tsx'
import { saveName, savedName } from './storage.ts'
import { Table } from './Table.tsx'
import { useRoom } from './useRoom.ts'

interface Props {
  roomId: string
  navigate: (path: string) => void
}

export function OnlineRoom({ roomId, navigate }: Props) {
  const room = useRoom(roomId)
  const home = (
    <button type="button" onClick={() => navigate('/')}>
      Volver al inicio
    </button>
  )

  if (!room.token) {
    const { lobby } = room
    return (
      <main>
        <h1>Truquito</h1>
        {lobby.kind === 'loading' && <p>Cargando la sala…</p>}
        {lobby.kind === 'missing' && <p role="alert">Esta sala no existe o ya cerró.</p>}
        {lobby.kind === 'full' && <p role="alert">La sala está llena: ya hay dos jugadores.</p>}
        {lobby.kind === 'error' && (
          <p role="alert">No pudimos conectarnos. Probá recargar la página.</p>
        )}
        {lobby.kind === 'join' && (
          <JoinForm
            host={lobby.info.players[0]?.name ?? ''}
            rules={`${lobby.info.config.flor ? 'Con flor' : 'Sin flor'}, a ${lobby.info.config.target}`}
            onJoin={room.join}
          />
        )}
        {lobby.kind !== 'join' && lobby.kind !== 'loading' && home}
      </main>
    )
  }

  const { snapshot } = room
  if (!snapshot)
    return (
      <main>
        <h1>Truquito</h1>
        <p>Conectando…</p>
      </main>
    )

  return (
    <main>
      <h1>Truquito</h1>
      {!room.online && <p role="status">Se cortó la conexión. Reconectando…</p>}
      {snapshot.game ? (
        <Game snapshot={snapshot} room={room} home={home} />
      ) : (
        <Waiting roomId={roomId} />
      )}
    </main>
  )
}

function JoinForm({
  host,
  rules,
  onJoin,
}: {
  host: string
  rules: string
  onJoin: (name: string) => Promise<void>
}) {
  const [name, setName] = useState(savedName)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const clean = cleanName(name)
    if (!clean) return setError('Poné un nombre de 1 a 20 caracteres.')
    saveName(clean)
    setBusy(true)
    await onJoin(clean).catch(() => setError('No pudimos entrar. Probá de nuevo.'))
    setBusy(false)
  }

  return (
    <form onSubmit={submit}>
      <p>
        {host} te invita a jugar al truco. {rules}.
      </p>
      <label>
        Tu nombre{' '}
        <input
          value={name}
          maxLength={20}
          autoComplete="nickname"
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <button type="submit" disabled={busy}>
        Entrar
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}

function Waiting({ roomId }: { roomId: string }) {
  const url = `${location.origin}/r/${roomId}`
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator.share === 'function'
  return (
    <section aria-label="Sala de espera">
      <h2>Esperando a tu rival</h2>
      <p>Mandale este link para que entre:</p>
      <p>
        <input
          readOnly
          value={url}
          aria-label="Link de la sala"
          onFocus={(e) => e.target.select()}
        />
      </p>
      <button
        type="button"
        onClick={() =>
          navigator.clipboard?.writeText(url).then(
            () => setCopied(true),
            () => setCopied(false),
          )
        }
      >
        Copiar link
      </button>
      {canShare && (
        <button
          type="button"
          onClick={() =>
            navigator.share({ title: 'Truquito', text: '¿Un truco?', url }).catch(() => {})
          }
        >
          Compartir
        </button>
      )}
      <p role="status">{copied ? 'Link copiado.' : ''}</p>
    </section>
  )
}

function useCountdown(deadline: number | null): number | null {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (deadline === null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [deadline])
  return deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000))
}

function Game({
  snapshot,
  room,
  home,
}: {
  snapshot: RoomSnapshot
  room: ReturnType<typeof useRoom>
  home: ReactNode
}) {
  const game = snapshot.game!
  const me = snapshot.seat
  const rival = nextSeat(game, me)
  const names = snapshot.players.map((p, seat) => (seat === me ? 'Vos' : p.name))
  const seconds = useCountdown(snapshot.deadlines[rival] ?? null)
  const rivalOffline = !snapshot.players[rival]?.connected
  const winner =
    snapshot.abandonedBy !== null ? (rival === snapshot.abandonedBy ? me : rival) : game.winner

  return (
    <>
      <Table
        view={game}
        names={names}
        events={room.events}
        onAction={room.act}
        rivalStatus={
          rivalOffline && winner === null ? (
            <span role="status">
              Desconectado, esperando que vuelva{seconds !== null ? ` (${seconds} s)` : ''}.
            </span>
          ) : null
        }
      />
      {winner !== null && (
        <GameOver
          won={winner === me}
          detail={
            snapshot.abandonedBy !== null
              ? winner === me
                ? 'Tu rival abandonó.'
                : 'Perdiste por abandono.'
              : undefined
          }
        >
          {snapshot.rematch[me] ? (
            <p role="status">Esperando que {names[rival]} acepte la revancha…</p>
          ) : (
            <button type="button" onClick={room.rematch}>
              {snapshot.rematch[rival] ? 'Aceptar la revancha' : 'Pedir revancha'}
            </button>
          )}
          {home}
        </GameOver>
      )}
    </>
  )
}
