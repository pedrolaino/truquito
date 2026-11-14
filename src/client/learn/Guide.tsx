import { useEffect, useRef, useState } from 'react'
import { type Card, cardPower, createDeck, envidoPoints } from '../../engine/cards.ts'
import { Link } from '../Link.tsx'
import { CardView } from '../Card.tsx'
import { cardName } from '../text.ts'

/** Cards grouped by strength, strongest first. Cards in a group tie. */
export const LEVELS: Card[][] = (() => {
  const byPower = new Map<number, Card[]>()
  for (const card of createDeck())
    byPower.set(cardPower(card), [...(byPower.get(cardPower(card)) ?? []), card])
  return [...byPower.entries()].sort((a, b) => b[0] - a[0]).map(([, cards]) => cards)
})()

// What people call the top cards at the table.
const NICKNAMES: Record<string, string> = {
  '1 de espada': 'El ancho de espada',
  '1 de basto': 'El ancho de basto',
  '7 de espada': 'El siete de espada',
  '7 de oro': 'El siete de oro',
}

function levelName(cards: Card[]): string {
  if (cards.length === 1) return NICKNAMES[cardName(cards[0]!)] ?? cardName(cards[0]!)
  if (cards.length === 2) return cards[0]!.rank === 1 ? 'Los anchos falsos' : 'Los sietes falsos'
  return `Los ${cards[0]!.rank}`
}

function Ranking({ practice = false }: { practice?: boolean }) {
  const [large, setLarge] = useState(false)
  return (
    <section className="guide-section" aria-labelledby="guide-cartas">
      <h2 id="guide-cartas">Qué carta gana</h2>
      <p className="guide-note">
        De la que más mata a la que menos. Las de una misma fila empatan.
      </p>
      <button
        type="button"
        className="btn btn-quiet ranking-size"
        aria-pressed={large}
        onClick={() => setLarge(!large)}
      >
        {large ? 'Reducir cartas' : 'Ampliar cartas'}
      </button>
      <ol className={large ? 'ranking ranking-large' : 'ranking'}>
        {LEVELS.map((cards, i) => (
          <li key={i} className="ranking-level">
            <span className="ranking-place" aria-hidden="true">
              {i + 1}
            </span>
            <span className="ranking-name">{levelName(cards)}</span>
            <span className="ranking-cards">
              {cards.map((card) => (
                <CardView key={cardName(card)} card={card} />
              ))}
            </span>
          </li>
        ))}
      </ol>
      {practice && (
        <Link className="btn btn-quiet" href="/aprender/cartas">
          Probar: qué carta gana
        </Link>
      )}
    </section>
  )
}

const CALLS: [string, string, string][] = [
  ['Truco', '2 puntos', '1 al que cantó'],
  ['Retruco', '3 puntos', '2 al que cantó'],
  ['Vale cuatro', '4 puntos', '3 al que cantó'],
  ['Envido', '2 puntos', '1 al que cantó'],
  ['Real envido', '3 puntos', '1 al que cantó, o lo que había antes'],
  ['Falta envido', 'Lo que le falta al que va ganando', 'Lo que había antes, o 1'],
]

