import { Check, CircleHelp, X } from 'lucide-react'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { bots } from '../../bots/index.ts'
import { seededRandom } from '../../bots/match.ts'
import { type Card, cardPower, envidoPoints, sameCard } from '../../engine/cards.ts'
import { type Action, actorOf, legalActions, viewFor } from '../../engine/game.ts'
import { BotGame, type Decide } from '../botGame.ts'
import { CardView } from '../Card.tsx'
import { Fosforos } from '../Fosforos.tsx'
import { playFeedback } from '../sound.ts'
import { Table } from '../Table.tsx'
import { cardName } from '../text.ts'
import { advise } from './coach.ts'
import { GuideSheet } from './GuideSheet.tsx'
import {
  type Lesson,
  ME,
  type Play,
  type Step,
  countsForEnvido,
  cueAllows,
  cueMoves,
  doneText,
  envidoCards,
  envidoSum,
  playStart,
  practiceAllows,
  sameAction,
} from './lesson.ts'

interface Props {
  lesson: Lesson
  /** How many required lessons are done, counting this one once it ends. */
  doneCount: number
  total: number
  next: Lesson | null
  onFinish: () => void
  onExit: () => void
  onNext: () => void
  onHelper: () => void
}

export function LessonScreen({
  lesson,
  doneCount,
  total,
  next,
  onFinish,
  onExit,
  onNext,
  onHelper,
}: Props) {
  const container = useRef<HTMLElement>(null)
  const [index, setIndex] = useState(0)
  const [guide, setGuide] = useState(false)
  const steps = lesson.steps.length
  const finished = index >= steps
  useEffect(() => {
    if (finished) onFinish()
  }, [finished, onFinish])
  useEffect(() => {
    window.scrollTo(0, 0)
    const heading =
      container.current?.querySelector<HTMLElement>('.lesson-step h2') ??
      container.current?.querySelector<HTMLElement>('.lesson-position h1')
    heading?.setAttribute('tabindex', '-1')
    heading?.focus({ preventScroll: true })
  }, [index])
  const step = lesson.steps[index]
  const label = lesson.steps[index + 1]?.kind === 'play' ? 'Probar' : 'Seguir'
  const helperFirst = lesson.helperAfter || !next

  return (
    // A hand on the table takes exactly one screen, like any game.
    <main ref={container} className={step?.kind === 'play' ? 'lesson screen' : 'lesson'}>
      <header className="lesson-bar">
        <button
          type="button"
          className="icon-btn"
          aria-label="Salir de la lección"
          onClick={onExit}
        >
          <X aria-hidden="true" />
        </button>
        <div className="lesson-position">
          <div className="lesson-position-title">
            <h1 data-page-title={lesson.title}>{lesson.title}</h1>
            <small>
              {Math.min(index + 1, steps)} de {steps}
            </small>
          </div>
          <div
            className="lesson-progress"
            role="progressbar"
            aria-label={`Avance de ${lesson.title}`}
            aria-valuemin={0}
            aria-valuemax={steps}
            aria-valuenow={Math.min(index, steps)}
          >
            <span style={{ transform: `scaleX(${Math.min(index, steps) / steps})` }} />
          </div>
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
      {step ? (
        <StepView key={index} step={step} label={label} onDone={() => setIndex(index + 1)} />
      ) : (
        <section className="lesson-step lesson-done" aria-labelledby="lesson-done">
          <span className="done-check" aria-hidden="true">
            <Check />
          </span>
          <h2 id="lesson-done">¡Lección terminada!</h2>
          <p className="lesson-text">{lesson.outro}</p>
          {!lesson.optional && (
            <div className="done-progress">
              <Fosforos points={doneCount} target={0} />
              <span>
                Lecciones completadas: {doneCount} de {total}
              </span>
            </div>
          )}
          <div className="lesson-actions">
            {helperFirst && (
              <button type="button" className="btn btn-primary" onClick={onHelper}>
                Jugar una partida con ayudante
              </button>
            )}
            {next && (
              <button
                type="button"
                className={helperFirst ? 'btn' : 'btn btn-primary'}
                onClick={onNext}
              >
                Continuar: {next.title}
              </button>
            )}
            <button type="button" className="btn btn-quiet" onClick={onExit}>
              Volver al menú
            </button>
          </div>
        </section>
      )}
      {guide && <GuideSheet section={lesson.guide} onClose={() => setGuide(false)} />}
    </main>
  )
}

