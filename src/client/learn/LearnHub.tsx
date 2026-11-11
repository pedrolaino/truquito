import { BookOpen, Check, ChevronRight, House, Lightbulb } from 'lucide-react'
import { Fosforos } from '../Fosforos.tsx'
import type { Lesson } from './lesson.ts'

interface Props {
  lessons: Lesson[]
  done: Set<string>
  /** When the last lesson was finished, 0 if never. */
  lastTime: number
  navigate: (path: string) => void
}

const DAY = 24 * 60 * 60 * 1000

function progressText(count: number, total: number, lastTime: number): string {
  if (count === 0) return 'Empezá por la primera, son 2 minutos.'
  if (count === total) return '¡Listo! Ya sabés jugar. Animate a una partida.'
  // Back after a few days, halfway through: a nudge to keep going.
  if (count >= 3 && count <= 6 && Date.now() - lastTime > 3 * DAY)
    return `Llevás ${count} de ${total}. La próxima lección son 3 minutos y ya estás cerca de poder jugar de verdad.`
  return `Llevás ${count} de ${total}. Seguí con la próxima.`
}

/** Entry point for learning: the quick guide and the lessons, in order. */
export function LearnHub({ lessons, done, lastTime, navigate }: Props) {
  const next = lessons.find((l) => !done.has(l.id))
  const count = lessons.filter((l) => done.has(l.id)).length
  return (
    <main className="page">
      <div>
        <h1 className="page-title">Aprender a jugar</h1>
        <p className="lead">
          ¿Todos juegan y vos mirás? En {lessons.length} lecciones vas a saber sentarte a la mesa.
        </p>
      </div>

      <div className="learn-progress">
        <Fosforos points={count} target={0} />
        <span>{progressText(count, lessons.length, lastTime)}</span>
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
            La escala de cartas, el envido y los cantos, para consultar
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
