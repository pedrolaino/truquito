import { House, Minus } from 'lucide-react'
import { useState } from 'react'
import { Fosforos } from './Fosforos.tsx'
import { saveTally, savedTally } from './storage.ts'
import {
  type Tally,
  addPoint,
  addPunta,
  finishPuntas,
  newTally,
  puntasResult,
  startPuntas,
  tallyWinner,
} from './tally.ts'
import { scoreText } from './text.ts'

const TEAMS = ['Nosotros', 'Ellos'] as const
type Team = 0 | 1

function resultText(tally: Tally): string {
  const [ours, theirs] = tally.puntas ?? [0, 0]
  const result = puntasResult(tally)
  const summary = `Nosotros ${ours}, Ellos ${theirs}`
  return result
    ? `${summary}: +${result.points} para ${TEAMS[result.team]}`
    : `${summary}: empate, no suma nadie`
}

/** Score counter for a game played with real cards. */
export function Scorekeeper({ onExit }: { onExit: () => void }) {
  const [tally, setTally] = useState<Tally | null>(savedTally)
  const [confirming, setConfirming] = useState(false)
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
        <button type="button" className="btn btn-quiet" onClick={onExit}>
          <House aria-hidden="true" /> Volver al inicio
        </button>
      </main>
    )

  const winner = tallyWinner(tally)
  const puntas = tally.puntas
  const count = (team: Team) => (puntas ? puntas[team] : tally.points[team])
  const label = (team: Team) =>
    puntas ? String(puntas[team]) : scoreText(tally.points[team], tally.target)
  const change = (team: Team, delta: 1 | -1) =>
    update(puntas ? addPunta(tally, team, delta) : addPoint(tally, team, delta))

  return (
    <main className={puntas ? 'tally puntas' : 'tally'}>
      <div className="tally-head">
        <h1>{puntas ? 'Puntas' : 'Anotador'}</h1>
        <p>
          {puntas
            ? `Partida: Nosotros ${scoreText(tally.points[0], tally.target)}, Ellos ${scoreText(tally.points[1], tally.target)}`
            : `A ${tally.target}`}
        </p>
      </div>
      {TEAMS.map((team, i) => {
        const t = i as Team
        return (
          <section
            key={team}
            aria-label={team}
            className={!puntas && winner === t ? 'team winner' : 'team'}
          >
            <button
              type="button"
              className="team-add"
              disabled={!puntas && winner !== null}
              aria-label={`Sumar un punto a ${team}`}
              onClick={() => change(t, 1)}
            >
              <span className="team-name" aria-hidden="true">
                {team} <span className="team-points">{label(t)}</span>
              </span>
              <Fosforos points={count(t)} target={puntas ? 0 : tally.target} big />
            </button>
            <span className="sr-only" aria-live="polite">
              {team}: {label(t)}
            </span>
            <button
              type="button"
              className="btn team-minus"
              disabled={count(t) === 0}
              aria-label={`Restar un punto a ${team}`}
              onClick={() => change(t, -1)}
            >
              <Minus aria-hidden="true" /> 1
            </button>
          </section>
        )
      })}
      <div className="tally-foot row">
        {lastPuntas && (
          <p role="status" className="alert" style={{ flexBasis: '100%' }}>
            Puntas: {lastPuntas}
          </p>
        )}
        {!puntas && winner !== null && (
          <p role="status" className="alert" style={{ flexBasis: '100%' }}>
            ¡Ganaron {TEAMS[winner]}!
          </p>
        )}
        {puntas && confirming && (
          <div
            className="panel"
            role="dialog"
            aria-label="Terminar puntas"
            style={{ flexBasis: '100%' }}
          >
            <p>{resultText(tally)}</p>
            <div className="row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const text = resultText(tally)
                  update(finishPuntas(tally))
                  setConfirming(false)
                  setLastPuntas(text)
                }}
              >
                Sumar al anotador
              </button>
              <button type="button" className="btn" onClick={() => setConfirming(false)}>
                Seguir con las puntas
              </button>
            </div>
          </div>
        )}
        {puntas && !confirming && (
          <button type="button" className="btn btn-primary" onClick={() => setConfirming(true)}>
            Terminar puntas
          </button>
        )}
        {!puntas && (
          <>
            <button
              type="button"
              className="btn btn-primary"
              disabled={winner !== null}
              onClick={() => update(startPuntas(tally))}
            >
              Jugar puntas
            </button>
            <button type="button" className="btn" onClick={() => update(null)}>
              Nueva partida
            </button>
          </>
        )}
        <button type="button" className="btn btn-quiet" onClick={onExit}>
          <House aria-hidden="true" /> Inicio
        </button>
      </div>
    </main>
  )
}