function Hint({ text }: { text?: string }) {
  return text ? <p className="lesson-hint">{text}</p> : null
}

interface StepProps {
  step: Step
  /** The button's label: what comes next. */
  label: string
  onDone: () => void
}

function StepView({ step, label, onDone }: StepProps) {
  // A practice hand can be played again with a new deal.
  const [deal, setDeal] = useState(1)
  switch (step.kind) {
    case 'say':
      return (
        <section className="lesson-step" aria-labelledby="step-title">
          {step.visual && <div className="lesson-visual">{step.visual}</div>}
          <h2 id="step-title">{step.title}</h2>
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
          {step.more && (
            <details className="lesson-more">
              <summary>{step.more[0]}</summary>
              <p>{step.more[1]}</p>
            </details>
          )}
          <Hint text={step.hint} />
          <div className="lesson-actions">
            <button type="button" className="btn btn-primary" onClick={onDone}>
              {label}
            </button>
          </div>
        </section>
      )
    case 'whichWins': {
      const diff = cardPower(step.a) - cardPower(step.b)
      return (
        <Quiz
          step={step}
          label={label}
          prompt="¿Cuál gana?"
          answer={diff > 0 ? 'a' : diff < 0 ? 'b' : 'tie'}
          retry="Fijate en qué lugar de la escala está cada una."
          onDone={onDone}
          options={[
            { id: 'a', content: <CardView card={step.a} />, label: cardName(step.a), card: true },
            { id: 'b', content: <CardView card={step.b} />, label: cardName(step.b), card: true },
            { id: 'tie', content: 'Empatan', label: 'Empatan' },
          ]}
        />
      )
    }
    case 'strongest': {
      const best = [...step.cards].sort((a, b) => cardPower(b) - cardPower(a))[0]!
      return (
        <Quiz
          step={step}
          label={label}
          prompt="¿Cuál es la más fuerte?"
          answer={cardName(best)}
          retry="Fijate en qué grupo de la escala está cada una."
          onDone={onDone}
          options={step.cards.map((card) => ({
            id: cardName(card),
            content: <CardView card={card} />,
            label: cardName(card),
            card: true,
          }))}
        />
      )
    }
    case 'order':
      return <OrderStep step={step} label={label} onDone={onDone} />
    case 'count':
      return <CountStep step={step} label={label} onDone={onDone} />
    case 'choose':
      return (
        <Quiz
          step={step}
          label={label}
          prompt={step.prompt}
          visual={step.visual}
          answer={String(step.answer)}
          retry="Releé la pregunta."
          onDone={onDone}
          options={step.options.map((text, i) => ({ id: String(i), content: text, label: text }))}
        />
      )
    case 'play':
      return (
        <PlayStep
          key={deal}
          seed={deal}
          title={step.title}
          play={step.play}
          hint={step.hint}
          onDone={onDone}
          onAgain={() => setDeal(deal + 1)}
        />
      )
  }
}

