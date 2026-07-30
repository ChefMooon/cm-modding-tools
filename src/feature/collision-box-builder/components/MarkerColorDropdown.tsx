import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Check, ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { MarkerColor } from '../types/types'
import { MARKER_COLORS } from '../types/types'

interface MarkerColorDropdownProps {
  value: MarkerColor
  onChange: (value: MarkerColor) => void
}

const COLOR_SWATCHES: Record<MarkerColor, string> = {
  'Light Blue': '#60a5fa',
  Yellow: '#facc15',
  Orange: '#fb923c',
  Red: '#ef4444',
  Purple: '#a855f7',
  Blue: '#3b82f6',
  Green: '#22c55e',
  Lime: '#84cc16',
  Pink: '#ec4899',
  Silver: '#cbd5e1',
}

export function MarkerColorDropdown({ value, onChange }: MarkerColorDropdownProps) {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(MARKER_COLORS.indexOf(value))
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const listboxId = useId()

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setFocusedIndex(MARKER_COLORS.indexOf(value))
    }
  }, [value])

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleOpenChange(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open, handleOpenChange])

  const selectColor = (nextValue: MarkerColor) => {
    onChange(nextValue)
    handleOpenChange(false)
    triggerRef.current?.focus()
  }

  const moveFocus = (nextIndex: number) => {
    const safeIndex = (nextIndex + MARKER_COLORS.length) % MARKER_COLORS.length
    setFocusedIndex(safeIndex)
    optionRefs.current[safeIndex]?.focus()
  }

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleOpenChange(true)
      setFocusedIndex(MARKER_COLORS.indexOf(value))
      window.requestAnimationFrame(() => {
        optionRefs.current[MARKER_COLORS.indexOf(value)]?.focus()
      })
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      handleOpenChange(false)
    }
  }

  const handleOptionKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        moveFocus(index + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        moveFocus(index - 1)
        break
      case 'Home':
        event.preventDefault()
        moveFocus(0)
        break
      case 'End':
        event.preventDefault()
        moveFocus(MARKER_COLORS.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        selectColor(MARKER_COLORS[index])
        break
      case 'Escape':
        event.preventDefault()
        handleOpenChange(false)
        triggerRef.current?.focus()
        break
      default:
        break
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => handleOpenChange(!open)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-left text-xs text-foreground shadow-xs transition hover:bg-accent focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full border border-foreground/10"
            style={{ backgroundColor: COLOR_SWATCHES[value] }}
          />
          <span className="truncate">{value}</span>
        </span>
        <ChevronDown className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform duration-150', open && 'rotate-180')} />
      </button>

      <div
        id={listboxId}
        role="listbox"
        aria-label="Marker color"
        aria-hidden={!open}
        className={cn(
          'absolute z-50 mt-1 w-full min-w-[220px] rounded-lg border border-border bg-popover p-1 text-sm shadow-lg transition-all duration-150 ease-out',
          open ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
        )}
      >
        {MARKER_COLORS.map((color, index) => {
          const selected = color === value
          const isFocused = focusedIndex === index

          return (
            <button
              key={color}
              ref={(node) => {
                optionRefs.current[index] = node
              }}
              type="button"
              role="option"
              aria-selected={selected}
              tabIndex={open ? 0 : -1}
              onMouseEnter={() => setFocusedIndex(index)}
              onClick={() => selectColor(color)}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                selected ? 'bg-accent text-foreground' : 'text-foreground hover:bg-muted/70',
                isFocused && !selected && 'bg-muted/70'
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full border border-foreground/10"
                  style={{ backgroundColor: COLOR_SWATCHES[color] }}
                />
                <span className="truncate">{color}</span>
              </span>
              {selected ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
