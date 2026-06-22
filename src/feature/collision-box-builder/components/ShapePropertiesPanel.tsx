import type { CollisionShape } from '../types/types'
import { COORDINATE_MAX, COORDINATE_MIN, MARKER_COLORS, ROTATION_VALUES } from '../types/types'
import { DraggableStepper } from './DraggableStepper'

interface ShapePropertiesPanelProps {
  selectedShape: CollisionShape | null
  globalStepSize: number
  showPivotPoint: boolean
  onTogglePivotPoint: () => void
  onUpdateAttribute: (id: string, key: keyof CollisionShape, value: CollisionShape[keyof CollisionShape]) => void
  onUpdateShapeSize: (id: string, axis: 'X' | 'Y' | 'Z', value: number) => void
  onResetShape: () => void
}

function getShapeSizeValue(shape: CollisionShape, axis: 'X' | 'Y' | 'Z') {
  const minKey = `min${axis}` as 'minX' | 'minY' | 'minZ'
  const maxKey = `max${axis}` as 'maxX' | 'maxY' | 'maxZ'
  const size = (shape[maxKey] as number) - (shape[minKey] as number)
  return Number(size.toFixed(2))
}

export function ShapePropertiesPanel({
  selectedShape,
  globalStepSize,
  showPivotPoint,
  onTogglePivotPoint,
  onUpdateAttribute,
  onUpdateShapeSize,
  onResetShape,
}: ShapePropertiesPanelProps) {
  if (!selectedShape) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        Select or add a shape.
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Shape Name</label>
          <input
            type="text"
            value={selectedShape.name}
            onChange={(event) => onUpdateAttribute(selectedShape.id, 'name', event.target.value)}
            className="w-full rounded border border-border bg-muted px-2 py-1 text-xs font-mono text-foreground focus:border-ring focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={onResetShape}
          className="rounded border border-border bg-background px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground transition hover:bg-accent"
        >
          Reset
        </button>
      </div>

      <div className="space-y-2 border-t border-border pt-2">
        <div className="rounded border border-border bg-background/70 p-2">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Color</label>
          <select
            value={selectedShape.markerColor}
            onChange={(event) => onUpdateAttribute(selectedShape.id, 'markerColor', event.target.value as CollisionShape['markerColor'])}
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
          >
            {MARKER_COLORS.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded border border-border bg-muted/70 p-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Position</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { key: 'minX', label: 'X' },
              { key: 'minY', label: 'Y' },
              { key: 'minZ', label: 'Z' },
            ].map((field) => (
              <DraggableStepper
                key={field.key}
                label={field.label}
                value={selectedShape[field.key as keyof CollisionShape] as number}
                min={COORDINATE_MIN}
                max={COORDINATE_MAX}
                step={globalStepSize}
                onChange={(value) => onUpdateAttribute(selectedShape.id, field.key as keyof CollisionShape, value)}
              />
            ))}
          </div>
        </div>

        <div className="rounded border border-border bg-muted/70 p-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Size</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {(['X', 'Y', 'Z'] as const).map((axis) => (
              <DraggableStepper
                key={axis}
                label={axis}
                value={getShapeSizeValue(selectedShape, axis)}
                min={0}
                max={COORDINATE_MAX - COORDINATE_MIN}
                step={globalStepSize}
                onChange={(nextValue) => onUpdateShapeSize(selectedShape.id, axis, nextValue)}
              />
            ))}
          </div>
        </div>

        <div className="rounded border border-border bg-muted/70 p-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pivot</span>
            <label className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <input
                type="checkbox"
                checked={showPivotPoint}
                onChange={onTogglePivotPoint}
                className="h-3.5 w-3.5 rounded border-border accent-foreground"
              />
              <span>Show</span>
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {(['X', 'Y', 'Z'] as const).map((axis) => (
              <DraggableStepper
                key={axis}
                label={axis}
                value={selectedShape[`pivot${axis}` as keyof CollisionShape] as number}
                min={-8}
                max={8}
                step={globalStepSize}
                onChange={(value) => onUpdateAttribute(selectedShape.id, `pivot${axis}` as keyof CollisionShape, value)}
              />
            ))}
          </div>
        </div>

        <div className="rounded border border-border bg-muted/70 p-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Rotation</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {(['X', 'Y', 'Z'] as const).map((axis) => (
              <DraggableStepper
                key={axis}
                label={axis}
                value={selectedShape[`rotation${axis}` as keyof CollisionShape] as number}
                min={-45}
                max={45}
                step={22.5}
                options={ROTATION_VALUES}
                onChange={(value) => onUpdateAttribute(selectedShape.id, `rotation${axis}` as keyof CollisionShape, value)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
