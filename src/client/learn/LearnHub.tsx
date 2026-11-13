import { BookOpen, Check, ChevronRight, House, Lightbulb } from 'lucide-react'
import { useState } from 'react'
import { Link } from '../Link.tsx'
import { Fosforos } from '../Fosforos.tsx'
import type { Lesson } from './lesson.ts'
import { STAGES } from './lessons.tsx'

interface Props {
  lessons: Lesson[]
  done: Set<string>
  /** When the last lesson was finished, 0 if never. */
  lastTime: number
}

const DAY = 24 * 60 * 60 * 1000

/** Entry point for learning: one next activity up top, then the whole path by stages. */
export function LearnHub({ lessons, done, lastTime }: Props) {
  const required = lessons.filter((l) => !l.optional)
  const next = required.find((l) => !done.has(l.id))
  const count = required.filter((l) => done.has(l.id)).length
  // Back after a few days, halfway through: a nudge to keep going.
  const [now] = useState(Date.now)
  const away = count > 0 && next && now - lastTime > 3 * DAY

  return (
    <main className="page learn-hub">
      <section className="learn-entry" aria-labelledby="learn-title">
        <h1 id="learn-title" className="page-title">
          Aprendé jugando
        </h1>
        <p className="lead">
          {count === 0
            ? 'Te repartimos tres cartas y te acompañamos en tu primera mano.'
            : next
              ? `Sigue: ${next.title}.`
              : 'Ya practicaste lo básico. Probalo en una partida con ayudante.'}
        </p>
        <Link
          className="btn btn-primary learn-start"
          href={next ? `/aprender/${next.id}` : '/aprender/ayudante'}
        >
          {count === 0
            ? 'Jugar mi primera mano'
            : next
              ? 'Continuar aprendiendo'
              : 'Jugar una partida con ayudante'}
        </Link>
        <div className="learn-more">
          <Link className="btn btn-quiet" href="/aprender/guia">
            <BookOpen aria-hidden="true" /> Consultar las reglas
          </Link>
          {next && (
            <Link className="btn btn-quiet" href="/aprender/ayudante">
              <Lightbulb aria-hidden="true" /> Partida con ayudante
            </Link>
          )}
        </div>
      </section>

      {count > 0 && (
        <div className="learn-progress">
          <Fosforos points={count} target={0} />
          <span>
            {away
              ? `Llevás ${count} de ${required.length}. La próxima lección te acerca a jugar de verdad.`
              : `Lecciones completadas: ${count} de ${required.length}`}
          </span>
        </div>
      )}

      <nav aria-label="Recorrido" className="learn-path">
        {STAGES.map((stage, s) => (
          <section key={stage} className="learn-stage" aria-labelledby={`stage-${s}`}>
            <h2 id={`stage-${s}`}>
              <span aria-hidden="true">{s + 1}</span> {stage}
            </h2>
            <ol className="learn-list">
              {lessons
                .filter((l) => l.stage === s)
                .map((lesson) => {
                  const finished = done.has(lesson.id)
                  return (
                    <li key={lesson.id}>
                      <Link
                        className={lesson === next ? 'learn-row is-next' : 'learn-row'}
                        href={`/aprender/${lesson.id}`}
                      >
                        <span
                          className={finished ? 'learn-mark is-done' : 'learn-mark'}
                          aria-hidden="true"
                        >
                          {finished && <Check />}
                        </span>
                        <span className="learn-text">
                          <span className="learn-title">{lesson.title}</span>
                          <span className="learn-sub">
                            {lesson.summary}
                            {finished ? '. Terminada' : ''}
                          </span>
                        </span>
                        <ChevronRight aria-hidden="true" />
                      </Link>
                    </li>
                  )
                })}
            </ol>
          </section>
        ))}
      </nav>

      <Link className="btn btn-quiet" href="/">
        <House aria-hidden="true" /> Volver al inicio
      </Link>
    </main>
  )
}
