import { Minus, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Fosforos } from './Fosforos.tsx'
import { type Tally, puntasResult } from './tally.ts'

const TEAMS = ['Nosotros', 'Ellos'] as const
type Team = 0 | 1

interface Props {
  tally: Tally
  onPoint: (team: Team, delta: 1 | -1) => void
  onFinish: (summary: string) => void
}

export function puntasSummary(tally: Tally): string {
  const [ours, theirs] = tally.puntas ?? [0, 0]
  const result = puntasResult(tally)
  const scores = `Nosotros ${ours}, Ellos ${theirs}`
  return result
    ? `${scores}: +${result.points} para ${TEAMS[result.team]}`
    : `${scores}: empate, no suma nadie`
}

/** Puntas counters, shown as a small dialog over the regular score. */
export function Puntas({ tally, onPoint, onFinish }: Props) {
  const [confirming, setConfirming] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])
  const puntas = tally.puntas ?? [0, 0]

  return (
    <div className="overlay overlay-center">
      <section
        className="panel puntas"
        role="dialog"
        aria-modal="true"
        aria-labelledby="puntas-title"
      >
        <h2 id="puntas-title" ref={heading} tabIndex={-1}>
          Puntas
        </h2>
        {confirming ? (
          <>
            <p className="puntas-result">{puntasSummary(tally)}</p>
            <div className="row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onFinish(puntasSummary(tally))}
              >
                Sumar al anotador
              </button>
              <button type="button" className="btn" onClick={() => setConfirming(false)}>
                Seguir con las puntas
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="puntas-help">
              Cada uno contra el de enfrente. Al terminar, la diferencia va para el que hizo más.
            </p>
            <div className="puntas-teams">
              {TEAMS.map((team, i) => (
                <div key={team} className="puntas-team">
                  <span className="puntas-name">{team}</span>
                  <span className="puntas-count" aria-live="polite">
                    {puntas[i]}
                  </span>
                  <Fosforos points={puntas[i]!} target={0} />
                  <div className="puntas-buttons">
                    <button
                      type="button"
                      className="btn"
                      aria-label={`Restar un punto de puntas a ${team}`}
                      disabled={puntas[i] === 0}
                      onClick={() => onPoint(i as Team, -1)}
                    >
                      <Minus aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      aria-label={`Sumar un punto de puntas a ${team}`}
                      onClick={() => onPoint(i as Team, 1)}
                    >
                      <Plus aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-primary" onClick={() => setConfirming(true)}>
              Terminar puntas
            </button>
          </>
        )}
      </section>
    </div>
  )
}
