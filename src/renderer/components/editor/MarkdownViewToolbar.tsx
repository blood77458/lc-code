import { Columns2, Eye, FileCode2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { MarkdownViewMode } from '@renderer/stores'

interface MarkdownViewToolbarProps {
  mode: MarkdownViewMode
  onChange: (mode: MarkdownViewMode) => void
}

const MODES: Array<{ id: MarkdownViewMode; label: string; icon: typeof FileCode2 }> = [
  { id: 'edit', label: 'Edit', icon: FileCode2 },
  { id: 'split', label: 'Split', icon: Columns2 },
  { id: 'preview', label: 'Preview', icon: Eye }
]

export function MarkdownViewToolbar({ mode, onChange }: MarkdownViewToolbarProps) {
  return (
    <div className="flex h-8 shrink-0 items-center justify-end gap-1 border-b border-border bg-panel/60 px-2">
      {MODES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          title={label}
          onClick={() => onChange(id)}
          className={cn(
            'flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors',
            mode === id
              ? 'bg-hover text-foreground'
              : 'text-muted hover:bg-hover hover:text-foreground'
          )}
        >
          <Icon size={13} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
