import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, FileJson2, Plus, Redo2, Trash2, Undo2 } from 'lucide-react'
import { ConfirmationDialog } from '../components/ui/confirmation-dialog'
import { DraggableStepper } from '../feature/collision-box-builder/components/DraggableStepper'
import { CollisionViewport } from '../feature/collision-box-builder/components/CollisionViewport'
import { JSONImport, type ImportPayload } from '../feature/collision-box-builder/components/JSONImport'
import { DragDropImportOverlay } from '../feature/collision-box-builder/components/DragDropImportOverlay'
import { collectFilesFromItems } from '../feature/collision-box-builder/lib/importFileUtils'
import { getEffectiveStepValue } from '../feature/collision-box-builder/lib/stepUtils'
import { ProjectManagement } from '../feature/collision-box-builder/components/ProjectManagement'
import { ProjectContextCard } from '../feature/collision-box-builder/components/ProjectContextCard'
import { StorageSafetyBadge } from '../feature/collision-box-builder/components/StorageSafetyBadge'
import {
  clampCollisionCoordinate,
  createDefaultState,
  createProject,
  createShape,
  downloadBackup,
  getRandomMarkerColor,
  getStorageUsage,
  normalizeState,
  readStoredState,
  resolveActiveProjectId,
  validateImportPayload,
  writeStoredState,
} from '../feature/collision-box-builder/lib/persistence'
import type { CollisionBox, CollisionShape, MarkerColor, MoveAxis, RotationAxisValue, VoxelProject } from '../feature/collision-box-builder/types/types'
import { COORDINATE_MAX, COORDINATE_MIN, MARKER_COLORS, MAX_PROJECTS, MAX_SHAPES_PER_PROJECT, ROTATION_VALUES } from '../feature/collision-box-builder/types/types'

type NumericCoordKey = 'minX' | 'minY' | 'minZ' | 'maxX' | 'maxY' | 'maxZ';
type OutputFlavor = 'standard' | 'absolute';
type ConfirmationVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';

interface ConfirmationState {
  title: string
  description: ReactNode
  confirmLabel: string
  confirmVariant: ConfirmationVariant
  onConfirm: () => void
}

export const Route = createFileRoute('/collision-box-builder')({
  component: RouteComponent,
})

