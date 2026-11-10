import { BookOpen, ChevronRight, House } from 'lucide-react'

interface Props {
  navigate: (path: string) => void
}

/** Entry point for learning: the quick guide and, later on, the lessons. */
export function LearnHub({ navigate }: Props) {
  return (
    <main className="page">
      <div>
        <h1 className="page-title">Aprender a jugar</h1>
        <p className="lead">Todo lo que necesitás para jugar al truco, de a poco.</p>
      </div>
      <nav className="learn-list" aria-label="Aprender">
        <button type="button" className="learn-item" onClick={() => navigate('/aprender/guia')}>
          <BookOpen aria-hidden="true" className="learn-icon" />
          <span className="learn-text">
            <span className="learn-title">Guía rápida</span>
            <span className="learn-sub">
              Qué carta gana, cuánto vale cada canto y cómo contar el envido
            </span>
          </span>
          <ChevronRight aria-hidden="true" />
        </button>
      </nav>
      <button type="button" className="btn btn-quiet" onClick={() => navigate('/')}>
        <House aria-hidden="true" /> Volver al inicio
      </button>
    </main>
  )
}
