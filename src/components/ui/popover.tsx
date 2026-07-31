import { Children, cloneElement, createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ComponentPropsWithoutRef, type MouseEvent as ReactMouseEvent, type PropsWithChildren, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'

interface PopoverContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  triggerElement: HTMLElement | null
  setTriggerElement: (element: HTMLElement | null) => void
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
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen

  const setOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen)
    }

    onOpenChange?.(nextOpen)
  }

  return (
    <PopoverContext.Provider value={{ open: isOpen, setOpen, triggerElement, setTriggerElement }}>
      <div className="relative inline-flex shrink-0">
        {children}
      </div>
    </PopoverContext.Provider>
  )
}

export function PopoverTrigger({ children, asChild = false, onClick, ...props }: PropsWithChildren<{ asChild?: boolean; onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void } & ComponentPropsWithoutRef<'button'>>) {
  const { open, setOpen, setTriggerElement } = usePopoverContext()

  const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    onClick?.(event)

    if (open) {
      setOpen(false)
      return
    }

    setOpen(true)
  }

  if (asChild && Children.count(children) === 1 && Children.only(children) && typeof Children.only(children) !== 'string') {
    const child = Children.only(children) as ReactElement<any>

    return cloneElement(child, {
      ...props,
      ref: (node: HTMLElement | null) => {
        setTriggerElement(node)
      },
      onClick: (event: ReactMouseEvent<HTMLElement>) => {
        child.props.onClick?.(event)
        handleClick(event as ReactMouseEvent<HTMLButtonElement>)
      },
    })
  }

  return (
    <button type="button" ref={setTriggerElement} onClick={handleClick} {...props}>
      {children}
    </button>
  )
}

export function PopoverContent({ children, className, side = 'bottom', align = 'center', sideOffset = 0, ...props }: PopoverContentProps) {
  const { open, setOpen, triggerElement } = usePopoverContext()
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState({ top: 8, left: 8 })

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (target && (contentRef.current?.contains(target) || triggerElement?.contains(target))) {
        return
      }

      setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open, setOpen])

  useLayoutEffect(() => {
    if (!open || !triggerElement || !contentRef.current) {
      return
    }

    const updatePosition = () => {
      const triggerRect = triggerElement.getBoundingClientRect()
      const contentRect = contentRef.current?.getBoundingClientRect()

      if (!contentRect) {
        return
      }

      let top = 0
      let left = 0

      if (side === 'top') {
        top = triggerRect.top - contentRect.height - sideOffset
      } else if (side === 'right') {
        top = triggerRect.top
        left = triggerRect.right + sideOffset
      } else if (side === 'left') {
        top = triggerRect.top
        left = triggerRect.left - contentRect.width - sideOffset
      } else {
        top = triggerRect.bottom + sideOffset
      }

      if (align === 'start') {
        left = side === 'left' || side === 'right' ? triggerRect.top : triggerRect.left
      } else if (align === 'end') {
        left = side === 'left' || side === 'right' ? triggerRect.bottom - contentRect.width : triggerRect.right - contentRect.width
      } else if (side === 'left' || side === 'right') {
        top = triggerRect.top + (triggerRect.height / 2) - (contentRect.height / 2)
      } else {
        left = triggerRect.left + (triggerRect.width / 2) - (contentRect.width / 2)
      }

      const padding = 8
      const maxLeft = Math.max(padding, window.innerWidth - contentRect.width - padding)
      const maxTop = Math.max(padding, window.innerHeight - contentRect.height - padding)

      top = Math.min(Math.max(top, padding), maxTop)
      left = Math.min(Math.max(left, padding), maxLeft)

      setPosition({ top, left })
    }

    updatePosition()

    const resizeObserver = new ResizeObserver(updatePosition)
    resizeObserver.observe(contentRef.current)

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [align, open, side, sideOffset, triggerElement])

  if (!open) {
    return null
  }

  const content = (
    <div
      ref={contentRef}
      className={cn('pointer-events-auto z-50', className)}
      style={{ position: 'fixed', top: position.top, left: position.left, zIndex: 50 }}
      {...props}
    >
      {children}
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null
}
