export function FormField({
  label,
  children,
  error
}: {
  label: string
  children: React.ReactNode
  error?: string
}): JSX.Element {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-text-secondary">{label}</span>
      {children}
      {error && <span className="text-xs text-danger">{error}</span>}
    </label>
  )
}

export const inputClass =
  'rounded-control border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none focus:border-info disabled:opacity-50'

export const selectClass = inputClass