/** The hand of a count question; once the counting cards are known they stand out. */
function HandRow({ cards, counting }: { cards: Card[]; counting?: Card[] }) {
  return (
    <div className="lesson-cards">
      {cards.map((card) => (
        <span
          key={cardName(card)}
          className={
            !counting ? undefined : counting.some((c) => sameCard(c, card)) ? 'counts' : 'faded'
          }
        >
          <CardView card={card} />
        </span>
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

type QuestionStep = Extract<Step, { explain: string }>

/** Right or wrong, also as a symbol, so color is never the only sign. */
function Mark({ right }: { right: boolean }) {
  return (
    <span className={right ? 'mark mark-right' : 'mark mark-wrong'} aria-hidden="true">
      {right ? <Check /> : <X />}
    </span>
  )
}

/**
 * A question with retries: a wrong option gets a hint and the learner tries
 * again, or asks to see the explanation.
 */
function Quiz({
  step,
  label,
  prompt,
  visual,
  options,
  answer,
  retry,
  onDone,
}: {
  step: QuestionStep
  label: string
  prompt: string
  visual?: ReactNode | ((finished: boolean) => ReactNode)
  options: Option[]
  answer: string
  /** What to say after a wrong option the step has no hint for. */
  retry: string
  onDone: () => void
}) {
  const [wrong, setWrong] = useState<string[]>([])
  const [result, setResult] = useState<'right' | 'shown' | null>(null)
  const last = wrong.at(-1)
  const choose = (id: string) => {
    if (result || wrong.includes(id)) return
    if (id === answer) setResult('right')
    else setWrong([...wrong, id])
    playFeedback(id === answer)
  }
  const state = (id: string) =>
    result && id === answer
      ? ' is-right'
      : wrong.includes(id)
        ? ' is-wrong'
        : result
          ? ' is-faded'
          : ''

  return (
    <section className="lesson-step" aria-labelledby="quiz-prompt">
      {visual && (
        <div className="lesson-visual">
          {typeof visual === 'function' ? visual(result !== null) : visual}
        </div>
      )}
      <h2 id="quiz-prompt">{prompt}</h2>
      {!result && wrong.length === 0 && <Hint text={step.hint} />}
      <div className={options.some((o) => o.card) ? 'quiz-options quiz-cards' : 'quiz-options'}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={(o.card ? 'quiz-card' : 'btn quiz-option') + state(o.id)}
            aria-label={o.label}
            disabled={wrong.includes(o.id) || (result !== null && o.id !== answer)}
            onClick={() => choose(o.id)}
          >
            {o.content}
            {result && o.id === answer && <Mark right />}
            {wrong.includes(o.id) && <Mark right={false} />}
          </button>
        ))}
      </div>
      {result ? (
        <div className={result === 'right' ? 'feedback is-right' : 'feedback'} role="status">
          <strong>
            {result === 'right' && <Check aria-hidden="true" />}
            {result === 'right' ? '¡Bien!' : 'La respuesta'}
          </strong>
          <p>
            {step.explain}
            {result === 'right' && step.praise && <b className="praise"> {step.praise}</b>}
          </p>
          <button type="button" className="btn btn-primary" onClick={onDone} autoFocus>
            {label}
          </button>
        </div>
      ) : (
        last !== undefined && (
          <div className="feedback is-wrong" role="status" key={last}>
            <strong>
              <X aria-hidden="true" /> No es esa
            </strong>
            <p>{step.wrong?.[last] ?? `${retry} Probá otra vez.`}</p>
            <button type="button" className="btn" onClick={() => setResult('shown')}>
              Ver explicación
            </button>
          </div>
        )
      )}
    </section>
  )
}

/** Tap the cards from the strongest to the weakest. */
function OrderStep({
  step,
  label,
  onDone,
}: {
  step: Extract<Step, { kind: 'order' }>
  label: string
  onDone: () => void
}) {
  const [placed, setPlaced] = useState<Card[]>([])
  const [miss, setMiss] = useState<Card | null>(null)
  const [shown, setShown] = useState(false)
  const left = step.cards.filter((c) => !placed.some((p) => sameCard(p, c)))
  const finished = left.length === 0
  const tap = (card: Card) => {
    const top = Math.max(...left.map(cardPower))
    if (cardPower(card) === top) {
      setPlaced([...placed, card])
      setMiss(null)
      if (left.length === 1) playFeedback(true)
    } else {
      setMiss(card)
      playFeedback(false)
    }
  }
  const reveal = () => {
    setShown(true)
    setPlaced([...step.cards].sort((a, b) => cardPower(b) - cardPower(a)))
  }

  return (
    <section className="lesson-step" aria-labelledby="order-prompt">
      <h2 id="order-prompt">Ordenalas de la más fuerte a la más débil</h2>
      {placed.length === 0 && !miss && <Hint text={step.hint ?? 'Tocá primero la más fuerte.'} />}
      <ol className="order-slots" aria-label="Tu orden">
        {step.cards.map((_, i) => (
          <li key={i} className={placed[i] ? 'order-slot is-filled' : 'order-slot'}>
            <span className="order-place">{i + 1}.º</span>
            {placed[i] ? (
              <CardView card={placed[i]} />
            ) : (
              <span className="order-empty" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>
      {!finished && (
        <div className="quiz-options quiz-cards order-left">
          {left.map((card) => (
            <button
              key={cardName(card)}
              type="button"
              className={miss && sameCard(miss, card) ? 'quiz-card is-wrong' : 'quiz-card'}
              aria-label={cardName(card)}
              onClick={() => tap(card)}
            >
              <CardView card={card} />
            </button>
          ))}
        </div>
      )}
      {finished ? (
        <div className={shown ? 'feedback' : 'feedback is-right'} role="status">
          <strong>
            {!shown && <Check aria-hidden="true" />}
            {shown ? 'El orden' : '¡Bien!'}
          </strong>
          <p>{step.explain}</p>
          <button type="button" className="btn btn-primary" onClick={onDone} autoFocus>
            {label}
          </button>
        </div>
      ) : (
        miss && (
          <div className="feedback is-wrong" role="status" key={cardName(miss)}>
            <strong>
              <X aria-hidden="true" /> No es esa
            </strong>
            <p>
              {step.wrong?.[cardName(miss)] ??
                `Todavía queda una más fuerte que el ${cardName(miss)}. Probá otra vez.`}
            </p>
            <button type="button" className="btn" onClick={reveal}>
              Ver explicación
            </button>
          </div>
        )
      )}
    </section>
  )
}

/** Count the envido: optionally tap the cards that count first, then pick the total. */
function CountStep({
  step,
  label,
  onDone,
}: {
  step: Extract<Step, { kind: 'count' }>
  label: string
  onDone: () => void
}) {
  const [picking, setPicking] = useState(!!step.pick)
  const [picked, setPicked] = useState<Card[]>([])
  const [missed, setMissed] = useState(0)
  const counting = envidoCards(step.hand)
  const toggle = (card: Card) =>
    setPicked(
      picked.some((p) => sameCard(p, card))
        ? picked.filter((p) => !sameCard(p, card))
        : [...picked, card],
    )
  const check = () => {
    const right = countsForEnvido(step.hand, picked)
    playFeedback(right)
    if (right) setPicking(false)
    else setMissed(missed + 1)
  }

  if (!picking) {
    const shown = step.pick ? (countsForEnvido(step.hand, picked) ? picked : counting) : counting
    return (
      <Quiz
        step={{
          ...step,
          explain: `${envidoSum(shown)} = ${envidoPoints(step.hand)}. ${step.explain}`,
        }}
        label={label}
        prompt="¿Cuántos tenés de envido?"
        visual={(finished) => (
          <HandRow cards={step.hand} counting={step.pick || finished ? shown : undefined} />
        )}
        answer={String(envidoPoints(step.hand))}
        retry="Fijate si hay dos del mismo palo y acordate que las negras valen 0."
        onDone={onDone}
        options={step.options.map((n) => ({ id: String(n), content: String(n), label: String(n) }))}
      />
    )
  }

  return (
    <section className="lesson-step" aria-labelledby="pick-prompt">
      <h2 id="pick-prompt">¿Qué cartas cuentan para el envido?</h2>
      <p className="lesson-hint">Tocá las que cuentan y después Listo.</p>
      <div className="lesson-cards pick-cards">
        {step.hand.map((card) => {
          const on = picked.some((p) => sameCard(p, card))
          return (
            <button
              key={cardName(card)}
              type="button"
              className={on ? 'quiz-card is-picked' : 'quiz-card'}
              aria-pressed={on}
              aria-label={cardName(card)}
              onClick={() => toggle(card)}
            >
              <CardView card={card} />
            </button>
          )
        })}
      </div>
      {missed > 0 && (
        <div className="feedback is-wrong" role="status" key={missed}>
          <strong>
            <X aria-hidden="true" /> Esas no son
          </strong>
          <p>
            Si hay dos del mismo palo, cuentan esas dos. Si no, solo la más alta. Las negras valen
            0. Probá otra vez.
          </p>
          <button type="button" className="btn" onClick={() => setPicking(false)}>
            Ver explicación
          </button>
        </div>
      )}
      <div className="lesson-actions">
        <button type="button" className="btn btn-primary" onClick={check}>
          Listo
        </button>
      </div>
    </section>
  )
}

function PlayStep({
  title,
  play,
  seed,
  hint,
  onDone,
  onAgain,
}: {
  title: string
  play: Play
  seed: number
  hint?: string
  onDone: () => void
  onAgain: () => void
}) {
  const [game] = useState(() => {
    let used = 0
    // The rival follows the script while it can; past it an easy bot plays.
    const decide: Decide = async (_, view, legal, botSeed) => {
      const allowed = play.practice ? legal.filter((a) => practiceAllows(play.practice!, a)) : legal
      const scripted = play.rival[used++]
      if (scripted && allowed.some((a) => sameAction(a, scripted))) return scripted
      const move = bots.easy(view, allowed, seededRandom(botSeed))
      return allowed.some((a) => sameAction(a, move)) ? move : allowed[0]!
    }
    const schedule = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms)
      return () => clearTimeout(id)
    }
    // A practice hand gets a new deal each time.
    const deal = play.hands ? 1 : crypto.getRandomValues(new Uint32Array(1))[0]! ^ seed
    return new BotGame(
      'easy',
      { flor: false, target: 15 },
      deal,
      decide,
      schedule,
      seededRandom(7 + seed),
      playStart(play, deal),
    )
  })
  useEffect(() => () => game.dispose(), [game])
  const { state, events } = useSyncExternalStore(game.subscribe, game.getSnapshot)
  const [cue, setCue] = useState(0)
  const [busy, setBusy] = useState(true)
  // What the coach says about the last move, and per decision whether the hint is out.
  const [note, setNote] = useState<string | null>(null)
  const [retry, setRetry] = useState<string | null>(null)
  const [hinted, setHinted] = useState(false)
  // Whether every free choice so far was the best one.
  const [best, setBest] = useState(true)
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

  const current = play.practice ? undefined : play.cues[cue]
  const myTurn = !reached && !busy && actorOf(state) === ME
  const practice = play.practice
  const advice =
    practice && myTurn
      ? advise(
          viewFor(state, ME),
          legalActions(state, ME).filter((a) => practiceAllows(practice, a)),
        )
      : null

  const moved = (action: Action) => {
    if (!game.play(action)) return false
    setHinted(false)
    setRetry(null)
    return true
  }
  const act = (action: Action) => {
    if (practice) {
      if (moved(action)) setNote(null)
      return
    }
    if (!current) return
    const reply = current.free?.replies.find((r) => sameAction(r.action, action))
    if (reply?.retry) {
      setRetry(reply.say)
      playFeedback(false)
      return
    }
    if (!reply && !cueAllows(current, action)) return
    if (moved(action)) {
      setCue(cue + 1)
      setNote(reply?.say ?? null)
      if (current.free && !sameAction(action, current.expect)) setBest(false)
    }
  }

  const allow = (a: Action) =>
    practice
      ? practiceAllows(practice, a)
      : !!current &&
        (current.free ? cueMoves(current).some((m) => sameAction(m, a)) : cueAllows(current, a))
  // Free choices and practice hands highlight nothing until the learner asks.
  const highlight = practice
    ? (a: Action) => hinted && !!advice && sameAction(a, advice.action)
    : current?.free
      ? (a: Action) => hinted && cueAllows(current, a)
      : undefined

  const pista = (
    <button type="button" className="tip-btn" onClick={() => setHinted(true)}>
      Pista
    </button>
  )
  const line: ReactNode = !myTurn ? (
    (note ?? 'Mirá lo que pasa en la mesa…')
  ) : practice ? (
    hinted && advice ? (
      <>
        <b>{advice.say}</b> <span className="tip-why">{advice.why}</span>
      </>
    ) : (
      <>Elegí vos. {pista}</>
    )
  ) : current?.free ? (
    <>
      {retry ?? current.say} {hinted ? <span className="tip-why">{current.free.hint}</span> : pista}
    </>
  ) : (
    current?.say
  )
  const good = practice ? shown.view.scores[ME]! > 0 : best

  return (
    <section className="lesson-play" aria-label={title}>
      <Table
        view={shown.view}
        names={['Vos', 'El rival']}
        events={shown.events}
        onAction={act}
        allow={allow}
        highlight={highlight}
        hideScore
        slow
        tip={
          reached ? null : (
            <>
              <span>{line}</span>
              {hint && <small className="tip-hint">{hint}</small>}
            </>
          )
        }
        onBusyChange={onBusyChange}
        over={
          reached && (
            <div className="overlay overlay-result">
              <section
                className={
                  good ? 'panel feedback is-right result-panel' : 'panel feedback result-panel'
                }
                role="dialog"
                aria-labelledby="play-done"
              >
                <strong id="play-done">
                  {practice ? 'Mano terminada' : best ? '¡Bien!' : 'Listo'}
                </strong>
                {note && <p>{note}</p>}
                <p>{doneText(play, state)}</p>
                <div className="result-actions">
                  {practice && (
                    <button type="button" className="btn" onClick={onAgain}>
                      Jugar otra mano
                    </button>
                  )}
                  <button type="button" className="btn btn-primary" onClick={onDone} autoFocus>
                    Seguir
                  </button>
                </div>
              </section>
            </div>
          )
        }
      />
    </section>
  )
}
