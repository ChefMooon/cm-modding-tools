import { FolderOpen, Plus, Settings2, Trash2 } from 'lucide-react'
import type { VoxelProject } from '../types'

interface ProjectContextCardProps {
  activeProjectId: string | null
  projects: VoxelProject[]
  onProjectChange: (projectId: string) => void
  onCreateProject: () => void
  onDeleteProject: () => void
  onOpenProjectManagement: () => void
}

export function ProjectContextCard({
  activeProjectId,
  projects,
  onProjectChange,
  onCreateProject,
  onDeleteProject,
  onOpenProjectManagement,
}: ProjectContextCardProps) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex w-full flex-col gap-3 p-3">
        <div className="flex items-center gap-2">
          <FolderOpen size={15} className="shrink-0 text-muted-foreground" />
          <label className="sr-only" htmlFor="project-switcher">Project</label>
          <select
            id="project-switcher"
            value={activeProjectId ?? ''}
            onChange={(event) => onProjectChange(event.target.value)}
            className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-xs outline-none transition hover:bg-accent/50"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={onCreateProject} className="flex h-10 items-center justify-center rounded-md border border-border bg-background text-foreground transition hover:bg-accent" aria-label="Create a new project">
            <Plus size={14} />
          </button>
          <button type="button" onClick={onDeleteProject} disabled={!activeProjectId} className="flex h-10 items-center justify-center rounded-md border border-border bg-background text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50" aria-label="Delete active project">
            <Trash2 size={14} />
          </button>
          <button type="button" onClick={onOpenProjectManagement} className="flex h-10 items-center justify-center rounded-md border border-border bg-background text-foreground transition hover:bg-accent" aria-label="Open project management">
            <Settings2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
