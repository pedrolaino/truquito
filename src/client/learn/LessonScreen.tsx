import { Check, X } from 'lucide-react'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import { bots } from '../../bots/index.ts'
import { seededRandom } from '../../bots/match.ts'
import { type Card, compareCards, envidoPoints } from '../../engine/cards.ts'
import { type Action, actorOf, viewFor } from '../../engine/game.ts'
import { BotGame, type Decide } from '../botGame.ts'
import { CardView } from '../Card.tsx'
import { Fosforos } from '../Fosforos.tsx'
import { playFeedback } from '../sound.ts'
import { Table } from '../Table.tsx'
import { cardName } from '../text.ts'
import { scrollToSuggestion } from './scroll.ts'
import { type Lesson, ME, type Play, type Step, playStart, sameAction } from './lesson.ts'

interface Props {
  lesson: Lesson
  /** How many lessons are done, counting this one once it ends. */
  doneCount: number
  total: number
  next: Lesson | null
  onFinish: () => void
  onExit: () => void
  onNext: () => void
}

export function LessonScreen({ lesson, doneCount, total, next, onFinish, onExit, onNext }: Props) {
  const [index, setIndex] = useState(0)
  const finished = index >= lesson.steps.length
  useEffect(() => {
    if (finished) onFinish()
  }, [finished, onFinish])

  return (
    <main className="lesson">
      <header className="lesson-bar">
        <button
          type="button"
          className="icon-btn"
          aria-label="Salir de la lección"
          onClick={onExit}
        >
          <X aria-hidden="true" />
        </button>
        <div
          className="lesson-progress"
          role="progressbar"
          aria-label={`Avance de ${lesson.title}`}
          aria-valuemin={0}
          aria-valuemax={lesson.steps.length}
          aria-valuenow={Math.min(index, lesson.steps.length)}
        >
          <span
            style={{
              width: `${(Math.min(index, lesson.steps.length) / lesson.steps.length) * 100}%`,
            }}
          />
        </div>
      </header>
      {finished ? (
        <section className="lesson-step lesson-done" aria-labelledby="lesson-done">
          <span className="done-check" aria-hidden="true">
            <Check />
          </span>
          <h1 id="lesson-done">¡Lección terminada!</h1>
          <p className="lesson-text">{lesson.title}</p>
          <p className="lead">
            Llevás {doneCount} de {total} lecciones.
          </p>
          <Fosforos points={doneCount} target={0} big />
          <div className="lesson-actions">
            <button type="button" className="btn btn-primary" onClick={onNext}>
              {next ? `Seguir: ${next.title}` : 'Jugar una partida con ayudante'}
            </button>
            <button type="button" className="btn" onClick={onExit}>
              Volver al menú
            </button>
          </div>
        </section>
      ) : (
        <StepView
          key={index}
          step={lesson.steps[index]!}
          first={index === 0}
          onDone={() => setIndex(index + 1)}
        />
      )}
    </main>
  )
}

function StepView({ step, first, onDone }: { step: Step; first: boolean; onDone: () => void }) {
  switch (step.kind) {
    case 'say':
      return (
        <section className="lesson-step" aria-labelledby="step-title">
          {step.visual && <div className="lesson-visual">{step.visual}</div>}
          <h1 id="step-title">{step.title}</h1>
          <p className="lesson-text">{step.text}</p>
          <div className="lesson-actions">
            <button type="button" className="btn btn-primary" onClick={onDone} autoFocus>
              {first ? 'Empezar' : 'Seguir'}
            </button>
          </div>
        </section>
      )
    case 'whichWins': {
      const diff = compareCards(step.a, step.b)
      const right = diff > 0 ? 'a' : diff < 0 ? 'b' : 'tie'
      return (
        <Quiz
          prompt="¿Cuál gana?"
          explain={step.explain}
          answer={right}
          onDone={onDone}
          options={[
            { id: 'a', content: <CardView card={step.a} />, label: cardName(step.a), card: true },
            { id: 'b', content: <CardView card={step.b} />, label: cardName(step.b), card: true },
            { id: 'tie', content: 'Empatan', label: 'Empatan' },
          ]}
        />
      )
    }
    case 'count':
      return (
        <Quiz
          prompt="¿Cuántos tenés de envido?"
          visual={<HandRow cards={step.hand} />}
          explain={step.explain}
          answer={String(envidoPoints(step.hand))}
          onDone={onDone}
          options={step.options.map((n) => ({
            id: String(n),
            content: String(n),
            label: String(n),
          }))}
        />
      )
    case 'choose':
      return (
        <Quiz
          prompt={step.prompt}
          explain={step.explain}
          answer={String(step.answer)}
          onDone={onDone}
          options={step.options.map((text, i) => ({ id: String(i), content: text, label: text }))}
        />
      )
    case 'play':
      return <PlayStep title={step.title} play={step.play} onDone={onDone} />
  }
}

