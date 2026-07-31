import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Compass, RotateCcw } from 'lucide-react'

export type PreviewDirection = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST'

interface ViewportToolbarProps {
  activeDirection: PreviewDirection
  isOpen: boolean
  onDirectionChange: (dir: PreviewDirection) => void
  onToggle: () => void
}

const directionLabels: Record<PreviewDirection, string> = {
  NORTH: 'North',
  SOUTH: 'South',
  EAST: 'East',
  WEST: 'West',
}

export function ViewportToolbar({ activeDirection, isOpen, onDirectionChange, onToggle }: ViewportToolbarProps) {
  const directions: PreviewDirection[] = ['NORTH', 'SOUTH', 'EAST', 'WEST']
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  return (
    <div
      className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col gap-2"
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
    >
      <div 
        className={cn(
          "pointer-events-auto flex flex-col rounded-xl border border-border bg-background/80 p-1.5 shadow-lg backdrop-blur-md transition-all duration-300",
          isOpen ? "gap-2" : "gap-0" // <-- Fixed: Removes the ghost gap when collapsed
        )}
      >
        <Tooltip disableHoverableContent>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg border border-border/40 text-muted-foreground hover:text-foreground"
              onClick={onToggle}
              aria-label={isOpen ? 'Collapse toolbar' : 'Expand toolbar'}
            >
              {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="pointer-events-none">{isOpen ? 'Collapse toolbar' : 'Expand toolbar'}</TooltipContent>
        </Tooltip>

        <div
          className={cn(
            'relative z-20 flex flex-col gap-1.5 overflow-visible transition-all duration-300',
            isOpen ? 'max-h-56 opacity-100' : 'max-h-0 opacity-0 pointer-events-none',
          )}
        >
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <Tooltip disableHoverableContent>
              <TooltipTrigger asChild>
                <PopoverTrigger
                  type="button"
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 transition-colors',
                    activeDirection !== 'NORTH' ? 'bg-accent text-accent-foreground shadow-sm' : 'bg-background/90 text-foreground hover:bg-accent/80',
                  )}
                  onClick={(event) => {
                    event.stopPropagation()
                    setIsPopoverOpen((value) => !value)
                  }}
                  aria-label="Change preview direction"
                >
                  <Compass className="h-4 w-4" />
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" className="pointer-events-none">Change preview direction</TooltipContent>
            </Tooltip>
            <PopoverContent
              side="right"
              align="start"
              sideOffset={10}
              className="flex w-44 flex-col gap-1.5 rounded-xl border border-border bg-background/95 p-2 shadow-xl backdrop-blur-md"
            >
              <span className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Directional Preview
              </span>
              {directions.map((dir) => (
                <Button
                  key={dir}
                  type="button"
                  variant={activeDirection === dir ? 'secondary' : 'ghost'}
                  className="h-8 w-full justify-start text-xs font-medium"
                  onClick={() => {
                    onDirectionChange(dir)
                    setIsPopoverOpen(false)
                  }}
                >
                  <span className={cn('mr-2 h-2 w-2 rounded-full', activeDirection === dir ? 'bg-primary' : 'bg-transparent')} />
                  {directionLabels[dir]} {dir === 'NORTH' ? '(Base)' : null}
                </Button>
              ))}
              {activeDirection !== 'NORTH' ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-1 h-7 w-full text-xs text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    onDirectionChange('NORTH')
                    setIsPopoverOpen(false)
                  }}
                >
                  <RotateCcw className="mr-1.5 h-3 w-3" /> Reset View
                </Button>
              ) : null}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}