function Calls({ practice = false }: { practice?: boolean }) {
  return (
    <section className="guide-section" aria-labelledby="guide-cantos">
      <h2 id="guide-cantos">Cuánto vale cada canto</h2>
      <table className="calls-table">
        <thead>
          <tr>
            <th scope="col">Canto</th>
            <th scope="col">Si lo quieren</th>
            <th scope="col">Si no lo quieren</th>
          </tr>
        </thead>
        <tbody>
          {CALLS.map(([call, yes, no]) => (
            <tr key={call}>
              <th scope="row">{call}</th>
              <td>{yes}</td>
              <td>{no}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="guide-note">
        Una mano sin truco vale 1 punto. Los envidos se suman entre sí: envido y real envido
        queridos son 5.
      </p>
      <p className="guide-note">
        La falta envido no se suma a lo cantado antes: vale lo que le falta al que va ganando. A 15,
        con 12 a 8, vale 3.
      </p>
      {practice && (
        <Link className="btn btn-quiet" href="/aprender/truco">
          Probar: cantar truco
        </Link>
      )}
    </section>
  )
}

const c = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })
const ENVIDO_EXAMPLES: { hand: Card[]; why: string }[] = [
  { hand: [c(7, 'oro'), c(5, 'oro'), c(3, 'copa')], why: 'Dos de oro: 20 + 7 + 5' },
  { hand: [c(12, 'espada'), c(6, 'espada'), c(1, 'basto')], why: 'El 12 vale 0: 20 + 0 + 6' },
  {
    hand: [c(4, 'basto'), c(7, 'copa'), c(11, 'oro')],
    why: 'Ninguna del mismo palo: vale la más alta',
  },
  {
    hand: [c(7, 'copa'), c(5, 'copa'), c(2, 'copa')],
    why: 'Tres del mismo palo, sin flor: las dos mejores',
  },
  { hand: [c(12, 'oro'), c(11, 'oro'), c(4, 'basto')], why: 'Dos negras del mismo palo: 20' },
  { hand: [c(10, 'espada'), c(11, 'copa'), c(12, 'basto')], why: 'Tres negras: 0' },
]

function Envido({ practice = false }: { practice?: boolean }) {
  return (
    <section className="guide-section" aria-labelledby="guide-envido">
      <h2 id="guide-envido">Cómo se cuenta el envido</h2>
      <p className="guide-note">
        Con dos cartas del mismo palo: 20 más las dos. Las negras (10, 11 y 12) valen 0. Si los dos
        tienen lo mismo, gana el mano.
      </p>
      <ul className="envido-examples">
        {ENVIDO_EXAMPLES.map(({ hand, why }) => (
          <li key={why} className="envido-example">
            <span className="envido-hand">
              {hand.map((card) => (
                <CardView key={cardName(card)} card={card} />
              ))}
            </span>
            <span className="envido-sum">
              <strong>{envidoPoints(hand)}</strong> {why}
            </span>
          </li>
        ))}
      </ul>
      {practice && (
        <Link className="btn btn-quiet" href="/aprender/contar-envido">
          Probar: contar el envido
        </Link>
      )}
    </section>
  )
}

const SIGNALS: { name: string; gesture: string; cards: Card[] }[] = [
  { name: '1 de espada', gesture: 'Levantá las cejas.', cards: [c(1, 'espada')] },
  { name: '1 de basto', gesture: 'Guiñá un ojo.', cards: [c(1, 'basto')] },
  { name: '7 de espada', gesture: 'Mové los labios hacia tu derecha.', cards: [c(7, 'espada')] },
  { name: '7 de oro', gesture: 'Mové los labios hacia tu izquierda.', cards: [c(7, 'oro')] },
  {
    name: 'Cualquier 3',
    gesture: 'Mordete el labio inferior.',
    cards: [c(3, 'copa'), c(3, 'oro'), c(3, 'espada'), c(3, 'basto')],
  },
  {
    name: 'Cualquier 2',
    gesture: 'Fruncí los labios hacia adelante, como para dar un beso.',
    cards: [c(2, 'copa'), c(2, 'oro'), c(2, 'espada'), c(2, 'basto')],
  },
  {
    name: '1 de oro o 1 de copa',
    gesture: 'Abrí un poco la boca.',
    cards: [c(1, 'oro'), c(1, 'copa')],
  },
  { name: 'Malas cartas', gesture: 'Cerrá los ojos.', cards: [] },
  { name: 'Buen envido', gesture: 'Incliná la cabeza hacia adelante o hacia un lado.', cards: [] },
]

function Signals() {
  return (
    <section className="guide-section signals-section" aria-labelledby="guide-senas">
      <h2 id="guide-senas">Las señas</h2>
      <p className="guide-note">
        En partidas de 4 o 6, las señas les cuentan a tus compañeros qué cartas tenés. No hacen
        falta en el uno contra uno de Truquito: esta referencia también te sirve para jugar con
        cartas de verdad.
      </p>
      <p className="guide-note">
        Estas son señas habituales. Pueden variar según la mesa: acuerden cuáles van a usar. La
        derecha y la izquierda son las de quien hace la seña. Ojo: los rivales también pueden verla.
      </p>
      <dl className="signals-list">
        {SIGNALS.map(({ name, gesture, cards }) => (
          <div key={name} className="signal-row">
            <dt>{name}</dt>
            <dd>
              {cards.length > 0 && (
                <span className="signal-cards" aria-hidden="true">
                  {cards.map((card) => (
                    <CardView key={cardName(card)} card={card} />
                  ))}
                </span>
              )}
              <span>{gesture}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="guide-note">
        Fuente:{' '}
        <a
          href="https://www.casi.com.ar/sites/default/files/Reglamento%20Truco.pdf"
          target="_blank"
          rel="noreferrer"
        >
          Reglamento de truco del CASI (PDF, sección 16)
        </a>
        .
      </p>
    </section>
  )
}

export type GuideSection = 'cartas' | 'envido' | 'cantos' | 'senas'

const SECTIONS: [GuideSection, string][] = [
  ['cartas', 'Cartas'],
  ['envido', 'Envido'],
  ['cantos', 'Cantos'],
  ['senas', 'Señas'],
]

/** Quick reference: card ranking, envido, calls and partner signals. Opens at `section`. */
export function GuideContent({
  section,
  page = false,
}: {
  section?: GuideSection
  page?: boolean
}) {
  const [active, setActive] = useState<GuideSection>(() => {
    const hash = page ? location.hash.replace('#guide-', '') : ''
    return section ?? SECTIONS.find(([id]) => id === hash)?.[0] ?? 'cartas'
  })
  const root = useRef<HTMLDivElement>(null)
  const go = (id: GuideSection, smooth = true) => {
    root.current?.querySelector(`#guide-${id}`)?.scrollIntoView({
      block: 'start',
      behavior:
        smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto',
    })
  }
  useEffect(() => {
    const id = section ?? (page ? location.hash.replace('#guide-', '') : '')
    if (!SECTIONS.some(([key]) => key === id)) return
    let cancelled = false
    // Font loading changes section heights, especially on narrow screens.
    void document.fonts.ready.then(() => {
      if (!cancelled) go(id as GuideSection, false)
    })
    return () => {
      cancelled = true
    }
  }, [section, page])

  return (
    <div className="guide" ref={root}>
      <nav className="guide-nav" aria-label="Secciones de la guía">
        {SECTIONS.map(([id, label]) => (
          <a
            key={id}
            href={`#guide-${id}`}
            className="btn btn-quiet"
            aria-current={active === id ? 'location' : undefined}
            onClick={(event) => {
              event.preventDefault()
              if (page) history.replaceState(null, '', `#guide-${id}`)
              setActive(id)
              go(id)
            }}
          >
            {label}
          </a>
        ))}
      </nav>
      <Ranking practice={page} />
      <Envido practice={page} />
      <Calls practice={page} />
      <Signals />
    </div>
  )
}
