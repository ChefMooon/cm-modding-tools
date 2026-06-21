import { AlertTriangle, Download, RotateCcw, ShieldCheck } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover'

interface StorageSafetyBadgeProps {
  onExportBackup: () => void
  onClearStorage: () => void
}

export function StorageSafetyBadge({ onExportBackup, onClearStorage }: StorageSafetyBadgeProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-500/20 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          Local Storage Only
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 rounded-lg border border-border/80 bg-card p-4 shadow-lg">
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
            <div>
              <h4 className="text-sm font-semibold text-foreground">Local storage workspace</h4>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Your projects live inside the browser&apos;s local sandbox. Clearing site data or switching browsers will remove them unless you export a backup first.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
            <div className="flex items-center gap-2 text-[11px] font-medium text-amber-700 dark:text-amber-400">
              <ShieldCheck size={12} />
              <span>Safe fallback: export a JSON snapshot before major cleanup.</span>
            </div>
            <button
              type="button"
              onClick={onExportBackup}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
            >
              <Download size={12} />
              Download JSON backup
            </button>
          </div>

          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-red-700 dark:text-red-400">
              <AlertTriangle size={12} />
              <span>Danger zone</span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              This permanently clears every saved project and shape from the browser&apos;s local storage. Use it only when you intend to start over.
            </p>
            <button
              type="button"
              onClick={onClearStorage}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-500/20 dark:text-red-300"
            >
              <RotateCcw size={12} />
              Clear all saved projects
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