function RouteComponent() {
  const getRequestedProjectId = () => {
    if (typeof window === 'undefined') {
      return null
    }

    return new URLSearchParams(window.location.search).get('project')
  }

  const [storageState, setStorageState] = useState(() => {
    const state = readStoredState()
    return {
      ...normalizeState(state),
      activeProjectId: resolveActiveProjectId(state, getRequestedProjectId()),
    }
  })
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => resolveActiveProjectId(readStoredState(), getRequestedProjectId()))
  const [selectedShapeId, setSelectedShapeId] = useState<string>('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [showProjectManagementModal, setShowProjectManagementModal] = useState(false)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [showPivotPoint, setShowPivotPoint] = useState(false)
  const [moveAxis, setMoveAxis] = useState<MoveAxis>('X')
  const [globalStepSize, setGlobalStepSize] = useState<number>(1)
  const [copiedShape, setCopiedShape] = useState<CollisionShape | null>(null)
  const [shapeVariableName, setShapeVariableName] = useState('SHAPE')
  const [includeElementComments, setIncludeElementComments] = useState(true)
  const [outputFlavor, setOutputFlavor] = useState<OutputFlavor>('standard')
  const [showOutputOptions, setShowOutputOptions] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [confirmationState, setConfirmationState] = useState<ConfirmationState | null>(null)
  const [historyMap, setHistoryMap] = useState<Record<string, CollisionShape[][]>>({})
  const [redoMap, setRedoMap] = useState<Record<string, CollisionShape[][]>>({})
  const [isDraggingActive, setIsDraggingActive] = useState(false)
  const [queuedImportFiles, setQueuedImportFiles] = useState<File[]>([])
  const dragCounterRef = useRef(0)

  const requestedProjectId = typeof window === 'undefined'
    ? null
    : new URLSearchParams(window.location.search).get('project')

  const effectiveActiveProjectId = useMemo(() => {
    if (activeProjectId && storageState.projects.some((project) => project.id === activeProjectId)) {
      return activeProjectId
    }

    return resolveActiveProjectId(storageState, requestedProjectId)
  }, [activeProjectId, requestedProjectId, storageState])

  const activeProject = useMemo(() => {
    const existing = storageState.projects.find((project) => project.id === effectiveActiveProjectId)
    return existing ?? storageState.projects[0] ?? null
  }, [effectiveActiveProjectId, storageState.projects])

  const shapes = activeProject?.shapes ?? []
  const effectiveSelectedShapeId = selectedShapeId && shapes.some((shape) => shape.id === selectedShapeId)
    ? selectedShapeId
    : shapes[0]?.id ?? ''
  const selectedShape = shapes.find((shape) => shape.id === effectiveSelectedShapeId) ?? null

  useEffect(() => {
    const nextState = normalizeState(storageState)
    if (nextState.activeProjectId !== storageState.activeProjectId || nextState.projects.length !== storageState.projects.length || nextState.projects.some((project, index) => project.id !== storageState.projects[index]?.id || project.name !== storageState.projects[index]?.name)) {
      setStorageState(nextState)
      return
    }

    writeStoredState(nextState)
  }, [storageState])

  useEffect(() => {
    if (activeProjectId !== effectiveActiveProjectId) {
      setActiveProjectId(effectiveActiveProjectId)
    }

    if (storageState.activeProjectId !== effectiveActiveProjectId) {
      setStorageState((prev) => normalizeState({ ...prev, activeProjectId: effectiveActiveProjectId, projects: prev.projects }))
    }
  }, [activeProjectId, effectiveActiveProjectId, storageState.activeProjectId])

  useEffect(() => {
    if (!statusMessage) {
      return
    }

    const timer = window.setTimeout(() => setStatusMessage(null), 4000)
    return () => window.clearTimeout(timer)
  }, [statusMessage])

  useEffect(() => {
    const resetDragState = () => {
      dragCounterRef.current = 0
      setIsDraggingActive(false)
    }

    window.addEventListener('dragend', resetDragState)
    window.addEventListener('drop', resetDragState)
    return () => {
      window.removeEventListener('dragend', resetDragState)
      window.removeEventListener('drop', resetDragState)
    }
  }, [])

  const clampCoordValue = (value: number) => clampCollisionCoordinate(value)
  const clampPivotValue = (value: number) => Math.max(-8, Math.min(8, Number(value.toFixed(2))))

  const formatShapeDimensions = (shape: CollisionBox) => [shape.minX, shape.minY, shape.minZ, shape.maxX, shape.maxY, shape.maxZ].join(', ')

  const updateShapeField = (shapeId: string, field: keyof CollisionShape, value: CollisionShape[keyof CollisionShape]) => {
    updateShapeAttribute(shapeId, field, value)
  }

  const formatAbsoluteDoubleValue = (value: number) => {
    const normalized = Number((value / 16).toFixed(4))
    const stringValue = Number.isInteger(normalized) ? normalized.toFixed(1) : normalized.toFixed(4)
    return `${stringValue}D`
  }

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return
      }
    } catch {
      // Fall back to the legacy execCommand path below.
    }

    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.setAttribute('readonly', '')
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }

  const copyShapeDimensions = async (shape: CollisionBox) => {
    await copyToClipboard(formatShapeDimensions(shape))
  }

  const getIndividualShapeCopyValue = (shape: CollisionBox) => {
    const values = outputFlavor === 'absolute'
      ? [shape.minX, shape.minY, shape.minZ, shape.maxX, shape.maxY, shape.maxZ].map(formatAbsoluteDoubleValue)
      : [shape.minX, shape.minY, shape.minZ, shape.maxX, shape.maxY, shape.maxZ]

    return `(${values.join(', ')})`
  }

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

  const storageUsage = useMemo(() => getStorageUsage(storageState.projects), [storageState.projects])

  const history = activeProjectId ? historyMap[activeProjectId] ?? [] : []
  const redoStack = activeProjectId ? redoMap[activeProjectId] ?? [] : []

  const saveHistoryState = (projectId: string, currentShapes: CollisionShape[]) => {
    const clone = currentShapes.map((shape) => ({ ...shape }))
    setHistoryMap((prev) => ({ ...prev, [projectId]: [...(prev[projectId] ?? []), clone] }))
    setRedoMap((prev) => ({ ...prev, [projectId]: [] }))
  }

  const updateProject = (projectId: string, updater: (project: VoxelProject) => VoxelProject) => {
    setStorageState((prev) => {
      const nextProjects = prev.projects.map((project) => {
        if (project.id !== projectId) {
          return project
        }

        const nextProject = updater({ ...project, shapes: project.shapes.map((shape) => ({ ...shape })) })
        return { ...nextProject, lastModified: Date.now() }
      })

      return normalizeState({ ...prev, activeProjectId: projectId, projects: nextProjects })
    })
  }

  const handleUndo = () => {
    if (!activeProject || history.length === 0) return

    const previous = history[history.length - 1]
    setRedoMap((prev) => ({ ...prev, [activeProject.id]: [shapes.map((shape) => ({ ...shape })), ...(prev[activeProject.id] ?? [])] }))
    updateProject(activeProject.id, (project) => ({ ...project, shapes: previous.map((shape) => ({ ...shape })) }))
    setHistoryMap((prev) => ({ ...prev, [activeProject.id]: prev[activeProject.id]?.slice(0, -1) ?? [] }))
  }

  const handleRedo = () => {
    if (!activeProject || redoStack.length === 0) return

    const next = redoStack[0]
    setHistoryMap((prev) => ({ ...prev, [activeProject.id]: [...(prev[activeProject.id] ?? []), shapes.map((shape) => ({ ...shape }))] }))
    updateProject(activeProject.id, (project) => ({ ...project, shapes: next.map((shape) => ({ ...shape })) }))
    setRedoMap((prev) => ({ ...prev, [activeProject.id]: prev[activeProject.id]?.slice(1) ?? [] }))
  }

  const clearCurrentProjectShapes = () => {
    if (!activeProject) return

    if (shapes.length === 0) {
      setStatusMessage('The current project already has no shapes.')
      return
    }

    saveHistoryState(activeProject.id, activeProject.shapes)
    updateProject(activeProject.id, (project) => ({ ...project, shapes: [] }))
    setSelectedShapeId('')
    setStatusMessage('Current project shapes cleared.')
  }

  const requestClearCurrentProjectShapes = () => {
    if (!activeProject || shapes.length === 0) {
      setStatusMessage('The current project already has no shapes.')
      return
    }

    openConfirmation({
      title: 'Clear Project Shapes?',
      description: 'This will permanently remove all voxel collision shapes inside the current project. This action cannot be undone.',
      confirmLabel: 'Clear shapes',
      confirmVariant: 'destructive',
      onConfirm: clearCurrentProjectShapes,
    })
  }

  const addNewShape = () => {
    if (!activeProject) return

    if (activeProject.shapes.length >= MAX_SHAPES_PER_PROJECT) {
      setStatusMessage('Import aborted: This operation would exceed your maximum storage limit of 50 projects or 50 shapes per project.')
      return
    }

    saveHistoryState(activeProject.id, activeProject.shapes)
    const newShape = createShape({ name: `shape_${activeProject.shapes.length + 1}` })
    updateProject(activeProject.id, (project) => ({ ...project, shapes: [...project.shapes, newShape] }))
    setSelectedShapeId(newShape.id)
  }

  const duplicateSelectedShape = () => {
    if (!activeProject || !selectedShape) return

    saveHistoryState(activeProject.id, activeProject.shapes)
    const duplicatedShape: CollisionShape = {
      ...selectedShape,
      id: crypto.randomUUID(),
      name: `${selectedShape.name || 'unnamed'}_copy`,
      visible: selectedShape.visible,
    }

    updateProject(activeProject.id, (project) => ({ ...project, shapes: [...project.shapes, duplicatedShape] }))
    setSelectedShapeId(duplicatedShape.id)
  }

  const removeShape = (id: string) => {
    if (!activeProject) return

    const nextShapes = activeProject.shapes.filter((shape) => shape.id !== id)
    saveHistoryState(activeProject.id, activeProject.shapes)
    updateProject(activeProject.id, (project) => ({ ...project, shapes: nextShapes }))

    if (selectedShapeId === id) {
      setSelectedShapeId(nextShapes[0]?.id ?? '')
    }
  }

  const toggleVisibility = (id: string) => {
    if (!activeProject) return

    saveHistoryState(activeProject.id, activeProject.shapes)
    updateProject(activeProject.id, (project) => ({
      ...project,
      shapes: project.shapes.map((shape: CollisionShape) => (shape.id === id ? { ...shape, visible: !shape.visible } : shape)),
    }))
  }

  const resetSelectedShape = () => {
    if (!activeProject || !selectedShape) return

    saveHistoryState(activeProject.id, activeProject.shapes)
    updateProject(activeProject.id, (project) => ({
      ...project,
      shapes: project.shapes.map((shape: CollisionShape) => (shape.id === selectedShape.id ? {
        ...shape,
        minX: 4,
        minY: 2,
        minZ: 4,
        maxX: 12,
        maxY: 10,
        maxZ: 12,
        pivotX: 0,
        pivotY: 0,
        pivotZ: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
      } : shape)),
    }))
  }

  const getShapeSizeValue = (shape: CollisionShape, axis: 'X' | 'Y' | 'Z') => {
    const minKey = `min${axis}` as 'minX' | 'minY' | 'minZ'
    const maxKey = `max${axis}` as 'maxX' | 'maxY' | 'maxZ'
    const size = (shape[maxKey] as number) - (shape[minKey] as number)
    return clampCoordValue(Number(size.toFixed(2)))
  }

  const updateShapeSize = (id: string, axis: 'X' | 'Y' | 'Z', value: number) => {
    if (!activeProject) return

    const minKey = `min${axis}` as 'minX' | 'minY' | 'minZ'
    const maxKey = `max${axis}` as 'maxX' | 'maxY' | 'maxZ'
    const nextSize = clampCoordValue(value)

    saveHistoryState(activeProject.id, activeProject.shapes)
    updateProject(activeProject.id, (project) => ({
      ...project,
      shapes: project.shapes.map((shape: CollisionShape) => {
        if (shape.id !== id) {
          return shape
        }

        const updated = { ...shape }
        const currentMin = shape[minKey] as number
        updated[maxKey] = clampCoordValue(currentMin + nextSize)
        return updated
      }),
    }))
  }

  const updateShapeAttribute = (id: string, key: keyof CollisionShape, value: CollisionShape[keyof CollisionShape]) => {
    if (!activeProject) return

    saveHistoryState(activeProject.id, activeProject.shapes)
    updateProject(activeProject.id, (project) => ({
      ...project,
      shapes: project.shapes.map((shape: CollisionShape) => {
        if (shape.id !== id) {
          return shape
        }

        const updated = { ...shape }
        if (typeof value === 'number' && ['minX', 'minY', 'minZ'].includes(key)) {
          const numericKey = key as 'minX' | 'minY' | 'minZ'
          const currentMin = shape[numericKey] as number
          const currentMax = shape[`max${numericKey.slice(3)}` as NumericCoordKey] as number
          const nextMin = clampCoordValue(value)
          const delta = nextMin - currentMin
          const nextMax = currentMax + delta
          const maxKey = `max${numericKey.slice(3)}` as NumericCoordKey

          if (nextMin < COORDINATE_MIN || nextMax > COORDINATE_MAX || nextMax < COORDINATE_MIN) {
            return shape
          }

          updated[numericKey] = nextMin
          updated[maxKey] = nextMax
        } else if (typeof value === 'number' && ['maxX', 'maxY', 'maxZ'].includes(key)) {
          const numericKey = key as 'maxX' | 'maxY' | 'maxZ'
          const clamped = clampCoordValue(value)
          const minKey = `min${numericKey.slice(3)}` as NumericCoordKey
          updated[numericKey] = clamped
          updated[minKey] = Math.min(shape[minKey] as number, clamped)
        } else if (typeof value === 'number' && ['pivotX', 'pivotY', 'pivotZ'].includes(key)) {
          updated[key as 'pivotX' | 'pivotY' | 'pivotZ'] = clampPivotValue(value)
        } else if (typeof value === 'number' && ['rotationX', 'rotationY', 'rotationZ'].includes(key)) {
          const rotationValue = value as RotationAxisValue
          updated[key as 'rotationX' | 'rotationY' | 'rotationZ'] = ROTATION_VALUES.includes(rotationValue) ? rotationValue : 0
        } else if (key === 'name' && typeof value === 'string') {
          updated.name = value
        } else if (key === 'visible' && typeof value === 'boolean') {
          updated.visible = value
        } else if (key === 'markerColor' && typeof value === 'string') {
          const markerColor = value as MarkerColor
          updated.markerColor = MARKER_COLORS.includes(markerColor) ? markerColor : getRandomMarkerColor()
          updated.markerColorSource = MARKER_COLORS.includes(markerColor) ? 'selected' : 'random'
        }

        return updated
      }),
    }))
  }

  const handleImport = (payload: ImportPayload) => {
    const currentProjectImports = payload.projects.filter((project) => project.importTarget === 'current-project')
    const newProjectImports = payload.projects.filter((project) => project.importTarget === 'new-projects')
    const importableNewProjectImports = newProjectImports.filter((project) => project.conflictAction !== 'skip')

    if (currentProjectImports.length > 0 && !activeProject) return

    const incomingProjectCount = importableNewProjectImports.length
    const incomingShapeCount = importableNewProjectImports.reduce((total, project) => total + project.shapes.length, 0)
    const validation = validateImportPayload(storageState.projects, incomingProjectCount, incomingShapeCount)

    if (!validation.ok) {
      setStatusMessage(validation.message ?? 'Import aborted: This operation would exceed your maximum storage limit of 50 projects or 50 shapes per project.')
      return
    }

    if (currentProjectImports.length > 0) {
      const targetShapes = currentProjectImports.flatMap((project) => project.shapes.map((shape) => ({ ...shape })))
      const nextShapes = [...activeProject!.shapes, ...targetShapes]

      updateProject(activeProject!.id, (project) => ({ ...project, shapes: nextShapes }))
      setSelectedShapeId(nextShapes[0]?.id ?? '')
    }

    if (importableNewProjectImports.length > 0) {
      const nextProjects = importableNewProjectImports.flatMap((project) => {
        if (project.conflictAction === 'skip') {
          return []
        }

        const existingProject = storageState.projects.find((candidate) => candidate.id === project.existingProjectId)
        if (project.conflictAction === 'overwrite' && existingProject) {
          return [{
            ...existingProject,
            id: existingProject.id,
            name: project.name,
            createdAt: existingProject.createdAt,
            lastModified: Date.now(),
            shapes: project.shapes.map((shape) => ({ ...shape })),
          }]
        }

        return [createProject({
          id: crypto.randomUUID(),
          name: project.name,
          shapes: project.shapes.map((shape) => ({ ...shape })),
        })]
      })

      const nextActiveProjectId = nextProjects[0]?.id ?? null

      setStorageState((prev) => normalizeState({
        ...prev,
        activeProjectId: nextActiveProjectId ?? prev.activeProjectId,
        projects: projectConflictsToProjects(prev.projects, nextProjects, importableNewProjectImports),
      }))
      setActiveProjectId(nextActiveProjectId)
      setSelectedShapeId(nextProjects[0]?.shapes[0]?.id ?? '')
    }

    setShowImportModal(false)
  }

  const projectConflictsToProjects = (existingProjects: VoxelProject[], incomingProjects: VoxelProject[], importPayloads: ImportPayload['projects']) => {
    const projectIdMap = new Map(existingProjects.map((project) => [project.id, project]))
    const nextProjects = [...existingProjects]

    incomingProjects.forEach((project, index) => {
      const importPayload = importPayloads[index]
      if (!importPayload) return

      if (importPayload.conflictAction === 'skip') return

      const existingProjectId = importPayload.existingProjectId
      if (importPayload.conflictAction === 'overwrite' && existingProjectId && projectIdMap.has(existingProjectId)) {
        const projectIndex = nextProjects.findIndex((candidate) => candidate.id === existingProjectId)
        if (projectIndex >= 0) {
          nextProjects[projectIndex] = project
        }
        return
      }

      if (existingProjectId && projectIdMap.has(existingProjectId)) {
        nextProjects.push(project)
        return
      }

      nextProjects.push(project)
    })

    return normalizeState({
      version: storageState.version,
      activeProjectId: storageState.activeProjectId,
      projects: nextProjects,
    }).projects
  }

  const moveShapeByDelta = (id: string, axis: MoveAxis, delta: number) => {
    if (!activeProject) return

    const roundedDelta = Number(delta.toFixed(2))
    if (roundedDelta === 0) return

    const nextShapes = activeProject.shapes.map((shape: CollisionShape) => {
      if (shape.id !== id) return shape

      if (axis === 'X') {
        const nextMin = Number((shape.minX + roundedDelta).toFixed(2))
        const nextMax = Number((shape.maxX + roundedDelta).toFixed(2))

        if (nextMin < COORDINATE_MIN || nextMax > COORDINATE_MAX) {
          return shape
        }

        return {
          ...shape,
          minX: nextMin,
          maxX: nextMax,
        }
      }

      if (axis === 'Y') {
        const nextMin = Number((shape.minY + roundedDelta).toFixed(2))
        const nextMax = Number((shape.maxY + roundedDelta).toFixed(2))

        if (nextMin < COORDINATE_MIN || nextMax > COORDINATE_MAX) {
          return shape
        }

        return {
          ...shape,
          minY: nextMin,
          maxY: nextMax,
        }
      }

      const nextMin = Number((shape.minZ + roundedDelta).toFixed(2))
      const nextMax = Number((shape.maxZ + roundedDelta).toFixed(2))

      if (nextMin < COORDINATE_MIN || nextMax > COORDINATE_MAX) {
        return shape
      }

      return {
        ...shape,
        minZ: nextMin,
        maxZ: nextMax,
      }
    })

    const didMove = nextShapes.some((shape: CollisionShape, index: number) => shape !== activeProject.shapes[index])
    if (!didMove) return

    saveHistoryState(activeProject.id, activeProject.shapes)
    updateProject(activeProject.id, (project) => ({
      ...project,
      shapes: nextShapes,
    }))
  }

  const getEffectiveStep = (event?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }) => {
    return getEffectiveStepValue(globalStepSize, event)
  }

  const nudgeSelectedShape = (axis: MoveAxis, direction: -1 | 1, event?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }) => {
    if (!selectedShape) return
    moveShapeByDelta(selectedShape.id, axis, direction * getEffectiveStep(event))
  }

  const createNewProject = () => {
    const projectCount = storageState.projects.length
    if (projectCount >= MAX_PROJECTS) {
      setStatusMessage('Import aborted: This operation would exceed your maximum storage limit of 50 projects or 50 shapes per project.')
      return
    }

    const newProject = createProject({ name: `Project ${projectCount + 1}` })
    setStorageState((prev) => normalizeState({ ...prev, activeProjectId: newProject.id, projects: [...prev.projects, newProject] }))
    setActiveProjectId(newProject.id)
    setSelectedShapeId('')
  }

  const switchProject = (projectId: string) => {
    setStorageState((prev) => normalizeState({ ...prev, activeProjectId: projectId, projects: prev.projects }))
    setActiveProjectId(projectId)
    setSelectedShapeId('')
  }

  const deleteProject = (projectId: string) => {
    if (!storageState.projects.some((project) => project.id === projectId)) return
    if (storageState.projects.length === 1) {
      setStorageState(createDefaultState())
      setActiveProjectId(null)
      setSelectedShapeId('')
      return
    }

    const remainingProjects = storageState.projects.filter((project) => project.id !== projectId)
    const nextActiveProjectId = remainingProjects[0]?.id ?? null
    setStorageState((prev) => normalizeState({ ...prev, activeProjectId: nextActiveProjectId, projects: remainingProjects }))
    setActiveProjectId(nextActiveProjectId)
    setSelectedShapeId('')
  }

  const renameProject = (projectId: string, name: string) => {
    updateProject(projectId, (project) => ({ ...project, name }))
  }

  const exportBackup = () => {
    downloadBackup(normalizeState(storageState))
  }

  const clearStorage = () => {
    window.localStorage.removeItem('cm-modding-tools:collision-builder-state')
    setStorageState(createDefaultState())
    setActiveProjectId(null)
    setSelectedShapeId('')
    setHistoryMap({})
    setRedoMap({})
  }

  const openConfirmation = (nextState: ConfirmationState) => {
    setConfirmationState(nextState)
  }

  const handleDragEnter = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const types = Array.from(event.dataTransfer?.types ?? [])
    if (!types.includes('Files')) {
      return
    }

    dragCounterRef.current += 1
    setIsDraggingActive(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()

    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1)
    if (dragCounterRef.current === 0) {
      setIsDraggingActive(false)
    }
  }

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy'
    }
  }

  const handleDrop = async (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()

    dragCounterRef.current = 0
    setIsDraggingActive(false)

    const files = await collectFilesFromItems(event.dataTransfer?.items ?? null)
    if (files.length === 0) {
      return
    }

    setQueuedImportFiles(files)
    setShowImportModal(true)
  }

  const closeConfirmation = () => {
    setConfirmationState(null)
  }

  const requestDeleteProject = (projectId: string) => {
    const project = storageState.projects.find((candidate) => candidate.id === projectId)
    if (!project) {
      return
    }

    openConfirmation({
      title: 'Delete project?',
      description: (
        <>
          This will permanently remove <span className="font-semibold text-foreground">{project.name}</span> and all shapes saved in it from local storage. This action cannot be undone.
        </>
      ),
      confirmLabel: 'Delete project',
      confirmVariant: 'destructive',
      onConfirm: () => {
        deleteProject(projectId)
        closeConfirmation()
      },
    })
  }

  const requestClearStorage = () => {
    openConfirmation({
      title: 'Clear all saved projects?',
      description: 'This will remove every saved project and shape from local storage and reset the builder to its initial state.',
      confirmLabel: 'Clear storage',
      confirmVariant: 'destructive',
      onConfirm: () => {
        clearStorage()
        closeConfirmation()
      },
    })
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTypingTarget = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target?.isContentEditable ?? false)
      const isModifierPressed = event.ctrlKey || event.metaKey

      if (isModifierPressed && !event.altKey) {
        const key = event.key.toLowerCase()

        if (key === 'z') {
          event.preventDefault()
          if (event.shiftKey) {
            handleRedo()
          } else {
            handleUndo()
          }
          return
        }

        if (key === 'y') {
          event.preventDefault()
          handleRedo()
          return
        }

        if (key === 'c' && selectedShape && !isTypingTarget) {
          event.preventDefault()
          setCopiedShape({ ...selectedShape })
          return
        }

        if (key === 'v' && copiedShape && !isTypingTarget) {
          event.preventDefault()
          if (!activeProject) return
          saveHistoryState(activeProject.id, activeProject.shapes)
          const pastedShape: CollisionShape = {
            ...copiedShape,
            id: crypto.randomUUID(),
            name: `${copiedShape.name || 'unnamed'}_copy`,
          }
          updateProject(activeProject.id, (project) => ({ ...project, shapes: [...project.shapes, pastedShape] }))
          setSelectedShapeId(pastedShape.id)
          return
        }
      }

      if (isTypingTarget) {
        if (event.key === 'Escape') {
          event.preventDefault()
          setSelectedShapeId('')
        }
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (!selectedShape) return
        event.preventDefault()
        removeShape(selectedShape.id)
        return
      }

      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault()
        addNewShape()
        return
      }

      if (event.key === 'd' || event.key === 'D') {
        event.preventDefault()
        duplicateSelectedShape()
        return
      }

      if (event.key === 'v' || event.key === 'V') {
        if (!selectedShape) return
        event.preventDefault()
        toggleVisibility(selectedShape.id)
        return
      }

      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault()
        resetSelectedShape()
        return
      }

      if (isDraggingActive && event.key === 'Escape') {
        event.preventDefault()
        dragCounterRef.current = 0
        setIsDraggingActive(false)
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        setSelectedShapeId('')
        return
      }

      if (event.key === 'Tab') {
        event.preventDefault()
        if (shapes.length === 0) return
        const currentIndex = shapes.findIndex((shape) => shape.id === selectedShapeId)
        const nextIndex = event.shiftKey
          ? (currentIndex <= 0 ? shapes.length - 1 : currentIndex - 1)
          : (currentIndex === -1 || currentIndex >= shapes.length - 1 ? 0 : currentIndex + 1)
        setSelectedShapeId(shapes[nextIndex].id)
        return
      }

      if (!selectedShape) return

      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault()
        const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1
        nudgeSelectedShape(moveAxis, direction as -1 | 1, event)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeProject, addNewShape, copiedShape, duplicateSelectedShape, handleRedo, handleUndo, isDraggingActive, moveAxis, moveShapeByDelta, nudgeSelectedShape, removeShape, resetSelectedShape, selectedShape, selectedShapeId, shapes, toggleVisibility])

  return (
    <div
      className="relative mx-auto min-h-screen w-full max-w-screen-2xl text-foreground app-shell"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDraggingActive ? <DragDropImportOverlay /> : null}

      <div className="space-y-4">
      <div className="space-y-2 border-b border-border pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">Collision Box Builder</h1>
            <p className="text-xs text-muted-foreground">Construct complex compound Minecraft VoxelShapes interactively.</p>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-1 rounded-md border border-border bg-muted p-1 sm:justify-end">
            <StorageSafetyBadge onExportBackup={exportBackup} onClearStorage={requestClearStorage} />
            <button type="button" onClick={() => setShowShortcutsHelp((value) => !value)} className="rounded border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground transition hover:bg-accent">
              {showShortcutsHelp ? 'Hide Shortcuts' : 'Shortcuts'}
            </button>
            <button type="button" onClick={() => { setQueuedImportFiles([]); setShowImportModal(true) }} className="flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground transition hover:bg-accent">
              <FileJson2 size={13} /> Import
            </button>
            <button disabled={history.length === 0} onClick={handleUndo} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30 cursor-pointer">
              <Undo2 size={15} />
            </button>
            <button disabled={redoStack.length === 0} onClick={handleRedo} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30 cursor-pointer">
              <Redo2 size={15} />
            </button>
          </div>
        </div>

        {statusMessage ? (
          <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-600">{statusMessage}</div>
        ) : null}

        {showShortcutsHelp ? (
          <div className="rounded-lg border border-border bg-muted/70 p-3 text-[11px] text-muted-foreground">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium uppercase tracking-wide text-foreground">Keyboard shortcuts</span>
              <span className="text-[10px] text-muted-foreground">Press once to use</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2"><span>Undo / Redo</span><span className="font-mono text-foreground">Ctrl/Cmd + Z / Y</span></div>
                <div className="flex items-center justify-between gap-2"><span>New shape</span><span className="font-mono text-foreground">N</span></div>
                <div className="flex items-center justify-between gap-2"><span>Duplicate shape</span><span className="font-mono text-foreground">D</span></div>
                <div className="flex items-center justify-between gap-2"><span>Delete shape</span><span className="font-mono text-foreground">Delete / Backspace</span></div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2"><span>Toggle visibility</span><span className="font-mono text-foreground">V</span></div>
                <div className="flex items-center justify-between gap-2"><span>Reset selected shape</span><span className="font-mono text-foreground">R</span></div>
                <div className="flex items-center justify-between gap-2"><span>Copy / Paste shape</span><span className="font-mono text-foreground">Ctrl/Cmd + C / V</span></div>
                <div className="flex items-center justify-between gap-2"><span>Move selected shape</span><span className="font-mono text-foreground">Arrow keys</span></div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {showImportModal ? <JSONImport isOpen={showImportModal} onClose={() => { setShowImportModal(false); setQueuedImportFiles([]) }} onImport={handleImport} existingProjects={storageState.projects.map((project) => ({ id: project.id, name: project.name, createdAt: project.createdAt, lastModified: project.lastModified }))} importFiles={queuedImportFiles.length > 0 ? queuedImportFiles : null} /> : null}
      {showProjectManagementModal ? (
        <ProjectManagement
          isOpen={showProjectManagementModal}
          onClose={() => setShowProjectManagementModal(false)}
          projects={storageState.projects}
          activeProjectId={effectiveActiveProjectId}
          onSelectProject={switchProject}
          onCreateProject={createNewProject}
          onDeleteProject={requestDeleteProject}
          onRenameProject={renameProject}
          onExportBackup={exportBackup}
        />
      ) : null}
      <ConfirmationDialog
        isOpen={confirmationState !== null}
        title={confirmationState?.title ?? 'Confirm action'}
        description={confirmationState?.description ?? 'Are you sure you want to continue?'}
        confirmLabel={confirmationState?.confirmLabel ?? 'Confirm'}
        confirmVariant={confirmationState?.confirmVariant ?? 'destructive'}
        onConfirm={() => {
          confirmationState?.onConfirm()
          closeConfirmation()
        }}
        onCancel={closeConfirmation}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-3">
          <div className="rounded-xl border border-border bg-muted/80 p-3 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Active project</p>
                <h2 className="text-sm font-semibold text-foreground">{activeProject?.name ?? 'No project'}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground">
                  Projects: {storageUsage.projectCount}/{MAX_PROJECTS}
                </div>
                <div className="rounded border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground">
                  Shapes: {shapes.length}/{MAX_SHAPES_PER_PROJECT}
                </div>
              </div>
            </div>

            <CollisionViewport
              boxes={shapes}
              selectedBoxId={effectiveSelectedShapeId}
              moveAxis={moveAxis}
              moveStep={globalStepSize}
              showPivotPoint={showPivotPoint}
              onSelectBox={setSelectedShapeId}
              onMoveAxisChange={setMoveAxis}
              onMoveStepChange={setGlobalStepSize}
              onMoveBox={moveShapeByDelta}
            />
          </div>

          <div className="rounded-xl border border-border bg-muted p-3 space-y-3">
            <div className="space-y-3 rounded border border-border bg-background/70 p-2.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <h3 className="text-xs font-medium text-muted-foreground">Java Code Output</h3>
                  <p className="text-[10px] text-muted-foreground">Generate clean, copy-ready registration code for your current shape set.</p>
                </div>
                <button type="button" onClick={() => setShowOutputOptions((current) => !current)} aria-expanded={showOutputOptions} className="flex items-center gap-1.5 rounded border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground transition hover:bg-muted">
                  {showOutputOptions ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {showOutputOptions ? 'Hide options' : 'Show options'}
                </button>
              </div>

              {showOutputOptions ? (
                <div className="space-y-2 rounded border border-border/70 bg-muted/40 p-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-2 rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground">
                      <input type="checkbox" checked={includeElementComments} onChange={(event) => setIncludeElementComments(event.target.checked)} className="h-3.5 w-3.5 rounded border-border accent-foreground" />
                      <span>Include Element Comments</span>
                    </label>
                    <select value={outputFlavor} onChange={(event) => setOutputFlavor(event.target.value as OutputFlavor)} className="rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground">
                      <option value="standard">Standard (Block.box)</option>
                      <option value="absolute">Absolute Doubles (Shapes.box)</option>
                    </select>
                  </div>
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Variable Name
                    <input type="text" value={shapeVariableName} onChange={(event) => setShapeVariableName(event.target.value)} onBlur={() => setShapeVariableName((current) => current.trim() || 'SHAPE')} className="mt-1 w-full rounded border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground" placeholder="SHAPE" />
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
                <button type="button" onClick={() => void copyToClipboard(generatedJavaOutput)} className="rounded bg-foreground/10 px-2 py-1 text-[10px] font-medium text-foreground transition hover:bg-foreground/20" title="Copy entire snippet">
                  <Copy className="mr-1 inline h-3 w-3" /> Copy All
                </button>
              </div>
              <div className="overflow-x-auto border-t border-border bg-muted/40 p-2 font-mono text-[11px] text-amber-600 sm:text-xs">
                {snippetRows.map((row, index) => (
                  <div key={`snippet-row-${index}`} className="flex min-h-[1.25rem] items-center justify-between gap-2">
                    <span className="min-w-0 whitespace-pre-wrap break-words">{row.content}</span>
                    {row.copyValue !== undefined ? (
                      <button type="button" onClick={() => { if (row.copyValue !== undefined) { void copyToClipboard(row.copyValue) } }} className="flex-shrink-0 rounded bg-foreground/10 px-2 py-1 text-[10px] font-medium text-foreground transition hover:bg-foreground/20" title="Copy element values">
                        <Copy className="h-3 w-3" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-2 lg:w-[320px] lg:flex-none lg:sticky lg:top-4 lg:self-start">
          <ProjectContextCard
            activeProjectId={effectiveActiveProjectId}
            projects={storageState.projects}
            onProjectChange={switchProject}
            onCreateProject={createNewProject}
            onDeleteProject={() => activeProject && requestDeleteProject(activeProject.id)}
            onOpenProjectManagement={() => setShowProjectManagementModal(true)}
          />

          <div className="space-y-2 rounded-xl border border-border bg-card p-2.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Shapes</h2>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={requestClearCurrentProjectShapes} disabled={!activeProject || shapes.length === 0} className="flex cursor-pointer items-center justify-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
                  <Trash2 size={13} /> Clear Shapes
                </button>
                <button onClick={addNewShape} className="flex cursor-pointer items-center justify-center gap-1 rounded bg-foreground px-2 py-1 text-xs font-medium text-background transition hover:opacity-90">
                  <Plus size={13} /> Add Shape
                </button>
              </div>
            </div>
            <div className="max-h-[220px] space-y-1 overflow-y-auto sm:max-h-[180px]">
              {shapes.map((shape) => (
                <div key={shape.id} onClick={() => setSelectedShapeId(shape.id)} className={`flex items-center justify-between rounded border px-2.5 py-1.5 text-xs transition ${selectedShapeId === shape.id ? 'border-border bg-muted text-foreground' : 'border-transparent bg-transparent text-muted-foreground hover:border-border'}`}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: shape.markerColor === 'Light Blue' ? '#60a5fa' : shape.markerColor === 'Yellow' ? '#facc15' : shape.markerColor === 'Orange' ? '#fb923c' : shape.markerColor === 'Red' ? '#f87171' : shape.markerColor === 'Purple' ? '#a78bfa' : shape.markerColor === 'Blue' ? '#3b82f6' : shape.markerColor === 'Green' ? '#34d399' : shape.markerColor === 'Lime' ? '#a3e635' : shape.markerColor === 'Pink' ? '#f472b6' : '#cbd5e1' }} />
                    <span className="truncate font-mono">{shape.name || 'unnamed'}</span>
                  </div>
                  <div className="flex items-center gap-0.5" onClick={(event) => event.stopPropagation()}>
                    <button type="button" onClick={() => void copyShapeDimensions(shape)} className="cursor-pointer p-1 text-muted-foreground hover:text-foreground" title="Copy dimensions" aria-label={`Copy dimensions for ${shape.name || 'unnamed'}`}>
                      <Copy size={13} />
                    </button>
                    <button onClick={() => toggleVisibility(shape.id)} className="cursor-pointer p-1 text-muted-foreground hover:text-foreground">
                      {shape.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                    <button onClick={() => removeShape(shape.id)} className="cursor-pointer p-1 text-muted-foreground hover:text-red-500">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedShape ? (
            <div className="space-y-3 rounded-xl border border-border bg-card p-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Shape Name</label>
                <input type="text" value={selectedShape.name} onChange={(event) => updateShapeAttribute(selectedShape.id, 'name', event.target.value)} className="w-full rounded border border-border bg-muted px-2 py-1 text-xs font-mono text-foreground focus:border-ring focus:outline-none" />
              </div>

              <div className="space-y-2 border-t border-border pt-2">
                <div className="rounded border border-border bg-background/70 p-2">
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Color</label>
                  <select
                    value={selectedShape.markerColor}
                    onChange={(event) => updateShapeAttribute(selectedShape.id, 'markerColor', event.target.value as MarkerColor)}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                  >
                    {MARKER_COLORS.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </div>

                {[
                  { title: 'Position', fields: [{ key: 'minX', label: 'X' }, { key: 'minY', label: 'Y' }, { key: 'minZ', label: 'Z' }] },
                ].map((section) => (
                  <div key={section.title} className="rounded border border-border bg-muted/70 p-2">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {section.fields.map((field) => (
                        <DraggableStepper
                          key={field.key}
                          label={field.label}
                          value={selectedShape[field.key as keyof CollisionShape] as number}
                          min={COORDINATE_MIN}
                          max={COORDINATE_MAX}
                          step={globalStepSize}
                          onChange={(value) => updateShapeField(selectedShape.id, field.key as keyof CollisionShape, value)}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                <div className="rounded border border-border bg-muted/70 p-2">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Size</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {(['X', 'Y', 'Z'] as const).map((axis) => {
                      const key = `size${axis}` as 'sizeX' | 'sizeY' | 'sizeZ'
                      const value = getShapeSizeValue(selectedShape, axis)
                      return (
                        <DraggableStepper
                          key={key}
                          label={axis}
                          value={value}
                          min={0}
                          max={COORDINATE_MAX - COORDINATE_MIN}
                          step={globalStepSize}
                          onChange={(nextValue) => updateShapeSize(selectedShape.id, axis, nextValue)}
                        />
                      )
                    })}
                  </div>
                </div>

                <div className="rounded border border-border bg-muted/70 p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pivot</span>
                    <label className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={showPivotPoint}
                        onChange={() => setShowPivotPoint((value) => !value)}
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
                        onChange={(value) => updateShapeAttribute(selectedShape.id, `pivot${axis}` as keyof CollisionShape, value)}
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
                        onChange={(value) => updateShapeAttribute(selectedShape.id, `rotation${axis}` as keyof CollisionShape, value)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Select or add a shape.</div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}