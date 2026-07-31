import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { FileJson2, Redo2, Undo2 } from 'lucide-react'
import { ConfirmationDialog } from '../components/ui/confirmation-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip'
import { CollisionViewport } from '../feature/collision-box-builder/components/CollisionViewport'
import { DragDropImportOverlay } from '../feature/collision-box-builder/components/DragDropImportOverlay'
import { JavaCodeGenerator } from '../feature/collision-box-builder/components/JavaCodeGenerator'
import { JSONImport, type ImportPayload } from '../feature/collision-box-builder/components/JSONImport'
import { ProjectContextCard } from '../feature/collision-box-builder/components/ProjectContextCard'
import { ProjectManagement } from '../feature/collision-box-builder/components/ProjectManagement'
import { ShapePropertiesPanel } from '../feature/collision-box-builder/components/ShapePropertiesPanel'
import { ShapesListSidebar } from '../feature/collision-box-builder/components/ShapesListSidebar'
import { StorageSafetyBadge } from '../feature/collision-box-builder/components/StorageSafetyBadge'
import { useCollisionBuilderState } from '../feature/collision-box-builder/hook/useCollisionBuilderState'
import type { PreviewDirection } from '../feature/collision-box-builder/components/ViewportToolbar'
import { collectFilesFromItems } from '../feature/collision-box-builder/lib/importFileUtils'
import { getEffectiveStepValue } from '../feature/collision-box-builder/lib/stepUtils'
import type { MoveAxis } from '../feature/collision-box-builder/types/types'
import { MAX_PROJECTS, MAX_SHAPES_PER_PROJECT } from '../feature/collision-box-builder/types/types'

type ConfirmationVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'

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
  const [showImportModal, setShowImportModal] = useState(false)
  const [showProjectManagementModal, setShowProjectManagementModal] = useState(false)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [showPivotPoint, setShowPivotPoint] = useState(false)
  const [moveAxis, setMoveAxis] = useState<MoveAxis>('X')
  const [globalStepSize, setGlobalStepSize] = useState<number>(1)
  const [activePreviewDirection, setActivePreviewDirection] = useState<PreviewDirection>('NORTH')
  const [isViewportToolbarOpen, setIsViewportToolbarOpen] = useState(false)
  const [confirmationState, setConfirmationState] = useState<ConfirmationState | null>(null)
  const [isDraggingActive, setIsDraggingActive] = useState(false)
  const [queuedImportFiles, setQueuedImportFiles] = useState<File[]>([])
  const dragCounterRef = useRef(0)

  const {
    activeProject,
    shapes,
    effectiveActiveProjectId,
    selectedShape,
    selectedShapeId,
    setSelectedShapeId,
    copiedShape,
    setCopiedShape,
    statusMessage,
    setStatusMessage,
    storageState,
    storageUsage,
    history,
    redoStack,
    addNewShape,
    duplicateSelectedShape,
    removeShape,
    toggleVisibility,
    resetSelectedShape,
    updateShapeAttribute,
    updateShapeSize,
    moveShapeByDelta,
    handleUndo,
    handleRedo,
    clearCurrentProjectShapes,
    createNewProject,
    switchProject,
    deleteProject,
    renameProject,
    exportBackup,
    clearStorage,
    handleImport,
    copyShapeDimensions,
    copyToClipboard,
    pasteCopiedShape,
  } = useCollisionBuilderState()

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

  const getEffectiveStep = useCallback((event?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }) => {
    return getEffectiveStepValue(globalStepSize, event)
  }, [globalStepSize])

  const nudgeSelectedShape = useCallback((axis: MoveAxis, direction: -1 | 1, event?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }) => {
    if (!selectedShape) return
    moveShapeByDelta(selectedShape.id, axis, direction * getEffectiveStep(event))
  }, [getEffectiveStep, moveShapeByDelta, selectedShape])

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

  const openConfirmation = (nextState: ConfirmationState) => {
    setConfirmationState(nextState)
  }

  const closeConfirmation = () => {
    setConfirmationState(null)
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
          pasteCopiedShape()
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
  }, [activeProject, addNewShape, copiedShape, duplicateSelectedShape, handleRedo, handleUndo, isDraggingActive, moveAxis, moveShapeByDelta, nudgeSelectedShape, pasteCopiedShape, removeShape, resetSelectedShape, selectedShape, selectedShapeId, setCopiedShape, setSelectedShapeId, shapes, toggleVisibility])

  return (
    <TooltipProvider delayDuration={150}>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <button disabled={history.length === 0} onClick={handleUndo} aria-label="Undo last action" className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30 cursor-pointer">
                    <Undo2 size={15} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Undo last action</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button disabled={redoStack.length === 0} onClick={handleRedo} aria-label="Redo last action" className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30 cursor-pointer">
                    <Redo2 size={15} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Redo last action</TooltipContent>
              </Tooltip>
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

        {showImportModal ? (
          <JSONImport
            isOpen={showImportModal}
            onClose={() => { setShowImportModal(false); setQueuedImportFiles([]) }}
            onImport={handleImport as (payload: ImportPayload) => void}
            existingProjects={storageState.projects.map((project) => ({ id: project.id, name: project.name, createdAt: project.createdAt, lastModified: project.lastModified }))}
            importFiles={queuedImportFiles.length > 0 ? queuedImportFiles : null}
          />
        ) : null}

        {showProjectManagementModal ? (
          <ProjectManagement
            isOpen={showProjectManagementModal}
            onClose={() => setShowProjectManagementModal(false)}
            projects={storageState.projects}
            activeProjectId={effectiveActiveProjectId}
            onSelectProject={switchProject}
            onCreateProject={createNewProject}
            onDeleteProject={(projectId) => requestDeleteProject(projectId)}
            onRenameProject={renameProject}
            onExportBackup={exportBackup}
            onClearAllProjects={() => {
              setShowProjectManagementModal(false)
              requestClearStorage()
            }}
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
                selectedBoxId={selectedShape?.id ?? ''}
                moveAxis={moveAxis}
                moveStep={globalStepSize}
                showPivotPoint={showPivotPoint}
                activePreviewDirection={activePreviewDirection}
                isViewportToolbarOpen={isViewportToolbarOpen}
                onSelectBox={setSelectedShapeId}
                onMoveAxisChange={setMoveAxis}
                onMoveStepChange={setGlobalStepSize}
                onMoveBox={moveShapeByDelta}
                onPreviewDirectionChange={setActivePreviewDirection}
                onViewportToolbarToggle={() => setIsViewportToolbarOpen((value) => !value)}
              />
            </div>

            <JavaCodeGenerator shapes={shapes} copyToClipboard={copyToClipboard} />
          </div>

          <div className="relative z-0 min-w-0 space-y-2 lg:w-[320px] lg:flex-none lg:sticky lg:top-4 lg:self-start">
            <ProjectContextCard
              activeProjectId={effectiveActiveProjectId}
              projects={storageState.projects}
              onProjectChange={switchProject}
              onCreateProject={createNewProject}
              onDeleteProject={() => activeProject && requestDeleteProject(activeProject.id)}
              onOpenProjectManagement={() => setShowProjectManagementModal(true)}
            />

            <ShapesListSidebar
              shapes={shapes}
              selectedShapeId={selectedShapeId}
              onSelectShape={setSelectedShapeId}
              onAddShape={addNewShape}
              onClearShapes={requestClearCurrentProjectShapes}
              onRemoveShape={removeShape}
              onToggleVisibility={toggleVisibility}
              onCopyShapeDimensions={copyShapeDimensions}
            />

            <ShapePropertiesPanel
              selectedShape={selectedShape}
              globalStepSize={globalStepSize}
              showPivotPoint={showPivotPoint}
              onTogglePivotPoint={() => setShowPivotPoint((value) => !value)}
              onUpdateAttribute={updateShapeAttribute}
              onUpdateShapeSize={updateShapeSize}
              onResetShape={resetSelectedShape}
            />
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  )
}
