import { useState } from 'react'
import { type Tally, addPoint, newTally, tallyWinner } from './tally.ts'
import { saveTally, savedTally } from './storage.ts'
import { scoreText } from './text.ts'

const TEAMS = ['Nosotros', 'Ellos'] as const

/** Score counter for a game played with real cards. */
export function Scorekeeper({ onExit }: { onExit: () => void }) {
  const [tally, setTally] = useState<Tally | null>(savedTally)
  const update = (next: Tally | null) => {
    setTally(next)
    saveTally(next)
  }

  if (!tally)
    return (
      <main>
        <h1>Anotador</h1>
        <p>Para anotar los puntos de un truco con cartas de verdad.</p>
        <div role="group" aria-label="¿A cuántos?">
          <button type="button" onClick={() => update(newTally(15))}>
            A 15
          </button>
          <button type="button" onClick={() => update(newTally(30))}>
            A 30
          </button>
        </div>
        <button type="button" onClick={onExit}>
          Volver al inicio
        </button>
      </main>
    )

  const winner = tallyWinner(tally)
  return (
    <main>
      <h1>Anotador</h1>
      <p>A {tally.target}. Tocá un equipo para sumarle un punto.</p>
      {TEAMS.map((team, i) => (
        <section key={team} aria-label={team}>
          <button
            type="button"
            disabled={winner !== null}
            aria-label={`Sumar un punto a ${team}`}
            onClick={() => update(addPoint(tally, i as 0 | 1, 1))}
          >
            {team}: <span aria-live="polite">{scoreText(tally.points[i]!, tally.target)}</span>
          </button>
          <button
            type="button"
            disabled={tally.points[i] === 0}
            aria-label={`Restar un punto a ${team}`}
            onClick={() => update(addPoint(tally, i as 0 | 1, -1))}
          >
            −1
          </button>
        </section>
      ))}
      {winner !== null && <p role="status">¡Ganaron {TEAMS[winner]}!</p>}
      <button type="button" onClick={() => update(null)}>
        Nueva partida
      </button>
      <button type="button" onClick={onExit}>
        Volver al inicio
      </button>
    </main>
  )
}
