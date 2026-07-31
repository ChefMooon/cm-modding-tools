import { useEffect, useMemo, useState } from 'react'
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
} from '../lib/persistence'
import type { CollisionBox, CollisionShape, MarkerColor, MoveAxis, RotationAxisValue, VoxelProject } from '../types/types'
import { COORDINATE_MAX, COORDINATE_MIN, MARKER_COLORS, MAX_PROJECTS, MAX_SHAPES_PER_PROJECT, ROTATION_VALUES } from '../types/types'

type NumericCoordKey = 'minX' | 'minY' | 'minZ' | 'maxX' | 'maxY' | 'maxZ';

export function useCollisionBuilderState() {
  const getRequestedProjectId = () => {
    if (typeof window === 'undefined') {
      return null
    }

    return new URLSearchParams(window.location.search).get('project')
  }

  const [storageState, setStorageState] = useState(() => {
    const state = normalizeState(readStoredState())
    return {
      ...state,
      activeProjectId: resolveActiveProjectId(state, getRequestedProjectId()),
    }
  })
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => resolveActiveProjectId(readStoredState(), getRequestedProjectId()))
  const [selectedShapeId, setSelectedShapeId] = useState<string>('')
  const [copiedShape, setCopiedShape] = useState<CollisionShape | null>(null)
  const [historyMap, setHistoryMap] = useState<Record<string, CollisionShape[][]>>({})
  const [redoMap, setRedoMap] = useState<Record<string, CollisionShape[][]>>({})
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

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
    writeStoredState(normalizeState(storageState))
  }, [storageState])

  useEffect(() => {
    if (!statusMessage) {
      return
    }

    const timer = window.setTimeout(() => setStatusMessage(null), 4000)
    return () => window.clearTimeout(timer)
  }, [statusMessage])

  const clampCoordValue = (value: number) => clampCollisionCoordinate(value)
  const clampPivotValue = (value: number) => Math.max(-8, Math.min(8, Number(value.toFixed(2))))

  const formatShapeDimensions = (shape: CollisionBox) => [shape.minX, shape.minY, shape.minZ, shape.maxX, shape.maxY, shape.maxZ].join(', ')

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

  const pasteCopiedShape = () => {
    if (!activeProject || !copiedShape) return

    saveHistoryState(activeProject.id, activeProject.shapes)
    const pastedShape: CollisionShape = {
      ...copiedShape,
      id: crypto.randomUUID(),
      name: `${copiedShape.name || 'unnamed'}_copy`,
    }

    updateProject(activeProject.id, (project) => ({ ...project, shapes: [...project.shapes, pastedShape] }))
    setSelectedShapeId(pastedShape.id)
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

  const handleImport = (payload: { projects: Array<{ importTarget: 'current-project' | 'new-projects'; existingProjectId?: string; conflictAction?: 'skip' | 'overwrite' | 'create'; name: string; shapes: CollisionShape[] }> }) => {
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
  }

  const projectConflictsToProjects = (existingProjects: VoxelProject[], incomingProjects: VoxelProject[], importPayloads: Array<{ existingProjectId?: string; conflictAction?: 'skip' | 'overwrite' | 'create' }>) => {
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
    const isDeletingActiveProject = effectiveActiveProjectId === projectId
    const nextActiveProjectId = isDeletingActiveProject ? (remainingProjects[0]?.id ?? null) : effectiveActiveProjectId
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

  return {
    storageState,
    activeProjectId,
    effectiveActiveProjectId,
    activeProject,
    shapes,
    selectedShapeId,
    effectiveSelectedShapeId,
    selectedShape,
    setSelectedShapeId,
    copiedShape,
    setCopiedShape,
    history,
    redoStack,
    statusMessage,
    setStatusMessage,
    storageUsage,
    addNewShape,
    duplicateSelectedShape,
    removeShape,
    toggleVisibility,
    resetSelectedShape,
    getShapeSizeValue,
    updateShapeSize,
    updateShapeAttribute,
    moveShapeByDelta,
    handleUndo,
    handleRedo,
    clearCurrentProjectShapes,
    pasteCopiedShape,
    createNewProject,
    switchProject,
    deleteProject,
    renameProject,
    exportBackup,
    clearStorage,
    handleImport,
    copyShapeDimensions,
    copyToClipboard,
  }
}
