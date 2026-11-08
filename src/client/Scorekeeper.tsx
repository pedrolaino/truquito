import { House, Minus } from 'lucide-react'
import { useState } from 'react'
import { Fosforos } from './Fosforos.tsx'
import { saveTally, savedTally } from './storage.ts'
import { type Tally, addPoint, newTally, tallyWinner } from './tally.ts'
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
      <main className="page">
        <h1 className="page-title">Anotador</h1>
        <p className="lead">
          Para llevar los puntos de un truco con cartas de verdad. Tocás el equipo y suma un
          fósforo.
        </p>
        <div className="panel">
          <h2>¿A cuántos juegan?</h2>
          <div className="row" role="group" aria-label="¿A cuántos juegan?">
            <button type="button" className="btn btn-primary" onClick={() => update(newTally(15))}>
              A 15
            </button>
            <button type="button" className="btn btn-primary" onClick={() => update(newTally(30))}>
              A 30
            </button>
          </div>
        </div>
        <button type="button" className="btn btn-quiet" onClick={onExit}>
          <House aria-hidden="true" /> Volver al inicio
        </button>
      </main>
    )

  const winner = tallyWinner(tally)
  return (
    <main className="tally">
      <div className="tally-head">
        <h1>Anotador</h1>
        <p>A {tally.target}</p>
      </div>
      {TEAMS.map((team, i) => (
        <section key={team} aria-label={team} className={winner === i ? 'team winner' : 'team'}>
          <button
            type="button"
            className="team-add"
            disabled={winner !== null}
            aria-label={`Sumar un punto a ${team}`}
            onClick={() => update(addPoint(tally, i as 0 | 1, 1))}
          >
            <span className="team-name" aria-hidden="true">
              {team}{' '}
              <span className="team-points">{scoreText(tally.points[i]!, tally.target)}</span>
            </span>
            <Fosforos points={tally.points[i]!} target={tally.target} big />
          </button>
          <span className="sr-only" aria-live="polite">
            {team}: {scoreText(tally.points[i]!, tally.target)}
          </span>
          <button
            type="button"
            className="btn team-minus"
            disabled={tally.points[i] === 0}
            aria-label={`Restar un punto a ${team}`}
            onClick={() => update(addPoint(tally, i as 0 | 1, -1))}
          >
            <Minus aria-hidden="true" /> 1
          </button>
        </section>
      ))}
      <div className="tally-foot row">
        {winner !== null && (
          <p role="status" className="alert" style={{ flexBasis: '100%' }}>
            ¡Ganaron {TEAMS[winner]}!
          </p>
        )}
        <button type="button" className="btn" onClick={() => update(null)}>
          Nueva partida
        </button>
        <button type="button" className="btn btn-quiet" onClick={onExit}>
          <House aria-hidden="true" /> Inicio
        </button>
      </div>
    </main>
  )
}
