import { Fragment, type ReactNode, useEffect, useRef } from 'react'
import { Fosforos } from './Fosforos.tsx'

interface Props {
  won: boolean
  detail?: string
  /** Names and points, me first. */
  names: [string, string]
  scores: [number, number]
  target: number
  children: ReactNode
}

export function GameOver({ won, detail, names, scores, target, children }: Props) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])
  return (
    <div className="overlay">
      <section className="panel" aria-labelledby="game-over" aria-modal="false">
        <h2 id="game-over" className="result-title" ref={heading} tabIndex={-1}>
          {won ? '¡Ganaste!' : 'Perdiste'}
        </h2>
        {detail && <p>{detail}</p>}
        <div className="final-score">
          {names.map((name, i) => (
            <Fragment key={name}>
              <span>
                {name} {scores[i]}
              </span>
              <Fosforos points={scores[i]!} target={target} />
            </Fragment>
          ))}
        </div>
        <div className="row">{children}</div>
      </section>
    </div>
  )
}
