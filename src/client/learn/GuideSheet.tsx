import { X } from 'lucide-react'
import { Modal } from '../Modal.tsx'
import { GuideContent, type GuideSection } from './Guide.tsx'

/** The quick guide over the game table, so a game does not have to stop. */
export function GuideSheet({ section, onClose }: { section?: GuideSection; onClose: () => void }) {
  return (
    <Modal titleId="sheet-title" onClose={onClose} className="guide-modal">
      <section className="panel sheet">
        <div className="sheet-head">
          <h2 id="sheet-title" tabIndex={-1}>
            Guía rápida
          </h2>
          <button type="button" className="icon-btn" aria-label="Cerrar la guía" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="sheet-body">
          <GuideContent section={section} />
        </div>
      </section>
    </Modal>
  )
}
