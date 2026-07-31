import { FolderOpen, Plus, Settings2, Trash2 } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui/tooltip'
import type { VoxelProject } from '../types/types'
import { ProjectSwitcherDropdown } from './ProjectSwitcherDropdown'

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
    <div className="relative z-20 isolate w-full overflow-visible rounded-xl border border-border bg-card">
      <div className="flex w-full flex-col gap-3 p-3">
        <div className="flex items-center gap-2">
          <FolderOpen size={15} className="shrink-0 text-muted-foreground" />
          <label className="sr-only" id="project-switcher-label">
            Project
          </label>
          <ProjectSwitcherDropdown
            activeProjectId={activeProjectId}
            projects={projects}
            onProjectChange={onProjectChange}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={onCreateProject} className="flex h-10 items-center justify-center rounded-md border border-border bg-background text-foreground transition hover:bg-accent" aria-label="Create a new project">
                <Plus size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Create new project</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={onDeleteProject} disabled={!activeProjectId} className="flex h-10 items-center justify-center rounded-md border border-border bg-background text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50" aria-label="Delete active project">
                <Trash2 size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Delete active project</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={onOpenProjectManagement} className="flex h-10 items-center justify-center rounded-md border border-border bg-background text-foreground transition hover:bg-accent" aria-label="Open project management">
                <Settings2 size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Open project management</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
