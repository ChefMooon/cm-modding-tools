import {
  type CollisionShape,
  type LocalStorageState,
  type MarkerColor,
  type MarkerColorSource,
  type RotationAxisValue,
  type VoxelProject,
  MAX_PROJECTS,
  MAX_SHAPES_PER_PROJECT,
  MARKER_COLORS,
  ROTATION_VALUES,
  STORAGE_KEY,
  STORAGE_VERSION,
} from '../types'

export interface CollisionBuilderBackupPayload {
  format: 'cm-modding-tools-collision-builder-backup'
  version: string
  exportedAt: string
  activeProjectId: string | null
  projects: VoxelProject[]
  state: LocalStorageState
}

function normalizeRotation(value: unknown): RotationAxisValue {
  return ROTATION_VALUES.includes(value as RotationAxisValue) ? value as RotationAxisValue : 0
}

function resolveMarkerColorState(overrides: Partial<CollisionShape> = {}) {
  const hasExplicitColor = typeof overrides.markerColor === 'string' && MARKER_COLORS.includes(overrides.markerColor as MarkerColor)
  const markerColor = hasExplicitColor ? overrides.markerColor as MarkerColor : getRandomMarkerColor()
  const markerColorSource: MarkerColorSource = overrides.markerColorSource === 'selected' || overrides.markerColorSource === 'random'
    ? overrides.markerColorSource
    : hasExplicitColor ? 'selected' : 'random'

  return { markerColor, markerColorSource }
}

export function createShape(overrides: Partial<CollisionShape> = {}): CollisionShape {
  const { markerColor, markerColorSource } = resolveMarkerColorState(overrides)

  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'shape_1',
    visible: overrides.visible ?? true,
    markerColor,
    markerColorSource,
    minX: overrides.minX ?? 4,
    minY: overrides.minY ?? 2,
    minZ: overrides.minZ ?? 4,
    maxX: overrides.maxX ?? 12,
    maxY: overrides.maxY ?? 10,
    maxZ: overrides.maxZ ?? 12,
    pivotX: overrides.pivotX ?? 0,
    pivotY: overrides.pivotY ?? 0,
    pivotZ: overrides.pivotZ ?? 0,
    rotationX: overrides.rotationX ?? 0,
    rotationY: overrides.rotationY ?? 0,
    rotationZ: overrides.rotationZ ?? 0,
  }
}

export function createProject(overrides: Partial<VoxelProject> = {}): VoxelProject {
  const now = Date.now()

  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'Untitled Project',
    createdAt: overrides.createdAt ?? now,
    lastModified: overrides.lastModified ?? now,
    shapes: overrides.shapes ?? [],
  }
}

export function createDefaultState(): LocalStorageState {
  const defaultProject = createProject({ name: 'Untitled Project', shapes: [] })

  return {
    version: STORAGE_VERSION,
    activeProjectId: defaultProject.id,
    projects: [defaultProject],
  }
}

export function getRandomMarkerColor(): MarkerColor {
  const index = Math.floor(Math.random() * MARKER_COLORS.length)
  return MARKER_COLORS[index]
}

export function getStorageUsage(projects: VoxelProject[]) {
  return {
    projectCount: projects.length,
    shapeCount: projects.reduce((total, project) => total + project.shapes.length, 0),
  }
}

export function validateImportPayload(projects: VoxelProject[], incomingProjectCount: number, incomingShapeCount: number) {
  const currentUsage = getStorageUsage(projects)
  const nextProjectCount = currentUsage.projectCount + incomingProjectCount
  const nextShapeCount = currentUsage.shapeCount + incomingShapeCount

  if (nextProjectCount > MAX_PROJECTS || nextShapeCount > MAX_PROJECTS * MAX_SHAPES_PER_PROJECT) {
    return {
      ok: false,
      message: 'Import aborted: This operation would exceed your maximum storage limit of 50 projects or 50 shapes per project.',
    }
  }

  return { ok: true }
}

export function validateProjectShapes(shapes: CollisionShape[]) {
  if (shapes.length > MAX_SHAPES_PER_PROJECT) {
    return {
      ok: false,
      message: 'Import aborted: This operation would exceed your maximum storage limit of 50 projects or 50 shapes per project.',
    }
  }

  return { ok: true }
}

