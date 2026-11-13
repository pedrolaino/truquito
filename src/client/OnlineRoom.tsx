import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { Check, Copy, Hourglass, House, Share2, Swords, WifiOff } from 'lucide-react'
import { nextSeat } from '../engine/game.ts'
import type { RoomSnapshot } from '../shared/protocol.ts'
import { cleanName } from '../shared/protocol.ts'
import { Link } from './Link.tsx'
import { GameOver } from './GameOver.tsx'
import { saveName, savedName } from './storage.ts'
import { Table } from './Table.tsx'
import { useRoom } from './useRoom.ts'

interface Props {
  roomId: string
}

export function OnlineRoom({ roomId }: Props) {
  const room = useRoom(roomId)
  const home = (
    <Link className="btn btn-quiet" href="/">
      <House aria-hidden="true" /> Volver al inicio
    </Link>
  )

  if (!room.token) {
    const { lobby } = room
    return (
      <main className="page">
        <h1 className="page-title" data-page-title="Sala online">
          Truquito
        </h1>
        {lobby.kind === 'loading' && <p role="status">Cargando la sala…</p>}
        {lobby.kind === 'missing' && (
          <p role="alert" className="alert">
            Esta sala no existe o ya cerró.
          </p>
        )}
        {lobby.kind === 'full' && (
          <p role="alert" className="alert">
            La sala está llena: ya hay dos jugadores.
          </p>
        )}
        {lobby.kind === 'error' && (
          <p role="alert" className="alert">
            No pudimos conectarnos. Probá recargar la página.
          </p>
        )}
        {lobby.kind === 'join' && (
          <JoinForm
            host={lobby.info.players[0]?.name ?? ''}
            flor={lobby.info.config.flor}
            target={lobby.info.config.target}
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
      <main className="page">
        <h1 className="page-title" data-page-title="Sala online">
          Truquito
        </h1>
        <p role="status">Conectando…</p>
      </main>
    )

  const offline = !room.online && (
    <p role="status" className="alert" style={{ margin: '8px 16px 0' }}>
      Se cortó la conexión. Reconectando…
    </p>
  )
  return snapshot.game ? (
    <main className="screen">
      <h1 className="sr-only">Partida online</h1>
      {offline}
      <Game snapshot={snapshot} room={room} home={home} />
    </main>
  ) : (
    <>
      {offline}
      <Waiting roomId={roomId} snapshot={snapshot} />
    </>
  )
}

function JoinForm({
  host,
  flor,
  target,
  onJoin,
}: {
  host: string
  flor: boolean
  target: number
  onJoin: (name: string) => Promise<void>
}) {
  const nameField = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(savedName)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const invalidName = error !== null && !cleanName(name)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const clean = cleanName(name)
    if (!clean) {
      setError('Poné un nombre de 1 a 20 caracteres.')
      nameField.current?.focus()
      return
    }
    saveName(clean)
    setBusy(true)
    setError(null)
    await onJoin(clean).catch(() => setError('No pudimos entrar. Probá de nuevo.'))
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="panel">
      <h2>
        <Swords aria-hidden="true" /> {host} te invita a un truco
      </h2>
      <p>
        <span className="tag">{flor ? 'con flor' : 'sin flor'}</span>{' '}
        <span className="tag">a {target}</span>
      </p>
      <label className="field">
        Tu nombre
        <input
          ref={nameField}
          name="nickname"
          spellCheck={false}
          aria-invalid={invalidName}
          aria-describedby={invalidName ? 'join-name-error' : undefined}
          value={name}
          maxLength={20}
          autoComplete="nickname"
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
        />
      </label>
      <button type="submit" className="btn btn-primary" disabled={busy} aria-busy={busy}>
        {busy ? 'Entrando…' : 'Entrar'}
      </button>
      {error && (
        <p id="join-name-error" role="alert" className="alert">
          {error}
        </p>
      )}
    </form>
  )
}

function Waiting({ roomId, snapshot }: { roomId: string; snapshot: RoomSnapshot }) {
  const url = `${location.origin}/r/${roomId}`
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator.share === 'function'
  return (
    <main className="page">
      <h1 className="page-title" data-page-title="Sala online">
        Truquito
      </h1>
      <section className="panel" aria-labelledby="waiting">
        <h2 id="waiting">
          <Hourglass aria-hidden="true" /> Esperando a tu rival
        </h2>
        <p>Mandale este link. Apenas entre, arranca la partida.</p>
        <input
          className="link-box"
          readOnly
          value={url}
          aria-label="Link de la sala"
          onFocus={(e) => e.target.select()}
        />
        <div className="row">
          {canShare && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                navigator.share({ title: 'Truquito', text: '¿Un truco?', url }).catch(() => {})
              }
            >
              <Share2 aria-hidden="true" /> Compartir
            </button>
          )}
          <button
            type="button"
            className={canShare ? 'btn' : 'btn btn-primary'}
            onClick={() =>
              navigator.clipboard?.writeText(url).then(
                () => setCopied(true),
                () => setCopied(false),
              )
            }
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{' '}
            {copied ? 'Link copiado' : 'Copiar link'}
          </button>
        </div>
        <p>
          <span className="tag">{snapshot.config.flor ? 'con flor' : 'sin flor'}</span>{' '}
          <span className="tag">a {snapshot.config.target}</span>
        </p>
      </section>
      <Link className="btn btn-quiet" href="/">
        <House aria-hidden="true" /> Volver al inicio
      </Link>
      <p role="status" className="sr-only">
        {copied ? 'Link copiado.' : ''}
      </p>
    </main>
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
        over={
          winner !== null && (
            <GameOver
              won={winner === me}
              names={['Vos', names[rival]!]}
              scores={[game.scores[me]!, game.scores[rival]!]}
              target={game.config.target}
              detail={
                snapshot.abandonedBy !== null
                  ? winner === me
                    ? 'Tu rival no volvió.'
                    : 'Perdiste por abandono.'
                  : undefined
              }
            >
              {snapshot.rematch[me] ? (
                <p role="status">Esperando que {names[rival]} acepte la revancha…</p>
              ) : (
                <button type="button" className="btn btn-primary" onClick={room.rematch}>
                  {snapshot.rematch[rival] ? 'Aceptar la revancha' : 'Pedir revancha'}
                </button>
              )}
              {home}
            </GameOver>
          )
        }
        rivalStatus={
          rivalOffline &&
          winner === null && (
            <span className="offline" role="status">
              <WifiOff aria-hidden="true" /> Desconectado, esperando que vuelva
              {seconds !== null ? ` (${seconds} s)` : ''}
            </span>
          )
        }
      />
    </>
  )
}
