import type { CSSProperties, ReactElement } from 'react'
import type { Card as CardData, Suit } from '../engine/cards.ts'
import { cardName } from './text.ts'

// Our own suit drawings on a 100x100 grid, outlined in ink.
const SUITS: Record<Suit, ReactElement> = {
  oro: (
    <>
      <circle cx="50" cy="50" r="34" fill="var(--oro)" stroke="var(--ink)" strokeWidth="4" />
      <circle cx="50" cy="50" r="22" fill="none" stroke="var(--ink)" strokeWidth="3" />
      <circle cx="50" cy="50" r="7" fill="var(--ink)" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line
          key={a}
          x1="50"
          y1="21"
          x2="50"
          y2="26"
          stroke="var(--ink)"
          strokeWidth="3"
          transform={`rotate(${a} 50 50)`}
        />
      ))}
    </>
  ),
  copa: (
    <g fill="var(--copa)" stroke="var(--ink)" strokeWidth="4" strokeLinejoin="round">
      <path d="M24 18 H76 C76 46 64 58 50 58 C36 58 24 46 24 18 Z" />
      <path d="M44 58 H56 L54 74 H46 Z" />
      <path d="M30 86 C30 77 70 77 70 86 Z" />
      <path d="M32 28 H68" strokeWidth="3" />
    </g>
  ),
  espada: (
    <>
      <path
        d="M50 8 L58 22 L56 64 H44 L42 22 Z"
        fill="var(--espada)"
        stroke="var(--ink)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <line x1="50" y1="20" x2="50" y2="60" stroke="var(--ink)" strokeWidth="2.5" />
      <rect
        x="28"
        y="64"
        width="44"
        height="8"
        rx="4"
        fill="var(--oro)"
        stroke="var(--ink)"
        strokeWidth="4"
      />
      <rect x="45" y="72" width="10" height="14" fill="var(--ink)" />
      <circle cx="50" cy="90" r="6" fill="var(--oro)" stroke="var(--ink)" strokeWidth="3.5" />
    </>
  ),
  basto: (
    <g fill="var(--basto)" stroke="var(--ink)" strokeLinejoin="round">
      <path
        strokeWidth="4"
        d="M43 92 L40 60 C38 44 30 34 31 22 C32 11 41 6 50 6 C60 6 69 12 69 23 C69 35 61 45 59 60 L57 92 Z"
      />
      <path strokeWidth="3.5" d="M37 42 L27 36 C23 34 22 40 26 42 L36 47" />
      <path strokeWidth="3.5" d="M60 62 L71 58 C75 57 76 63 72 64 L60 68" />
      <path
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        d="M44 22 c3 2 7 2 9 0 M47 78 c2 1 5 1 6 0"
      />
    </g>
  ),
}

export function SuitIcon({ suit }: { suit: Suit }) {
  return (
    <svg className="suit" viewBox="0 0 100 100" aria-hidden="true">
      {SUITS[suit]}
    </svg>
  )
}

function Face({ card }: { card: CardData }) {
  return (
    <>
      <span className="rank rank-top" aria-hidden="true">
        {card.rank}
      </span>
      <SuitIcon suit={card.suit} />
      <span className="rank rank-bottom" aria-hidden="true">
        {card.rank}
      </span>
    </>
  )
}

/** A face-up card that is not interactive. */
export function CardView({ card, style }: { card: CardData; style?: CSSProperties }) {
  return (
    <div className="card" role="img" aria-label={cardName(card)} style={style}>
      <Face card={card} />
    </div>
  )
}

export function CardButton({
  card,
  disabled,
  onPlay,
  style,
  suggested,
}: {
  card: CardData
  disabled: boolean
  onPlay: () => void
  style?: CSSProperties
  /** Lessons: the card the learner is asked to play. */
  suggested?: boolean
}) {
  return (
    <button
      type="button"
      className={suggested ? 'card suggested' : 'card'}
      aria-label={cardName(card)}
      disabled={disabled}
      onClick={onPlay}
      style={style}
    >
      <Face card={card} />
    </button>
  )
}

export function CardBack({ style }: { style?: CSSProperties }) {
  return <div className="card card-back" aria-hidden="true" style={style} />
}
