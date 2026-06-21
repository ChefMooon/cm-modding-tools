import { Download, Info, Plus, Trash2, X } from 'lucide-react'
import type { VoxelProject } from '../types/types'
import { MAX_PROJECTS, MAX_SHAPES_PER_PROJECT } from '../types/types'

interface ProjectManagementProps {
  isOpen: boolean
  onClose: () => void
  projects: VoxelProject[]
  activeProjectId: string | null
  onSelectProject: (projectId: string) => void
  onCreateProject: () => void
  onDeleteProject: (projectId: string) => void
  onRenameProject: (projectId: string, name: string) => void
  onExportBackup: () => void
}

function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString()
}

export function ProjectManagement({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onRenameProject,
  onExportBackup,
}: ProjectManagementProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-background/80 backdrop-blur-sm">
      <div className="flex min-h-screen items-center justify-center p-3">
        <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Project management</h2>
              <p className="text-sm text-muted-foreground">Review, rename, switch, and organize saved projects.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground" aria-label="Close project management">
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-muted/70 p-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Projects</p>
                <p className="text-sm font-semibold text-foreground">{projects.length}/{MAX_PROJECTS} saved</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={onCreateProject} className="flex items-center gap-1 rounded bg-foreground px-2.5 py-1.5 text-sm font-medium text-background transition hover:opacity-90">
                  <Plus size={14} /> New project
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {projects.length === 0 ? (
                <div className="rounded border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No projects yet. Create one to begin building collision shapes.
                </div>
              ) : (
                projects.map((project) => {
                  const isActive = project.id === activeProjectId

                  return (
                    <div key={project.id} className={`rounded-lg border p-3 ${isActive ? 'border-foreground bg-muted' : 'border-border bg-background'}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={project.name}
                              onChange={(event) => onRenameProject(project.id, event.target.value)}
                              className="w-full rounded border border-border bg-background px-2 py-1 text-sm font-medium text-foreground"
                            />
                            {isActive ? (
                              <span className="rounded bg-foreground/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground">Active</span>
                            ) : null}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>{project.shapes.length}/{MAX_SHAPES_PER_PROJECT} shapes</span>
                            <span>Created {formatTimestamp(project.createdAt)}</span>
                            <span>Updated {formatTimestamp(project.lastModified)}</span>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {project.shapes.length === 0
                              ? 'No shapes yet. Select this project to start adding geometry.'
                              : `Contains ${project.shapes.length} shape${project.shapes.length === 1 ? '' : 's'} ready for export.`}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
                          <button type="button" onClick={() => onSelectProject(project.id)} className="rounded border border-border bg-background px-2.5 py-1.5 text-sm font-medium text-foreground transition hover:bg-accent">
                            Open
                          </button>
                          <button type="button" onClick={() => onDeleteProject(project.id)} className="flex items-center justify-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-500/20">
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div className="mt-auto rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                <div className="flex items-start gap-2.5">
                  <Info size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-foreground">Local storage workspace</p>
                      <p className="text-[11px] leading-normal text-muted-foreground">
                        Browser cleanup, privacy resets, or switching devices can remove saved projects. Export a backup before making big changes.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onExportBackup}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground transition hover:bg-accent"
                    >
                      <Download size={12} />
                      Download JSON backup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
