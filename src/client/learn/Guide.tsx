import { useState } from 'react'
import {
  type Card,
  cardPower,
  compareCards,
  createDeck,
  envidoPoints,
  sameCard,
} from '../../engine/cards.ts'
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

export function verdict(a: Card, b: Card): string {
  const diff = compareCards(a, b)
  if (diff === 0) return `${cardName(a)} y ${cardName(b)} empatan: es parda`
  const [winner, loser] = diff > 0 ? [a, b] : [b, a]
  return `${cardName(winner)} le gana a ${cardName(loser)}`
}

function Ranking() {
  const [picked, setPicked] = useState<Card[]>([])
  const pick = (card: Card) =>
    setPicked((current) => {
      if (current.some((c) => sameCard(c, card))) return current.filter((c) => !sameCard(c, card))
      return [...current, card].slice(-2)
    })
  const isPicked = (card: Card) => picked.some((c) => sameCard(c, card))

  return (
    <section className="guide-section" aria-labelledby="guide-ranking">
      <h2 id="guide-ranking">Qué carta gana</h2>
      <p className="guide-note">
        De la que más mata a la que menos. Las de una misma fila empatan. Tocá dos cartas para
        compararlas.
      </p>
      <ol className="ranking">
        {LEVELS.map((cards, i) => (
          <li key={i} className="ranking-level">
            <span className="ranking-place" aria-hidden="true">
              {i + 1}
            </span>
            <span className="ranking-name">{levelName(cards)}</span>
            <span className="ranking-cards">
              {cards.map((card) => (
                <button
                  key={cardName(card)}
                  type="button"
                  className={isPicked(card) ? 'ranking-card picked' : 'ranking-card'}
                  aria-pressed={isPicked(card)}
                  aria-label={cardName(card)}
                  onClick={() => pick(card)}
                >
                  <CardView card={card} />
                </button>
              ))}
            </span>
          </li>
        ))}
      </ol>
      <p className="compare-bar" role="status">
        {picked.length === 2
          ? verdict(picked[0]!, picked[1]!)
          : picked.length === 1
            ? `${cardName(picked[0]!)}: tocá otra para comparar`
            : 'Tocá dos cartas para ver cuál gana'}
      </p>
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

function Calls() {
  return (
    <section className="guide-section" aria-labelledby="guide-calls">
      <h2 id="guide-calls">Cuánto vale cada canto</h2>
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
]

function Envido() {
  return (
    <section className="guide-section" aria-labelledby="guide-envido">
      <h2 id="guide-envido">Cómo se cuenta el envido</h2>
      <p className="guide-note">
        Con dos cartas del mismo palo: 20 más las dos. Las negras (10, 11 y 12) valen 0.
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
    </section>
  )
}

/** Quick reference: card ranking, call values and envido counting. */
export function GuideContent() {
  return (
    <div className="guide">
      <Ranking />
      <Calls />
      <Envido />
    </div>
  )
}
