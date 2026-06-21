import { Children, cloneElement, createContext, useContext, useEffect, useRef, useState, type ComponentPropsWithoutRef, type MouseEvent as ReactMouseEvent, type PropsWithChildren, type ReactElement } from 'react'
import { cn } from '../../lib/utils'

interface PopoverContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const PopoverContext = createContext<PopoverContextValue | null>(null)

function usePopoverContext() {
  const context = useContext(PopoverContext)

  if (!context) {
    throw new Error('Popover components must be used within a Popover provider.')
  }

  return context
}

export function Popover({ children, open, onOpenChange }: PropsWithChildren<{ open?: boolean; onOpenChange?: (open: boolean) => void }>) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen

  const setOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen)
    }

    onOpenChange?.(nextOpen)
  }

  return (
    <PopoverContext.Provider value={{ open: isOpen, setOpen }}>
      <div className="relative inline-flex shrink-0">
        {children}
      </div>
    </PopoverContext.Provider>
  )
}

export function PopoverTrigger({ children, asChild = false, ...props }: PropsWithChildren<{ asChild?: boolean } & ComponentPropsWithoutRef<'button'>>) {
  const { open, setOpen } = usePopoverContext()

  if (asChild && Children.count(children) === 1 && Children.only(children) && typeof Children.only(children) !== 'string') {
    const child = Children.only(children) as ReactElement<{ onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void }>

    return cloneElement(child, {
      ...props,
      onClick: (event: ReactMouseEvent<HTMLButtonElement>) => {
        child.props.onClick?.(event)
        setOpen(!open)
      },
    })
  }

  return (
    <button type="button" onClick={() => setOpen(!open)} {...props}>
      {children}
    </button>
  )
}

export function PopoverContent({ children, className, ...props }: PropsWithChildren<ComponentPropsWithoutRef<'div'>>) {
  const { open, setOpen } = usePopoverContext()
  const contentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (target && contentRef.current?.contains(target)) {
        return
      }

      setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open, setOpen])

  if (!open) {
    return null
  }

  return (
    <div ref={contentRef} className={cn('absolute right-0 top-full z-50 mt-2 pointer-events-auto', className)} {...props}>
      {children}
    </div>
  )
}
