import { useState } from 'react'
import { Check, ChevronDown, ChevronRight, FileCode, X } from 'lucide-react'
import type { AgentCodeChange } from '@shared/agent-tool-display'
import {
  buildEditDiffLines,
  buildWriteDiffLines,
  getCodeChangeLabel
} from '@shared/agent-tool-display'
import { getFileName, getLanguageFromPath, cn } from '@renderer/lib/utils'
import { useEditorStore } from '@renderer/stores'

const MAX_VISIBLE_LINES = 24

interface CodeChangeBlockProps {
  change: AgentCodeChange
}

function DiffView({ lines }: { lines: ReturnType<typeof buildEditDiffLines> }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? lines : lines.slice(0, MAX_VISIBLE_LINES)
  const hiddenCount = lines.length - visible.length

  if (lines.length === 0) {
    return <div className="px-3 py-2 text-xs text-muted">No diff content</div>
  }

  return (
    <div>
      <pre className="overflow-auto text-xs leading-5">
        {visible.map((line, index) => (
          <div
            key={index}
            className={cn(
              'px-3 font-mono',
              line.type === 'remove' && 'bg-red-500/10 text-red-300',
              line.type === 'add' && 'bg-green-500/10 text-green-300'
            )}
          >
            <span className="mr-2 inline-block w-3 select-none opacity-70">
              {line.type === 'remove' ? '-' : '+'}
            </span>
            {line.content || ' '}
          </div>
        ))}
      </pre>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-center gap-1 border-t border-border px-3 py-1.5 text-xs text-muted hover:bg-hover hover:text-foreground"
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {expanded ? 'Show less' : `Show ${hiddenCount} more lines`}
        </button>
      )}
    </div>
  )
}

export function CodeChangeBlock({ change }: CodeChangeBlockProps) {
  const { openFile } = useEditorStore()
  const [collapsed, setCollapsed] = useState(false)

  const fileName = getFileName(change.path)
  const diffLines =
    change.tool === 'apply_edit'
      ? buildEditDiffLines(change.oldText ?? '', change.newText ?? '')
      : change.tool === 'write_file'
        ? buildWriteDiffLines(change.newText ?? '')
        : []

  const handleOpenFile = async () => {
    if (change.tool === 'delete_file') return
    try {
      const path =
        change.tool === 'move_file' ? change.toPath ?? change.path : change.path
      const content = await window.api.readFile(path)
      openFile(path, content, getLanguageFromPath(path))
    } catch (err) {
      console.error('Failed to open file from code change block:', err)
    }
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border bg-background/80',
        change.success ? 'border-border' : 'border-red-500/40'
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-panel/80 px-3 py-2">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="rounded p-0.5 text-muted hover:bg-hover hover:text-foreground"
          aria-label={collapsed ? 'Expand change' : 'Collapse change'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        <FileCode size={14} className="shrink-0 text-accent" />
        <button
          type="button"
          onClick={handleOpenFile}
          disabled={change.tool === 'delete_file'}
          className="min-w-0 flex-1 truncate text-left text-xs hover:underline disabled:cursor-default disabled:no-underline"
          title={change.path}
        >
          <span className="font-medium text-foreground">{fileName}</span>
          {change.path !== fileName && (
            <span className="ml-1 text-muted">{change.path}</span>
          )}
        </button>
        <span className="shrink-0 rounded bg-hover px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">
          {getCodeChangeLabel(change.tool)}
        </span>
        {change.success ? (
          <Check size={14} className="shrink-0 text-green-400" />
        ) : (
          <X size={14} className="shrink-0 text-red-400" />
        )}
      </div>

      {!collapsed && (
        <div>
          {change.tool === 'move_file' && (
            <div className="space-y-1 border-b border-border px-3 py-2 text-xs text-muted">
              <div>
                <span className="text-foreground/70">From:</span> {change.fromPath}
              </div>
              <div>
                <span className="text-foreground/70">To:</span> {change.toPath}
              </div>
            </div>
          )}

          {change.tool === 'delete_file' && (
            <div className="px-3 py-2 text-xs text-red-300">{change.message}</div>
          )}

          {(change.tool === 'apply_edit' || change.tool === 'write_file') && (
            <DiffView lines={diffLines} />
          )}

          {!change.success && (
            <div className="border-t border-border px-3 py-2 text-xs text-red-300">
              {change.message}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
