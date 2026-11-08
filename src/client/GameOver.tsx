import type { ReactNode } from 'react'

export function GameOver({
  won,
  detail,
  children,
}: {
  won: boolean
  detail?: string
  children: ReactNode
}) {
  return (
    <section aria-label="Fin de la partida">
      <h2>{won ? '¡Ganaste!' : 'Perdiste'}</h2>
      {detail && <p>{detail}</p>}
      {children}
    </section>
  )
}