export function readStoredState(): LocalStorageState {
  if (typeof window === 'undefined') {
    return createDefaultState()
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY)
    if (!rawValue) {
      return createDefaultState()
    }

    const parsed = JSON.parse(rawValue) as Partial<LocalStorageState>
    const projects = Array.isArray(parsed.projects) ? parsed.projects.filter((project): project is VoxelProject => Boolean(project?.id)) : []

    if (projects.length === 0) {
      return createDefaultState()
    }

    return {
      version: parsed.version ?? STORAGE_VERSION,
      activeProjectId: typeof parsed.activeProjectId === 'string' ? parsed.activeProjectId : projects[0]?.id ?? null,
      projects: projects.map((project) => ({
        ...createProject(project),
        shapes: Array.isArray(project.shapes)
          ? project.shapes.map((shape) => {
              const { markerColor, markerColorSource } = resolveMarkerColorState(shape)

              return {
                ...createShape(shape),
                markerColor,
                markerColorSource,
                pivotX: typeof shape.pivotX === 'number' ? shape.pivotX : 0,
                pivotY: typeof shape.pivotY === 'number' ? shape.pivotY : 0,
                pivotZ: typeof shape.pivotZ === 'number' ? shape.pivotZ : 0,
                rotationX: normalizeRotation(shape.rotationX),
                rotationY: normalizeRotation(shape.rotationY),
                rotationZ: normalizeRotation(shape.rotationZ),
              }
            })
          : [],
      })),
    }
  } catch {
    return createDefaultState()
  }
}

export function writeStoredState(state: LocalStorageState) {
  if (typeof window === 'undefined') {
    return state
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore localStorage write failures.
  }

  return state
}

export function createBackupPayload(state: LocalStorageState): CollisionBuilderBackupPayload {
  const normalizedState = normalizeState(state)

  return {
    format: 'cm-modding-tools-collision-builder-backup',
    version: STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    activeProjectId: normalizedState.activeProjectId,
    projects: normalizedState.projects,
    state: normalizedState,
  }
}

export function parseBackupPayload(value: unknown): LocalStorageState | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const candidate = value as Partial<CollisionBuilderBackupPayload> & Partial<LocalStorageState>
  const backupState = candidate.format === 'cm-modding-tools-collision-builder-backup' && candidate.state
    ? candidate.state
    : candidate

  const projects = Array.isArray(candidate.projects)
    ? candidate.projects
    : Array.isArray(backupState?.projects)
      ? backupState.projects
      : []

  if (projects.length === 0) {
    return null
  }

  return normalizeState({
    version: typeof backupState.version === 'string' ? backupState.version : STORAGE_VERSION,
    activeProjectId: typeof candidate.activeProjectId === 'string'
      ? candidate.activeProjectId
      : typeof backupState.activeProjectId === 'string'
        ? backupState.activeProjectId
        : null,
    projects: projects.filter((project): project is VoxelProject => Boolean(project?.id && project?.name)),
  })
}

export function downloadBackup(state: LocalStorageState) {
  const payload = createBackupPayload(state)
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `collision-builder-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function getProjectById(state: LocalStorageState, projectId: string | null) {
  if (!projectId) {
    return state.projects[0] ?? null
  }

  return state.projects.find((project) => project.id === projectId) ?? state.projects[0] ?? null
}

export function resolveActiveProjectId(state: LocalStorageState, requestedProjectId: string | null = null) {
  const normalizedState = normalizeState(state)

  if (normalizedState.projects.length === 0) {
    return createDefaultState().activeProjectId
  }

  if (requestedProjectId && normalizedState.projects.some((project) => project.id === requestedProjectId)) {
    return requestedProjectId
  }

  const mostRecentlyModifiedProject = [...normalizedState.projects].sort((left, right) => right.lastModified - left.lastModified)[0]
  return mostRecentlyModifiedProject?.id ?? normalizedState.projects[0]?.id ?? null
}

export function normalizeState(state: LocalStorageState): LocalStorageState {
  const validProjects = state.projects.filter((project) => project.id && project.name)

  if (validProjects.length === 0) {
    const defaultState = createDefaultState()
    return {
      ...defaultState,
      version: STORAGE_VERSION,
    }
  }

  const activeProjectId = validProjects.some((project) => project.id === state.activeProjectId)
    ? state.activeProjectId
    : validProjects[0]?.id ?? null

  return {
    version: STORAGE_VERSION,
    activeProjectId,
    projects: validProjects.map((project, index) => ({
      ...project,
      shapes: project.shapes.map((shape) => {
        const { markerColor, markerColorSource } = resolveMarkerColorState(shape)

        return {
          ...shape,
          markerColor,
          markerColorSource,
          pivotX: typeof shape.pivotX === 'number' ? shape.pivotX : 0,
          pivotY: typeof shape.pivotY === 'number' ? shape.pivotY : 0,
          pivotZ: typeof shape.pivotZ === 'number' ? shape.pivotZ : 0,
          rotationX: normalizeRotation(shape.rotationX),
          rotationY: normalizeRotation(shape.rotationY),
          rotationZ: normalizeRotation(shape.rotationZ),
        }
      }),
      name: project.name || `Project ${index + 1}`,
    })),
  }
}
