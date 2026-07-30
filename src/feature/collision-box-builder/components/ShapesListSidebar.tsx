import { Copy, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import type { CollisionShape } from '../types/types'

interface ShapesListSidebarProps {
  shapes: CollisionShape[]
  selectedShapeId: string
  onSelectShape: (shapeId: string) => void
  onAddShape: () => void
  onClearShapes: () => void
  onRemoveShape: (shapeId: string) => void
  onToggleVisibility: (shapeId: string) => void
  onCopyShapeDimensions: (shape: CollisionShape) => void | Promise<void>
}

function getMarkerColor(shape: CollisionShape) {
  switch (shape.markerColor) {
    case 'Light Blue':
      return '#60a5fa'
    case 'Yellow':
      return '#facc15'
    case 'Orange':
      return '#fb923c'
    case 'Red':
      return '#f87171'
    case 'Purple':
      return '#a78bfa'
    case 'Blue':
      return '#3b82f6'
    case 'Green':
      return '#34d399'
    case 'Lime':
      return '#a3e635'
    case 'Pink':
      return '#f472b6'
    default:
      return '#cbd5e1'
  }
}

export function ShapesListSidebar({
  shapes,
  selectedShapeId,
  onSelectShape,
  onAddShape,
  onClearShapes,
  onRemoveShape,
  onToggleVisibility,
  onCopyShapeDimensions,
}: ShapesListSidebarProps) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Shapes</h2>
        <div className="relative z-0 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onClearShapes}
            disabled={shapes.length === 0}
            className="flex cursor-pointer items-center justify-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={13} /> Clear Shapes
          </button>
          <button
            type="button"
            onClick={onAddShape}
            className="flex cursor-pointer items-center justify-center gap-1 rounded bg-foreground px-2 py-1 text-xs font-medium text-background transition hover:opacity-90"
          >
            <Plus size={13} /> Add Shape
          </button>
        </div>
      </div>
      <div className="max-h-[220px] space-y-1 overflow-y-auto sm:max-h-[180px]">
        {shapes.map((shape) => (
          <div
            key={shape.id}
            onClick={() => onSelectShape(shape.id)}
            className={`flex items-center justify-between rounded border px-2.5 py-1.5 text-xs transition ${selectedShapeId === shape.id ? 'border-border bg-muted text-foreground' : 'border-transparent bg-transparent text-muted-foreground hover:border-border'}`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getMarkerColor(shape) }} />
              <span className="truncate font-mono">{shape.name || 'unnamed'}</span>
            </div>
            <div className="flex items-center gap-0.5" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                onClick={() => { void onCopyShapeDimensions(shape) }}
                className="cursor-pointer p-1 text-muted-foreground hover:text-foreground"
                title="Copy dimensions"
                aria-label={`Copy dimensions for ${shape.name || 'unnamed'}`}
              >
                <Copy size={13} />
              </button>
              <button
                type="button"
                onClick={() => onToggleVisibility(shape.id)}
                className="cursor-pointer p-1 text-muted-foreground hover:text-foreground"
              >
                {shape.visible ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
              <button
                type="button"
                onClick={() => onRemoveShape(shape.id)}
                className="cursor-pointer p-1 text-muted-foreground hover:text-red-500"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