function HandRow({ cards }: { cards: Card[] }) {
  return (
    <div className="lesson-cards">
      {cards.map((card) => (
        <CardView key={cardName(card)} card={card} />
      ))}
    </div>
  )
}

interface Option {
  id: string
  content: ReactNode
  label: string
  card?: boolean
}

function Quiz({
  prompt,
  visual,
  options,
  answer,
  explain,
  onDone,
}: {
  prompt: string
  visual?: ReactNode
  options: Option[]
  answer: string
  explain: string
  onDone: () => void
}) {
  const [picked, setPicked] = useState<string | null>(null)
  const right = picked === answer
  const choose = (id: string) => {
    if (picked) return
    setPicked(id)
    playFeedback(id === answer)
  }
  const state = (id: string) =>
    !picked ? '' : id === answer ? ' is-right' : id === picked ? ' is-wrong' : ' is-faded'

  return (
    <section className="lesson-step" aria-labelledby="quiz-prompt">
      {visual && <div className="lesson-visual">{visual}</div>}
      <h1 id="quiz-prompt">{prompt}</h1>
      <div className={options.some((o) => o.card) ? 'quiz-options quiz-cards' : 'quiz-options'}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={(o.card ? 'quiz-card' : 'btn quiz-option') + state(o.id)}
            aria-label={o.label}
            disabled={picked !== null && o.id !== picked && o.id !== answer}
            onClick={() => choose(o.id)}
          >
            {o.content}
          </button>
        ))}
      </div>
      {picked && (
        <div className={right ? 'feedback is-right' : 'feedback is-wrong'} role="status">
          <strong>{right ? '¡Bien!' : 'No exactamente'}</strong>
          <p>{explain}</p>
          <button type="button" className="btn btn-primary" onClick={onDone} autoFocus>
            Seguir
          </button>
        </div>
      )}
    </section>
  )
}

function PlayStep({ title, play, onDone }: { title: string; play: Play; onDone: () => void }) {
  const [game] = useState(() => {
    let used = 0
    // The rival follows the script; past it an easy bot plays, which the goal never needs.
    const decide: Decide = async (_, view, legal, seed) => {
      const scripted = play.rival[used++]
      if (scripted && legal.some((a) => sameAction(a, scripted))) return scripted
      return bots.easy(view, legal, seededRandom(seed))
    }
    const schedule = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms)
      return () => clearTimeout(id)
    }
    return new BotGame(
      'easy',
      { flor: false, target: 15 },
      1,
      decide,
      schedule,
      seededRandom(7),
      playStart(play),
    )
  })
  useEffect(() => () => game.dispose(), [game])
  const { state, events } = useSyncExternalStore(game.subscribe, game.getSnapshot)
  const [cue, setCue] = useState(0)
  const [busy, setBusy] = useState(true)
  const onBusyChange = useCallback((b: boolean) => setBusy(b), [])
  const reached = play.goal(state, events)
  useEffect(() => {
    if (reached) game.dispose()
  }, [reached, game])

  // Once the goal ends the round, keep the finished round on the table instead of the next deal.
  const shown = useMemo(() => {
    const view = viewFor(state, ME)
    const deal = events.findLastIndex((e) => e.type === 'deal')
    if (!reached || deal === -1 || !view.previous) return { view, events }
    return {
      view: { ...view, round: view.previous, roundNumber: view.roundNumber - 1 },
      events: events.slice(0, deal),
    }
  }, [state, events, reached])

  const current = play.cues[cue]
  useEffect(() => scrollToSuggestion(), [cue, busy])
  const myTurn = !reached && actorOf(state) === ME
  const act = (action: Action) => {
    if (current && sameAction(action, current.expect) && game.play(action)) setCue(cue + 1)
  }

  return (
    <section className="lesson-play" aria-label={title}>
      <p className="coach" role="status">
        {reached ? '¡Listo!' : busy || !myTurn ? 'Mirá lo que pasa en la mesa…' : current?.say}
      </p>
      <Table
        view={shown.view}
        names={['Vos', 'El rival']}
        events={shown.events}
        onAction={act}
        allow={(a) => !!current && sameAction(a, current.expect)}
        hideScore
        onBusyChange={onBusyChange}
        over={
          reached && (
            <div className="overlay overlay-center">
              <section
                className="panel feedback is-right"
                role="dialog"
                aria-labelledby="play-done"
              >
                <strong id="play-done">¡Bien!</strong>
                <p>{play.done}</p>
                <button type="button" className="btn btn-primary" onClick={onDone} autoFocus>
                  Seguir
                </button>
              </section>
            </div>
          )
        }
      />
    </section>
  )
}
