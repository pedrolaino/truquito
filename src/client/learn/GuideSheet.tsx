import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { GuideContent } from './Guide.tsx'

/** The quick guide over the game table, so a game does not have to stop. */
export function GuideSheet({ onClose }: { onClose: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="overlay sheet-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="panel sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
      >
        <div className="sheet-head">
          <h2 id="sheet-title" ref={heading} tabIndex={-1}>
            Guía rápida
          </h2>
          <button type="button" className="icon-btn" aria-label="Cerrar la guía" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>
        <GuideContent />
      </section>
    </div>
  )
}
