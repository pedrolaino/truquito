import { type FormEvent, useState } from 'react'
import type { Level } from '../bots/index.ts'
import type { GameConfig } from '../engine/game.ts'
import { cleanName } from '../shared/protocol.ts'
import { saveName, savedName, saveToken } from './storage.ts'

interface Props {
  onPlayBot: (level: Level, config: GameConfig) => void
  navigate: (path: string) => void
}

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
    if (!clean) return setError('Poné un nombre de 1 a 20 caracteres.')
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
    <main>
      <h1>Truquito</h1>
      <p>Truco argentino para jugar contra el bot o con alguien por link.</p>

      <form onSubmit={createRoom}>
        <label>
          Tu nombre{' '}
          <input
            value={name}
            maxLength={20}
            autoComplete="nickname"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <fieldset>
          <legend>Reglas</legend>
          <label>
            <input type="radio" name="flor" checked={!flor} onChange={() => setFlor(false)} /> Sin
            flor
          </label>
          <label>
            <input type="radio" name="flor" checked={flor} onChange={() => setFlor(true)} /> Con
            flor
          </label>
          <label>
            <input
              type="radio"
              name="target"
              checked={target === 15}
              onChange={() => setTarget(15)}
            />{' '}
            A 15
          </label>
          <label>
            <input
              type="radio"
              name="target"
              checked={target === 30}
              onChange={() => setTarget(30)}
            />{' '}
            A 30
          </label>
        </fieldset>

        <fieldset>
          <legend>Contra el bot</legend>
          {(
            [
              ['easy', 'Fácil'],
              ['medium', 'Medio'],
              ['hard', 'Difícil'],
            ] as const
          ).map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name="level"
                checked={level === value}
                onChange={() => setLevel(value)}
              />{' '}
              {label}
            </label>
          ))}
          <button type="button" onClick={() => onPlayBot(level, { flor, target })}>
            Jugar contra el bot
          </button>
        </fieldset>

        <fieldset>
          <legend>Online 1 contra 1</legend>
          <p>Creá una sala y mandale el link a quien quieras.</p>
          <button type="submit" disabled={busy}>
            Crear sala
          </button>
        </fieldset>

        {error && <p role="alert">{error}</p>}
      </form>

      <section aria-label="Anotador">
        <h2>Anotador</h2>
        <p>¿Jugás con cartas de verdad? Llevá los puntos acá.</p>
        <button type="button" onClick={() => navigate('/anotador')}>
          Abrir el anotador
        </button>
      </section>
    </main>
  )
}
