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

interface PopoverContentProps extends PropsWithChildren<ComponentPropsWithoutRef<'div'>> {
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
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

export function PopoverTrigger({ children, asChild = false, onClick, ...props }: PropsWithChildren<{ asChild?: boolean; onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void } & ComponentPropsWithoutRef<'button'>>) {
  const { open, setOpen } = usePopoverContext()

  const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
    setOpen(!open)
  }

  if (asChild && Children.count(children) === 1 && Children.only(children) && typeof Children.only(children) !== 'string') {
    const child = Children.only(children) as ReactElement<{ onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void }>

    return cloneElement(child, {
      ...props,
      onClick: (event: ReactMouseEvent<HTMLButtonElement>) => {
        child.props.onClick?.(event)
        handleClick(event)
      },
    })
  }

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  )
}

export function PopoverContent({ children, className, side = 'bottom', align = 'center', sideOffset = 0, ...props }: PopoverContentProps) {
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

  const positionClasses = {
    top: 'bottom-full left-0 mb-2',
    right: 'left-full top-0 ml-2',
    bottom: 'top-full left-0 mt-2',
    left: 'right-full top-0 mr-2',
  }

  const alignClasses = {
    start: 'top-0',
    center: 'top-1/2 -translate-y-1/2',
    end: 'bottom-0',
  }

  const offsetStyle = sideOffset ? { [side === 'left' || side === 'right' ? 'margin' : 'marginTop']: `${sideOffset}px` } : undefined

  return (
    <div
      ref={contentRef}
      className={cn('pointer-events-auto absolute z-50', positionClasses[side], alignClasses[align], className)}
      style={offsetStyle}
      {...props}
    >
      {children}
    </div>
  )
}
