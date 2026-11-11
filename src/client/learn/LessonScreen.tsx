import { ArrowRight, Check, CircleHelp, X } from 'lucide-react'
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
import { GuideSheet } from './GuideSheet.tsx'
import { scrollToSuggestion } from './scroll.ts'
import {
  type Lesson,
  ME,
  type Play,
  type Step,
  cueAllows,
  playStart,
  sameAction,
} from './lesson.ts'

interface Props {
  lesson: Lesson
  /** Its place in the list, from 1. */
  number: number
  /** How many lessons are done, counting this one once it ends. */
  doneCount: number
  total: number
  next: Lesson | null
  onFinish: () => void
  onExit: () => void
  onNext: () => void
}

export function LessonScreen({
  lesson,
  number,
  doneCount,
  total,
  next,
  onFinish,
  onExit,
  onNext,
}: Props) {
  // Screen 0 is the hook; the steps follow.
  const [index, setIndex] = useState(0)
  const [guide, setGuide] = useState(false)
  const screens = lesson.steps.length + 1
  const finished = index >= screens
  const progress = Math.min(index, screens)
  useEffect(() => {
    if (finished) onFinish()
  }, [finished, onFinish])
  const step = lesson.steps[index - 1]
  const label = step?.next ?? (index === screens - 2 ? 'Último paso' : undefined)

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
          aria-valuemax={screens}
          aria-valuenow={progress}
        >
          <span style={{ width: `${(progress / screens) * 100}%` }} />
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Guía rápida"
          title="Guía rápida"
          onClick={() => setGuide(true)}
        >
          <CircleHelp aria-hidden="true" />
        </button>
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
          <p className="lesson-text">{lesson.outro}</p>
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
      ) : step ? (
        <StepView key={index} step={step} label={label} onDone={() => setIndex(index + 1)} />
      ) : (
        <section className="lesson-step lesson-hook" aria-labelledby="step-title">
          <p className="lesson-kicker">Lección {number}</p>
          <h1 id="step-title">{lesson.title}</h1>
          <p className="lesson-text">{lesson.hook}</p>
          <div className="lesson-actions">
            <button type="button" className="btn btn-primary" onClick={() => setIndex(1)} autoFocus>
              Empezar
            </button>
          </div>
        </section>
      )}
      {guide && <GuideSheet onClose={() => setGuide(false)} />}
    </main>
  )
}

function Hint({ text }: { text?: string }) {
  return text ? <p className="lesson-hint">{text}</p> : null
}

interface StepProps {
  step: Step
  /** Overrides the button's usual label. */
  label?: string
  onDone: () => void
}

function StepView({ step, label, onDone }: StepProps) {
  switch (step.kind) {
    case 'say':
      return (
        <section className="lesson-step" aria-labelledby="step-title">
          {step.visual && <div className="lesson-visual">{step.visual}</div>}
          <h1 id="step-title">{step.title}</h1>
          <p className="lesson-text">{step.text}</p>
          {step.rows && (
            <dl className="lesson-rows">
              {step.rows.map(([name, meaning]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{meaning}</dd>
                </div>
              ))}
            </dl>
          )}
          <Hint text={step.hint} />
          <div className="lesson-actions">
            <button type="button" className="btn btn-primary" onClick={onDone} autoFocus>
              {label ?? 'Seguir'}
            </button>
          </div>
        </section>
      )
    case 'whichWins': {
      const diff = compareCards(step.a, step.b)
      const right = diff > 0 ? 'a' : diff < 0 ? 'b' : 'tie'
      return (
        <Quiz
          step={step}
          label={label}
          prompt="¿Cuál gana?"
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
          step={step}
          label={label}
          prompt="¿Cuántos tenés de envido?"
          visual={<HandRow cards={step.hand} />}
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
          step={step}
          label={label}
          prompt={step.prompt}
          answer={String(step.answer)}
          onDone={onDone}
          options={step.options.map((text, i) => ({ id: String(i), content: text, label: text }))}
        />
      )
    case 'play':
      return (
        <PlayStep
          title={step.title}
          play={step.play}
          hint={step.hint}
          label={label}
          onDone={onDone}
        />
      )
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
  step,
  label,
  prompt,
  visual,
  options,
  answer,
  onDone,
}: {
  step: Extract<Step, { explain: string }>
  label?: string
  prompt: string
  visual?: ReactNode
  options: Option[]
  answer: string
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
      {!picked && <Hint text={step.hint} />}
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
          <p>
            {step.explain}
            {right && step.praise && <b className="praise"> {step.praise}</b>}
          </p>
          <button type="button" className="btn btn-primary" onClick={onDone} autoFocus>
            {label ?? (right ? 'Bien, seguí' : 'Seguir')}
          </button>
        </div>
      )}
    </section>
  )
}

function PlayStep({
  title,
  play,
  hint,
  label,
  onDone,
}: {
  title: string
  play: Play
  hint?: string
  label?: string
  onDone: () => void
}) {
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
    if (current && cueAllows(current, action) && game.play(action)) setCue(cue + 1)
  }

  return (
    <section className="lesson-play" aria-label={title}>
      <div className="coach" role="status">
        <p>
          {reached ? '¡Listo!' : busy || !myTurn ? 'Mirá lo que pasa en la mesa…' : current?.say}
        </p>
        {hint && !reached && <small>{hint}</small>}
      </div>
      <Table
        view={shown.view}
        names={['Vos', 'El rival']}
        events={shown.events}
        onAction={act}
        allow={(a) => !!current && cueAllows(current, a)}
        hideScore
        slow
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
                  {label ?? (
                    <>
                      Seguí <ArrowRight aria-hidden="true" />
                    </>
                  )}
                </button>
              </section>
            </div>
          )
        }
      />
    </section>
  )
}
