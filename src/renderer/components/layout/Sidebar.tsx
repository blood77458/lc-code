import { useRef, useCallback } from 'react'
import { useWorkspaceStore, useUIStore } from '@renderer/stores'
import { FileTree } from '@renderer/components/file-tree/FileTree'
import { AgentPanel } from '@renderer/components/agent/AgentPanel'
import { SettingsPanel } from '@renderer/components/settings/SettingsPanel'

const MIN_SIDEBAR_WIDTH = 200
const MAX_SIDEBAR_WIDTH = 900

export function Sidebar() {
  const { sidebarView } = useWorkspaceStore()
  const { sidebarWidth, setSidebarWidth } = useUIStore()
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragging.current = true
      startX.current = e.clientX
      startWidth.current = sidebarWidth

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return
        const delta = ev.clientX - startX.current
        const maxWidth = Math.min(MAX_SIDEBAR_WIDTH, window.innerWidth * 0.6)
        const newWidth = Math.max(
          MIN_SIDEBAR_WIDTH,
          Math.min(maxWidth, startWidth.current + delta)
        )
        setSidebarWidth(newWidth)
      }

      const onMouseUp = () => {
        dragging.current = false
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [sidebarWidth, setSidebarWidth]
  )

  return (
    <div
      className="relative flex h-full min-h-0 shrink-0 flex-col border-r border-border bg-sidebar"
      style={{ width: sidebarWidth }}
    >
      {sidebarView === 'explorer' && <FileTree />}
      {sidebarView === 'agent' && <AgentPanel />}
      {sidebarView === 'settings' && <SettingsPanel />}

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        className="absolute -right-0.5 top-0 z-10 h-full w-1.5 cursor-col-resize hover:bg-accent/60 active:bg-accent"
        onMouseDown={onResizeMouseDown}
      />
    </div>
  )
}
