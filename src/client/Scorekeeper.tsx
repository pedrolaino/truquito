import { Link } from './Link.tsx'
import { House, Minus } from 'lucide-react'
import { useState } from 'react'
import { Fosforos } from './Fosforos.tsx'
import { ConfirmDialog } from './ConfirmDialog.tsx'
import { Puntas } from './Puntas.tsx'
import { saveTally, savedTally } from './storage.ts'
import {
  type Tally,
  addPoint,
  addPunta,
  finishPuntas,
  newTally,
  startPuntas,
  tallyWinner,
} from './tally.ts'
import { scoreText } from './text.ts'

const TEAMS = ['Nosotros', 'Ellos'] as const
type Team = 0 | 1

/** Score counter for a game played with real cards. */
export function Scorekeeper() {
  const [resetting, setResetting] = useState(false)
  const [tally, setTally] = useState<Tally | null>(savedTally)
  const [lastPuntas, setLastPuntas] = useState<string | null>(null)
  const update = (next: Tally | null) => {
    setTally(next)
    saveTally(next)
    setLastPuntas(null)
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
        <Link className="btn btn-quiet" href="/">
          <House aria-hidden="true" /> Volver al inicio
        </Link>
      </main>
    )

  const winner = tallyWinner(tally)
  return (
    <>
      {/* The regular score stays behind the puntas dialog, out of reach until it closes. */}
      <main className="tally" inert={tally.puntas !== null}>
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
              onClick={() => update(addPoint(tally, i as Team, 1))}
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
              onClick={() => update(addPoint(tally, i as Team, -1))}
            >
              <Minus aria-hidden="true" /> 1
            </button>
          </section>
        ))}
        <div className="tally-foot row">
          {lastPuntas && (
            <p role="status" className="alert" style={{ flexBasis: '100%' }}>
              Puntas: {lastPuntas}
            </p>
          )}
          {winner !== null && (
            <p role="status" className="alert" style={{ flexBasis: '100%' }}>
              ¡Ganaron {TEAMS[winner]}!
            </p>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={winner !== null}
            onClick={() => update(startPuntas(tally))}
          >
            Jugar puntas
          </button>
          <button
            type="button"
            className="btn"
            onClick={() =>
              tally.points.some((points) => points > 0) ? setResetting(true) : update(null)
            }
          >
            Nueva partida
          </button>
          <Link className="btn btn-quiet" href="/">
            <House aria-hidden="true" /> Inicio
          </Link>
        </div>
      </main>
      {resetting && (
        <ConfirmDialog
          title="¿Empezar de nuevo?"
          detail="Se van a borrar los puntos de esta partida."
          confirm="Nueva partida"
          onCancel={() => setResetting(false)}
          onConfirm={() => {
            setResetting(false)
            update(null)
          }}
        />
      )}
      {tally.puntas && (
        <Puntas
          tally={tally}
          onPoint={(team, delta) => update(addPunta(tally, team, delta))}
          onFinish={(summary) => {
            update(finishPuntas(tally))
            setLastPuntas(summary)
          }}
        />
      )}
    </>
  )
}
