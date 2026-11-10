import { BookOpen, Check, ChevronRight, House, Lightbulb } from 'lucide-react'
import { Fosforos } from '../Fosforos.tsx'
import type { Lesson } from './lesson.ts'

interface Props {
  lessons: Lesson[]
  done: Set<string>
  navigate: (path: string) => void
}

/** Entry point for learning: the quick guide and the lessons, in order. */
export function LearnHub({ lessons, done, navigate }: Props) {
  const next = lessons.find((l) => !done.has(l.id))
  const count = lessons.filter((l) => done.has(l.id)).length
  return (
    <main className="page">
      <div>
        <h1 className="page-title">Aprender a jugar</h1>
        <p className="lead">Todo lo que necesitás para jugar al truco, de a poco.</p>
      </div>

      <div className="learn-progress">
        <Fosforos points={count} target={0} />
        <span>
          {count === 0
            ? 'Empezá por la primera lección.'
            : count === lessons.length
              ? '¡Terminaste todas las lecciones!'
              : `Llevás ${count} de ${lessons.length} lecciones.`}
        </span>
      </div>

      <nav aria-label="Lecciones">
        <ol className="learn-list">
          {lessons.map((lesson, i) => {
            const finished = done.has(lesson.id)
            return (
              <li key={lesson.id}>
                <button
                  type="button"
                  className={lesson === next ? 'learn-item is-next' : 'learn-item'}
                  onClick={() => navigate(`/aprender/${lesson.id}`)}
                >
                  <span
                    className={finished ? 'learn-number is-done' : 'learn-number'}
                    aria-hidden="true"
                  >
                    {finished ? <Check /> : i + 1}
                  </span>
                  <span className="learn-text">
                    <span className="learn-title">{lesson.title}</span>
                    <span className="learn-sub">
                      {lesson.summary}
                      {finished ? '. Terminada' : ''}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <button
        type="button"
        className={next ? 'learn-item' : 'learn-item is-next'}
        onClick={() => navigate('/aprender/ayudante')}
      >
        <Lightbulb aria-hidden="true" className="learn-icon" />
        <span className="learn-text">
          <span className="learn-title">Partida con ayudante</span>
          <span className="learn-sub">
            Una partida de verdad con alguien que te sugiere qué jugar
          </span>
        </span>
        <ChevronRight aria-hidden="true" />
      </button>

      <button type="button" className="learn-item" onClick={() => navigate('/aprender/guia')}>
        <BookOpen aria-hidden="true" className="learn-icon" />
        <span className="learn-text">
          <span className="learn-title">Guía rápida</span>
          <span className="learn-sub">
            La escala de cartas, los cantos y el envido, para consultar
          </span>
        </span>
        <ChevronRight aria-hidden="true" />
      </button>

      <button type="button" className="btn btn-quiet" onClick={() => navigate('/')}>
        <House aria-hidden="true" /> Volver al inicio
      </button>
    </main>
  )
}
