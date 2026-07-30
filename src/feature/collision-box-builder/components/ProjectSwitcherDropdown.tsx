import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Check, ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { VoxelProject } from '../types/types'

interface ProjectSwitcherDropdownProps {
  activeProjectId: string | null
  projects: VoxelProject[]
  onProjectChange: (projectId: string) => void
}

export function ProjectSwitcherDropdown({
  activeProjectId,
  projects,
  onProjectChange,
}: ProjectSwitcherDropdownProps) {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(() => projects.findIndex((project) => project.id === activeProjectId))
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const listboxId = useId()

  const selectedProject = projects.find((project) => project.id === activeProjectId)
  const selectedProjectName = selectedProject?.name ?? 'Select project'

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)

    if (projects.length === 0) {
      setFocusedIndex(-1)
      return
    }

    const nextIndex = projects.findIndex((project) => project.id === activeProjectId)
    const safeIndex = nextIndex >= 0 ? nextIndex : 0
    setFocusedIndex(safeIndex)
  }, [activeProjectId, projects])

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

  const selectProject = (nextProjectId: string) => {
    onProjectChange(nextProjectId)
    handleOpenChange(false)
    triggerRef.current?.focus()
  }

  const moveFocus = (nextIndex: number) => {
    if (projects.length === 0) {
      return
    }

    const safeIndex = (nextIndex + projects.length) % projects.length
    setFocusedIndex(safeIndex)
    optionRefs.current[safeIndex]?.focus()
  }

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (projects.length === 0) {
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const initialIndex = projects.findIndex((project) => project.id === activeProjectId)
      const indexToFocus = initialIndex >= 0 ? initialIndex : 0
      handleOpenChange(true)
      setFocusedIndex(indexToFocus)
      window.requestAnimationFrame(() => {
        optionRefs.current[indexToFocus]?.focus()
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
        moveFocus(projects.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        selectProject(projects[index].id)
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
    <div ref={containerRef} className="relative z-0 min-w-0 flex-1">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => handleOpenChange(!open)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby="project-switcher-label"
        className="flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm font-medium text-foreground shadow-xs transition hover:bg-accent/50 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className="truncate">{selectedProjectName}</span>
        <ChevronDown className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform duration-150', open && 'rotate-180')} />
      </button>

      <div
        id={listboxId}
        role="listbox"
        aria-label="Project"
        aria-hidden={!open}
        className={cn(
          'absolute z-[60] mt-1 w-full rounded-lg border border-border bg-popover p-1 text-sm shadow-lg transition-all duration-150 ease-out',
          open ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
        )}
      >
        {projects.length > 0 ? (
          projects.map((project, index) => {
            const selected = project.id === activeProjectId
            const isFocused = focusedIndex === index

            return (
              <button
                key={project.id}
                ref={(node) => {
                  optionRefs.current[index] = node
                }}
                type="button"
                role="option"
                aria-selected={selected}
                tabIndex={open ? 0 : -1}
                onMouseEnter={() => setFocusedIndex(index)}
                onClick={() => selectProject(project.id)}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                  selected ? 'bg-accent text-foreground' : 'text-foreground hover:bg-muted/70',
                  isFocused && !selected && 'bg-muted/70'
                )}
              >
                <span className="truncate">{project.name}</span>
                {selected ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
              </button>
            )
          })
        ) : (
          <div className="px-2.5 py-2 text-sm text-muted-foreground">No projects available</div>
        )}
      </div>
    </div>
  )
}
