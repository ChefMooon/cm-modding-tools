import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useLocation, useNavigate } from '@tanstack/react-router'

import { cn } from '@/lib/utils'

type ToolboxItem = {
  id: string
  label: string
  to: string
}

const TOOLBOX_ITEMS: ToolboxItem[] = [
  {
    id: 'collision-box-builder',
    label: 'Collision Box Builder',
    to: '/collision-box-builder',
  },
]

export function ToolboxDropdown() {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const listboxId = useId()
  const navigate = useNavigate()
  const location = useLocation()

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      setFocusedIndex(0)
      triggerRef.current?.focus()
    }
  }

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
  }, [open])

  const moveFocus = (nextIndex: number) => {
    const safeIndex = (nextIndex + TOOLBOX_ITEMS.length) % TOOLBOX_ITEMS.length
    setFocusedIndex(safeIndex)
    optionRefs.current[safeIndex]?.focus()
  }

  const handleSelect = (to: string) => {
    setOpen(false)
    setFocusedIndex(0)
    triggerRef.current?.focus()
    navigate({ to })
  }

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleOpenChange(true)
      setFocusedIndex(0)
      window.requestAnimationFrame(() => {
        optionRefs.current[0]?.focus()
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
        moveFocus(TOOLBOX_ITEMS.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        handleSelect(TOOLBOX_ITEMS[index].to)
        break
      case 'Escape':
        event.preventDefault()
        handleOpenChange(false)
        break
      default:
        break
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => handleOpenChange(!open)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={listboxId}
        className="inline-flex min-w-[8.5rem] items-center justify-between gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className="truncate">Toolbox</span>
        <ChevronDown className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform duration-150', open && 'rotate-180')} />
      </button>

      <div
        id={listboxId}
        role="menu"
        aria-label="Toolbox"
        aria-hidden={!open}
        className={cn(
          'absolute z-50 mt-2 min-w-[14rem] rounded-xl border border-border bg-popover p-1 text-sm shadow-lg transition-all duration-150 ease-out',
          open ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
        )}
      >
        {TOOLBOX_ITEMS.map((item, index) => {
          const selected = item.to === location.pathname
          const isFocused = focusedIndex === index

          return (
            <button
              key={item.id}
              ref={(node) => {
                optionRefs.current[index] = node
              }}
              type="button"
              role="menuitem"
              tabIndex={open ? 0 : -1}
              onMouseEnter={() => setFocusedIndex(index)}
              onClick={() => handleSelect(item.to)}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                selected ? 'bg-accent text-foreground' : 'text-foreground hover:bg-muted/70',
                isFocused && !selected && 'bg-muted/70'
              )}
            >
              <span className="truncate font-medium">{item.label}</span>
              {selected ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
