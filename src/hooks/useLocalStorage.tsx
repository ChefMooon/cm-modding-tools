import { useCallback, useEffect, useState } from 'react'

type SetValue<T> = (value: T | ((currentValue: T) => T)) => void

function readStoredValue<T>(key: string, initialValue: T): T {
  if (typeof window === 'undefined') {
    return initialValue
  }

  try {
    const item = window.localStorage.getItem(key)
    return item === null ? initialValue : (JSON.parse(item) as T)
  } catch {
    return initialValue
  }
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  const [storedValue, setStoredValue] = useState<T>(() => readStoredValue(key, initialValue))

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch {
      // Ignore write failures for storage-backed state.
    }
  }, [key, storedValue])

  const setValue = useCallback<SetValue<T>>((value) => {
    setStoredValue((currentValue) => {
      const nextValue = typeof value === 'function'
        ? (value as (currentValue: T) => T)(currentValue)
        : value

      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(key, JSON.stringify(nextValue))
        } catch {
          // Ignore write failures for storage-backed state.
        }
      }

      return nextValue
    })
  }, [key])

  return [storedValue, setValue]
}

export function removeLocalStorageItem(key: string) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignore removal failures for storage-backed state.
  }
}
