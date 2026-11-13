import { Modal } from './Modal.tsx'

export function ConfirmDialog({
  title,
  detail,
  confirm,
  onConfirm,
  onCancel,
}: {
  title: string
  detail: string
  confirm: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal titleId="confirm-title" onClose={onCancel}>
      <section className="panel">
        <h2 id="confirm-title" tabIndex={-1}>
          {title}
        </h2>
        <p>{detail}</p>
        <div className="row">
          <button type="button" className="btn" onClick={onCancel}>
            Seguir jugando
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            {confirm}
          </button>
        </div>
      </section>
    </Modal>
  )
}
