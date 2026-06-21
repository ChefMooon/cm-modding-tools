import { useEffect, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { getEffectiveStepValue, type StepModifierEvent } from '../lib/stepUtils'

interface DraggableStepperProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  options?: number[]
  onChange: (value: number) => void
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatValue(value: number, options?: number[]) {
  if (options?.includes(value)) {
    return value.toString()
  }

  const rounded = Number(value.toFixed(2))
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

function getNearestValue(value: number, min: number, max: number, step: number, options?: number[]) {
  if (options?.length) {
    return options.reduce((closest, candidate) => {
      const currentDistance = Math.abs(candidate - value)
      const closestDistance = Math.abs(closest - value)
      return currentDistance < closestDistance ? candidate : closest
    }, options[0])
  }

  const snapped = Math.round(value / step) * step
  return clampValue(Number(snapped.toFixed(2)), min, max)
}

function getEffectiveStep(step: number, event?: StepModifierEvent) {
  return getEffectiveStepValue(step, event)
}

export function DraggableStepper({
  label,
  value,
  min,
  max,
  step,
  options,
  onChange,
}: DraggableStepperProps) {
  const dragState = useRef<{ startX: number; startValue: number; active: boolean }>({
    startX: 0,
    startValue: 0,
    active: false,
  })
  const [isHovering, setIsHovering] = useState(false)
  const [activeModifier, setActiveModifier] = useState<'shift' | 'ctrl' | null>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey) {
        setActiveModifier('shift')
      } else if (event.ctrlKey || event.metaKey) {
        setActiveModifier('ctrl')
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.shiftKey && !event.ctrlKey && !event.metaKey) {
        setActiveModifier(null)
      } else if (event.key === 'Shift') {
        setActiveModifier(event.ctrlKey || event.metaKey ? 'ctrl' : null)
      } else if (event.key === 'Control' || event.key === 'Meta') {
        setActiveModifier(event.shiftKey ? 'shift' : null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      document.body.style.cursor = 'default'
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const changeValue = (nextValue: number, event?: StepModifierEvent) => {
    const effectiveStep = getEffectiveStep(step, event)
    onChange(getNearestValue(nextValue, min, max, effectiveStep, options))
  }

  const handleStep = (direction: -1 | 1, event?: StepModifierEvent) => {
    const effectiveStep = getEffectiveStep(step, event)
    changeValue(value + direction * effectiveStep, event)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragState.current = {
      startX: event.clientX,
      startValue: value,
      active: true,
    }
    document.body.style.cursor = 'ew-resize'

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!dragState.current.active) {
        return
      }

      const deltaX = moveEvent.clientX - dragState.current.startX
      const deltaValue = deltaX / 40
      const effectiveStep = getEffectiveStep(step, moveEvent)
      changeValue(dragState.current.startValue + deltaValue * effectiveStep, moveEvent)
    }

    const handlePointerUp = () => {
      dragState.current.active = false
      document.body.style.cursor = 'default'
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const hintText = activeModifier === 'shift'
    ? `Step: +${(getEffectiveStep(step, { shiftKey: true })).toFixed(2)} (Fast)`
    : activeModifier === 'ctrl'
      ? `Step: +${(getEffectiveStep(step, { ctrlKey: true })).toFixed(2)} (Fine)`
      : null

  return (
    <div className="flex items-stretch overflow-hidden rounded border border-border bg-background">
      <button
        type="button"
        onClick={(event) => handleStep(-1, event)}
        className="flex h-full min-h-9 w-8 shrink-0 items-center justify-center border-r border-border text-muted-foreground transition hover:bg-accent hover:text-foreground"
        aria-label={`Decrease ${label}`}
      >
        <Minus size={13} />
      </button>

      <div
        onPointerDown={handlePointerDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="relative flex h-full min-h-9 min-w-0 flex-1 cursor-ew-resize flex-col items-center justify-center px-1.5 py-0 text-center transition hover:bg-accent/50"
      >
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="font-mono text-[11px] font-semibold text-foreground">{formatValue(value, options)}</span>
        {isHovering && hintText ? (
          <span className="absolute -top-1 right-1 rounded border border-border bg-background/95 px-1 py-0.25 text-[8px] font-medium uppercase tracking-wide text-muted-foreground shadow-sm">
            {hintText}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={(event) => handleStep(1, event)}
        className="flex h-full min-h-9 w-8 shrink-0 items-center justify-center border-l border-border text-muted-foreground transition hover:bg-accent hover:text-foreground"
        aria-label={`Increase ${label}`}
      >
        <Plus size={13} />
      </button>
    </div>
  )
}
