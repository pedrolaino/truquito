import { type CSSProperties, type FormEvent, useRef, useState } from 'react'
import { Bot, GraduationCap, Link2, Play, Users } from 'lucide-react'
import type { Level } from '../bots/index.ts'
import type { GameConfig } from '../engine/game.ts'
import { cleanName } from '../shared/protocol.ts'
import { CardView } from './Card.tsx'
import { Link } from './Link.tsx'
import { saveName, savedName, saveToken } from './storage.ts'

interface Props {
  onPlayBot: (level: Level, config: GameConfig) => void
  navigate: (path: string) => void
}

const LEVELS = [
  ['easy', 'Fácil'],
  ['medium', 'Medio'],
  ['hard', 'Difícil'],
] as const

const tilt = (deg: number) => ({ '--tilt': `${deg}deg` }) as CSSProperties

export function Home({ onPlayBot, navigate }: Props) {
  const nameField = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(savedName)
  const [flor, setFlor] = useState(false)
  const [target, setTarget] = useState<15 | 30>(15)
  const [level, setLevel] = useState<Level>('medium')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const invalidName = error !== null && !cleanName(name)

  async function createRoom(e: FormEvent) {
    e.preventDefault()
    const clean = cleanName(name)
    if (!clean) {
      setError('Poné un nombre de 1 a 20 caracteres para crear la sala.')
      nameField.current?.focus()
      return
    }
    saveName(clean)
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean, flor, target }),
      })
      if (res.status === 429) throw new Error('Creaste muchas salas seguidas. Probá en un minuto.')
      if (!res.ok) throw new Error('No pudimos crear la sala. Probá de nuevo.')
      const { roomId, token } = (await res.json()) as { roomId: string; token: string }
      saveToken(roomId, token)
      navigate(`/r/${roomId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <main className="page home">
      <header className="home-intro">
        <div className="hero-cards" aria-hidden="true">
          <CardView card={{ rank: 1, suit: 'espada' }} style={tilt(-10)} />
          <CardView card={{ rank: 7, suit: 'oro' }} style={tilt(-2)} />
          <CardView card={{ rank: 3, suit: 'copa' }} style={tilt(7)} />
        </div>
        <h1 className="page-title" translate="no">
          Truquito
        </h1>
        <p className="lead">
          Un truco, donde estés. Jugá contra el bot o invitá a alguien por link.
        </p>
        <nav className="home-links" aria-label="Más formas de jugar">
          <Link className="btn" href="/aprender">
            <GraduationCap aria-hidden="true" /> Aprender a jugar
          </Link>
          <Link className="btn btn-quiet" href="/anotador">
            Abrir el anotador
          </Link>
        </nav>
      </header>
      <div className="home-play">
        <section className="panel play-panel" aria-labelledby="bot-title">
          <h2 id="bot-title">
            <Bot aria-hidden="true" /> Contra el bot
          </h2>
          <fieldset className="choice">
            <legend className="sr-only">Dificultad</legend>
            {LEVELS.map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="level"
                  checked={level === value}
                  onChange={() => setLevel(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onPlayBot(level, { flor, target })}
          >
            <Play aria-hidden="true" /> Jugar contra el bot
          </button>
          <p className="game-settings">
            A {target} · {flor ? 'Con flor' : 'Sin flor'}
          </p>
        </section>
        <section className="panel rules-panel" aria-labelledby="rules-title">
          <h2 id="rules-title">Reglas de la mesa</h2>
          <div className="rules-choices">
            <fieldset className="choice">
              <legend>Flor</legend>
              <label>
                <input type="radio" name="flor" checked={!flor} onChange={() => setFlor(false)} />
                <span>Sin flor</span>
              </label>
              <label>
                <input type="radio" name="flor" checked={flor} onChange={() => setFlor(true)} />
                <span>Con flor</span>
              </label>
            </fieldset>
            <fieldset className="choice">
              <legend>Puntos</legend>
              <label>
                <input
                  type="radio"
                  name="target"
                  checked={target === 15}
                  onChange={() => setTarget(15)}
                />
                <span>A 15</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="target"
                  checked={target === 30}
                  onChange={() => setTarget(30)}
                />
                <span>A 30</span>
              </label>
            </fieldset>
          </div>
          <p className="game-settings">Estas reglas valen para el bot y para la sala que crees.</p>
        </section>
        <form onSubmit={createRoom} className="panel online-panel" aria-labelledby="online-title">
          <h2 id="online-title">
            <Users aria-hidden="true" /> Online 1 contra 1
          </h2>
          <p>Creá una sala y mandale el link a quien quieras.</p>
          <label className="field">
            Tu nombre
            <input
              ref={nameField}
              name="nickname"
              value={name}
              maxLength={20}
              autoComplete="nickname"
              spellCheck={false}
              aria-invalid={invalidName}
              aria-describedby={invalidName ? 'name-error' : undefined}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
            />
          </label>
          {error && (
            <p id="name-error" role="alert" className="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn" disabled={busy} aria-busy={busy}>
            <Link2 aria-hidden="true" /> {busy ? 'Creando sala…' : 'Crear sala'}
          </button>
        </form>
      </div>
    </main>
  )
}
