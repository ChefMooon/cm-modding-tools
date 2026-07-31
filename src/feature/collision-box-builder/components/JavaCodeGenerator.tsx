import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Copy } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui/tooltip'
import type { CollisionBox, CollisionShape } from '../types/types'

type OutputFlavor = 'standard' | 'absolute'

interface JavaCodeGeneratorProps {
  shapes: CollisionShape[]
  copyToClipboard: (text: string) => Promise<void>
}

function formatAbsoluteDoubleValue(value: number) {
  const normalized = Number((value / 16).toFixed(4))
  const stringValue = Number.isInteger(normalized) ? normalized.toFixed(1) : normalized.toFixed(4)
  return `${stringValue}D`
}

export function JavaCodeGenerator({ shapes, copyToClipboard }: JavaCodeGeneratorProps) {
  const [includeElementComments, setIncludeElementComments] = useState(true)
  const [outputFlavor, setOutputFlavor] = useState<OutputFlavor>('standard')
  const [shapeVariableName, setShapeVariableName] = useState('SHAPE')
  const [showOutputOptions, setShowOutputOptions] = useState(false)
  const [copiedActionId, setCopiedActionId] = useState<string | null>(null)
  const resetCopyTimeoutRef = useRef<number | null>(null)

  const getIndividualShapeCopyValue = useCallback((shape: CollisionBox) => {
    const values = outputFlavor === 'absolute'
      ? [shape.minX, shape.minY, shape.minZ, shape.maxX, shape.maxY, shape.maxZ].map(formatAbsoluteDoubleValue)
      : [shape.minX, shape.minY, shape.minZ, shape.maxX, shape.maxY, shape.maxZ]

    return `(${values.join(', ')})`
  }, [outputFlavor])

  const getIndividualShapeSnippets = useMemo(() => {
    return shapes.map((shape, index) => {
      const baseLine = outputFlavor === 'absolute'
        ? `Shapes.box(${[shape.minX, shape.minY, shape.minZ, shape.maxX, shape.maxY, shape.maxZ].map(formatAbsoluteDoubleValue).join(', ')})`
        : `Block.box(${[shape.minX, shape.minY, shape.minZ, shape.maxX, shape.maxY, shape.maxZ].join(', ')})`

      if (!includeElementComments || !shape.name.trim()) {
        if (shapes.length === 1) {
          return `${baseLine};`
        }

        if (index < shapes.length - 1) {
          return `${baseLine},`
        }

        return baseLine
      }

      if (shapes.length === 1) {
        return `${baseLine}; // ${shape.name.trim()}`
      }

      if (index < shapes.length - 1) {
        return `${baseLine}, // ${shape.name.trim()}`
      }

      return `${baseLine} // ${shape.name.trim()}`
    })
  }, [includeElementComments, outputFlavor, shapes])

  const generatedJavaOutput = useMemo(() => {
    const normalizedVariableName = shapeVariableName.trim() || 'SHAPE'
    const shapeLines = getIndividualShapeSnippets

    if (shapes.length === 1) {
      return [`public static final VoxelShape ${normalizedVariableName} = ${shapeLines[0]}`, ''].join('\n')
    }

    if (shapes.length === 0) {
      return [`public static final VoxelShape ${normalizedVariableName} = Shapes.or(`, ');', ''].join('\n')
    }

    const renderedLines = shapeLines.map((line) => `    ${line}`)
    return [`public static final VoxelShape ${normalizedVariableName} = Shapes.or(`, ...renderedLines, ');', ''].join('\n')
  }, [getIndividualShapeSnippets, shapeVariableName, shapes.length])

  const snippetRows = useMemo<Array<{ content: string; copyValue?: string }>>(() => {
    const normalizedVariableName = shapeVariableName.trim() || 'SHAPE'
    const shapeLines = getIndividualShapeSnippets

    if (shapes.length === 1) {
      return [{ content: `public static final VoxelShape ${normalizedVariableName} = ${shapeLines[0]}` }]
    }

    if (shapes.length === 0) {
      return [{ content: `public static final VoxelShape ${normalizedVariableName} = Shapes.or(` }, { content: ');' }]
    }

    return [
      { content: `public static final VoxelShape ${normalizedVariableName} = Shapes.or(` },
      ...shapeLines.map((line, index) => ({
        content: `    ${line}`,
        copyValue: getIndividualShapeCopyValue(shapes[index]),
      })),
      { content: ');' },
    ]
  }, [getIndividualShapeCopyValue, getIndividualShapeSnippets, shapeVariableName, shapes])

  const handleCopyValue = useCallback(async (text: string, actionId: string) => {
    try {
      await copyToClipboard(text)
      setCopiedActionId(actionId)

      if (resetCopyTimeoutRef.current !== null) {
        window.clearTimeout(resetCopyTimeoutRef.current)
      }

      resetCopyTimeoutRef.current = window.setTimeout(() => {
        setCopiedActionId((current) => current === actionId ? null : current)
      }, 1400)
    } catch {
      setCopiedActionId(null)
    }
  }, [copyToClipboard])

  useEffect(() => {
    return () => {
      if (resetCopyTimeoutRef.current !== null) {
        window.clearTimeout(resetCopyTimeoutRef.current)
      }
    }
  }, [])

  const redundancyWarnings = useMemo(() => {
    const warnings = new Set<string>()

    shapes.forEach((shape, index) => {
      shapes.forEach((otherShape, otherIndex) => {
        if (index === otherIndex) return

        const isEnclosed = shape.minX <= otherShape.minX
          && shape.minY <= otherShape.minY
          && shape.minZ <= otherShape.minZ
          && shape.maxX >= otherShape.maxX
          && shape.maxY >= otherShape.maxY
          && shape.maxZ >= otherShape.maxZ

        if (isEnclosed) {
          const outerName = shape.name.trim() || 'unnamed'
          const innerName = otherShape.name.trim() || 'unnamed'
          warnings.add(`${innerName} is fully enclosed by ${outerName} and may be redundant.`)
        }
      })
    })

    return Array.from(warnings)
  }, [shapes])

  return (
    <div className="rounded-xl border border-border bg-muted p-3 space-y-3">
      <div className="space-y-3 rounded border border-border bg-background/70 p-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-medium text-muted-foreground">Java Code Output</h3>
            <p className="text-[10px] text-muted-foreground">Generate clean, copy-ready registration code for your current shape set.</p>
          </div>
          <Tooltip disableHoverableContent>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setShowOutputOptions((current) => !current)}
                aria-expanded={showOutputOptions}
                className="flex items-center gap-1.5 rounded border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground transition hover:bg-muted"
              >
                {showOutputOptions ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showOutputOptions ? 'Hide options' : 'Show options'}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="pointer-events-none">{showOutputOptions ? 'Hide output options' : 'Show output options'}</TooltipContent>
          </Tooltip>
        </div>

        {showOutputOptions ? (
          <div className="space-y-2 rounded border border-border/70 bg-muted/40 p-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground">
                <input
                  type="checkbox"
                  checked={includeElementComments}
                  onChange={(event) => setIncludeElementComments(event.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border accent-foreground"
                />
                <span>Include Element Comments</span>
              </label>
              <select
                value={outputFlavor}
                onChange={(event) => setOutputFlavor(event.target.value as OutputFlavor)}
                className="rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground"
              >
                <option value="standard">Standard (Block.box)</option>
                <option value="absolute">Absolute Doubles (Shapes.box)</option>
              </select>
            </div>
            <label className="block text-[11px] font-medium text-muted-foreground">
              Variable Name
              <input
                type="text"
                value={shapeVariableName}
                onChange={(event) => setShapeVariableName(event.target.value)}
                onBlur={() => setShapeVariableName((current) => current.trim() || 'SHAPE')}
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground"
                placeholder="SHAPE"
              />
            </label>
          </div>
        ) : null}
      </div>

      {redundancyWarnings.length > 0 ? (
        <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-700">
          <div className="font-medium">Structural warning</div>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {redundancyWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="overflow-hidden rounded border border-border bg-background">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-2 py-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Code Snippet</span>
          <Tooltip disableHoverableContent>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => { void handleCopyValue(generatedJavaOutput, 'all-snippet') }}
                className={`flex min-w-[86px] items-center justify-center rounded border border-border/70 px-2 py-1 text-[10px] font-medium transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 ease-out active:scale-[0.96] ${copiedActionId === 'all-snippet' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-foreground/10 text-foreground hover:bg-foreground/20'}`}
              >
                {copiedActionId === 'all-snippet' ? <Check className="mr-1 inline h-3 w-3 shrink-0" /> : <Copy className="mr-1 inline h-3 w-3 shrink-0" />}
                <span className="whitespace-nowrap">{copiedActionId === 'all-snippet' ? 'Copied' : 'Copy All'}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="pointer-events-none">{copiedActionId === 'all-snippet' ? 'Copied entire snippet' : 'Copy entire snippet'}</TooltipContent>
          </Tooltip>
        </div>
        <div className="overflow-x-auto border-t border-border bg-muted/40 p-2 font-mono text-[11px] text-amber-600 sm:text-xs">
          {snippetRows.map((row, index) => (
            <div key={`snippet-row-${index}`} className="flex min-h-[1.25rem] items-center justify-between gap-2">
              <span className="min-w-0 whitespace-pre-wrap break-words">{row.content}</span>
              {row.copyValue !== undefined ? (
                <Tooltip disableHoverableContent>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => { if (row.copyValue !== undefined) { void handleCopyValue(row.copyValue, `shape-${index}`) } }}
                      className={`flex-shrink-0 rounded border border-border/70 px-2 py-1 text-[10px] font-medium transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 ease-out active:scale-[0.96] ${copiedActionId === `shape-${index}` ? 'bg-emerald-600 text-white shadow-sm' : 'bg-foreground/10 text-foreground hover:bg-foreground/20'}`}
                    >
                      {copiedActionId === `shape-${index}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="pointer-events-none">{copiedActionId === `shape-${index}` ? 'Copied element values' : 'Copy element values'}</TooltipContent>
                </Tooltip>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
