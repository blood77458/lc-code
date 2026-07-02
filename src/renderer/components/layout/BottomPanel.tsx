import { useRef, useCallback } from 'react'
import { X, Terminal as TerminalIcon } from 'lucide-react'
import { useUIStore } from '@renderer/stores'
import { TerminalPanel } from '@renderer/components/terminal/TerminalPanel'

export function BottomPanel() {
  const { terminalVisible, terminalHeight, setTerminalHeight, toggleTerminal } =
    useUIStore()
  const dragging = useRef(false)
  const startY = useRef(0)
  const startHeight = useRef(0)

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true
      startY.current = e.clientY
      startHeight.current = terminalHeight

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return
        const delta = startY.current - ev.clientY
        const newHeight = Math.max(100, Math.min(600, startHeight.current + delta))
        setTerminalHeight(newHeight)
      }

      const onMouseUp = () => {
        dragging.current = false
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [terminalHeight, setTerminalHeight]
  )

  if (!terminalVisible) return null

  return (
    <div className="flex flex-col border-t border-border bg-panel" style={{ height: terminalHeight }}>
      <div
        className="h-1 cursor-row-resize bg-border hover:bg-accent transition-colors"
        onMouseDown={onMouseDown}
      />
      <div className="flex h-8 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2 text-xs text-foreground">
          <TerminalIcon size={14} />
          <span>Terminal</span>
        </div>
        <button
          onClick={toggleTerminal}
          className="rounded p-1 text-muted hover:bg-hover hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <TerminalPanel />
      </div>
    </div>
  )
}
