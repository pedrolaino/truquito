import { type ReactNode, useEffect, useRef } from 'react'

/** Native modal isolation keeps the table out of keyboard reach. */
export function Modal({
  titleId,
  onClose,
  children,
  className = '',
}: {
  titleId: string
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    dialog.querySelector<HTMLElement>('[tabindex="-1"]')?.focus()
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      className={`modal-frame ${className}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      {children}
    </dialog>
  )
}
