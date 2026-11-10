import { type CSSProperties, type FormEvent, useState } from 'react'
import { Bot, ChevronRight, GraduationCap, Link2, Play, Users } from 'lucide-react'
import type { Level } from '../bots/index.ts'
import type { GameConfig } from '../engine/game.ts'
import { cleanName } from '../shared/protocol.ts'
import { CardView } from './Card.tsx'
import { Fosforos } from './Fosforos.tsx'
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
  const [name, setName] = useState(savedName)
  const [flor, setFlor] = useState(false)
  const [target, setTarget] = useState<15 | 30>(15)
  const [level, setLevel] = useState<Level>('medium')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function createRoom(e: FormEvent) {
    e.preventDefault()
    const clean = cleanName(name)
    if (!clean) return setError('Poné un nombre de 1 a 20 caracteres para crear la sala.')
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
    <main className="page">
      <div className="hero-cards" aria-hidden="true">
        <CardView card={{ rank: 1, suit: 'espada' }} style={tilt(-10)} />
        <CardView card={{ rank: 7, suit: 'oro' }} style={tilt(-2)} />
        <CardView card={{ rank: 3, suit: 'copa' }} style={tilt(7)} />
      </div>
      <div>
        <h1 className="page-title">Truquito</h1>
        <p className="lead">
          Truco argentino para jugar contra el bot o con quien quieras, por link.
        </p>
      </div>

      <button type="button" className="learn-banner" onClick={() => navigate('/aprender')}>
        <GraduationCap aria-hidden="true" />
        <span>
          <strong>¿No sabés jugar?</strong> Aprendé el truco paso a paso
        </span>
        <ChevronRight aria-hidden="true" />
      </button>

      <form onSubmit={createRoom} className="page" style={{ padding: 0 }}>
        <label className="field">
          Tu nombre
          <input
            value={name}
            maxLength={20}
            autoComplete="nickname"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div className="panel">
          <h2>Reglas</h2>
          <fieldset className="choice">
            <legend className="sr-only">Flor</legend>
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
            <legend className="sr-only">Puntos</legend>
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

        <div className="panel">
          <h2>
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
        </div>

        <div className="panel">
          <h2>
            <Users aria-hidden="true" /> Online 1 contra 1
          </h2>
          <p>Creá una sala y mandale el link a quien quieras.</p>
          <button type="submit" className="btn" disabled={busy}>
            <Link2 aria-hidden="true" /> Crear sala
          </button>
          {error && (
            <p role="alert" className="alert">
              {error}
            </p>
          )}
        </div>
      </form>

      <section className="panel" aria-labelledby="anotador">
        <h2 id="anotador">Anotador</h2>
        <p>¿Jugás con cartas de verdad? Llevá los puntos acá, con fósforos.</p>
        <Fosforos points={8} target={15} />
        <button type="button" className="btn" onClick={() => navigate('/anotador')}>
          Abrir el anotador
        </button>
      </section>
    </main>
  )
}
