import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './button'

interface ConfirmationDialogProps {
  isOpen: boolean
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: React.ComponentProps<typeof Button>['variant']
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'destructive',
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-background/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="confirmation-dialog-title" onClick={onCancel}>
      <div className="flex min-h-screen items-center justify-center p-4" onClick={(event) => event.stopPropagation()}>
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-2">
              <h2 id="confirmation-dialog-title" className="text-base font-semibold text-foreground">{title}</h2>
              <div className="text-sm leading-6 text-muted-foreground">{description}</div>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button type="button" variant={confirmVariant} size="sm" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
