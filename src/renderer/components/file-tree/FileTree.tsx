import { useEffect, useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  RefreshCw
} from 'lucide-react'
import { cn, getLanguageFromPath, getFileName } from '@renderer/lib/utils'
import { updateMonacoModel } from '@renderer/lib/monaco-workspace'
import { FileTypeIcon } from '@renderer/components/file-tree/FileTypeIcon'
import { useWorkspaceStore, useEditorStore, useFileTreeStore } from '@renderer/stores'
import type { FileEntry } from '@shared/types'

interface TreeNodeProps {
  entry: FileEntry
  depth: number
  refreshKey: number
}

function TreeNode({ entry, depth, refreshKey }: TreeNodeProps) {
  const { expandedDirs, toggleDir } = useFileTreeStore()
  const { openFile } = useEditorStore()
  const [children, setChildren] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)
  const isExpanded = expandedDirs.has(entry.path)

  useEffect(() => {
    if (entry.isDirectory && isExpanded) {
      setLoading(true)
      window.api
        .readDir(entry.path)
        .then(setChildren)
        .catch(console.error)
        .finally(() => setLoading(false))
    } else if (!isExpanded) {
      setChildren([])
    }
  }, [entry.path, entry.isDirectory, isExpanded, refreshKey])

  const handleClick = async () => {
    if (entry.isDirectory) {
      toggleDir(entry.path)
    } else {
      try {
        const content = await window.api.readFile(entry.path)
        const language = getLanguageFromPath(entry.path)
        openFile(entry.path, content, language)
        updateMonacoModel(entry.path, content, language)
      } catch (err) {
        console.error('Failed to open file:', err)
      }
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'flex w-full items-center gap-1 rounded-sm px-1 py-0.5 text-left text-sm hover:bg-hover',
          'text-foreground'
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {entry.isDirectory ? (
          isExpanded ? (
            <ChevronDown size={14} className="shrink-0 text-muted" />
          ) : (
            <ChevronRight size={14} className="shrink-0 text-muted" />
          )
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        {entry.isDirectory ? (
          isExpanded ? (
            <FolderOpen size={14} className="shrink-0 text-accent" />
          ) : (
            <Folder size={14} className="shrink-0 text-accent" />
          )
        ) : (
          <FileTypeIcon name={entry.name} />
        )}
        <span className="truncate">{entry.name}</span>
        {loading && <span className="ml-auto text-xs text-muted">...</span>}
      </button>
      {entry.isDirectory && isExpanded && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              refreshKey={refreshKey}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree() {
  const { workspacePath } = useWorkspaceStore()
  const { expandDir } = useFileTreeStore()
  const [refreshKey, setRefreshKey] = useState(0)

  const rootEntry: FileEntry | null = workspacePath
    ? {
        name: getFileName(workspacePath),
        path: workspacePath,
        isDirectory: true
      }
    : null

  useEffect(() => {
    if (workspacePath) {
      expandDir(workspacePath)
    }
  }, [workspacePath, expandDir])

  useEffect(() => {
    const unsubscribe = window.api.onFileChange(() => {
      setRefreshKey((k) => k + 1)
    })
    return unsubscribe
  }, [workspacePath])

  if (!workspacePath || !rootEntry) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4 text-center text-sm text-muted">
        <p>No folder opened</p>
        <p className="mt-1 text-xs">Use File → Open Folder</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Explorer
        </span>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="rounded p-1 text-muted hover:bg-hover hover:text-foreground"
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-1 py-1">
        <TreeNode entry={rootEntry} depth={0} refreshKey={refreshKey} />
      </div>
    </div>
  )
}
