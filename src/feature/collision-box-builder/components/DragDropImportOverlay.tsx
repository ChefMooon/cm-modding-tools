import { FolderOpen, UploadCloud } from 'lucide-react'

export function DragDropImportOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-md">
      <div className="pointer-events-none flex w-full max-w-2xl flex-col items-center justify-center rounded-2xl border border-primary/30 bg-card/80 px-8 py-12 text-center shadow-2xl">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UploadCloud className="h-8 w-8 animate-bounce" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Drop your Modding Files Here</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">Supports individual Voxel Shape JSON files or complete project backup folders.</p>
        <div className="mt-6 flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
          <FolderOpen className="h-3.5 w-3.5" />
          <span>The import dialog will open automatically.</span>
        </div>
      </div>
    </div>
  )
}
