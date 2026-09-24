import { useEffect, useRef, useState } from 'react'

/**
 * Local text state that saves on blur AND on a 10s interval while dirty -
 * matches the build spec's "drafts auto-save every 10 seconds" requirement
 * without waiting for the user to tab away from a field.
 */
export function useAutosaveText(
  serverValue: string,
  onSave: (value: string) => void
): {
  value: string
  onChange: (v: string) => void
  onBlur: () => void
} {
  const [value, setValue] = useState(serverValue)
  const dirtyRef = useRef(false)
  const valueRef = useRef(serverValue)
  const savedRef = useRef(serverValue)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  useEffect(() => {
    if (!dirtyRef.current) {
      setValue(serverValue)
      valueRef.current = serverValue
      savedRef.current = serverValue
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverValue])

  useEffect(() => {
    const interval = setInterval(() => {
      if (dirtyRef.current && valueRef.current !== savedRef.current) {
        onSaveRef.current(valueRef.current)
        savedRef.current = valueRef.current
        dirtyRef.current = false
      }
    }, 10_000)
    return () => clearInterval(interval)
  }, [])

  return {
    value,
    onChange: (v: string) => {
      setValue(v)
      valueRef.current = v
      dirtyRef.current = true
    },
    onBlur: () => {
      if (valueRef.current !== savedRef.current) {
        onSaveRef.current(valueRef.current)
        savedRef.current = valueRef.current
        dirtyRef.current = false
      }
    }
  }
}
