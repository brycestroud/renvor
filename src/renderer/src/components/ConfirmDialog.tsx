import { Modal } from './Modal'

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onCancel,
  pending = false
}: {
  title: string
  description: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
  pending?: boolean
}): JSX.Element {
  return (
    <Modal title={title} onClose={onCancel} width="sm">
      <p className="text-sm text-text-secondary">{description}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-control border border-border bg-surface-2 px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={pending}
          className={`rounded-control px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
            danger
              ? 'bg-danger text-white hover:brightness-110'
              : 'bg-brand text-[#171200] hover:bg-brand-hover'
          }`}
        >
          {pending ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
