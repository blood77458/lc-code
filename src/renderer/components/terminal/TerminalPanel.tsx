import { useEffect, useRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useWorkspaceStore, useUIStore } from '@renderer/stores'

export function TerminalPanel() {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const terminalIdRef = useRef<string | null>(null)
  const { workspacePath } = useWorkspaceStore()
  const { config } = useUIStore()

  const initTerminal = useCallback(async () => {
    if (!terminalRef.current || xtermRef.current) return

    const xterm = new Terminal({
      fontFamily: config.fontFamily,
      fontSize: config.terminalFontSize,
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        selectionBackground: '#264f78'
      },
      cursorBlink: true,
      scrollback: 5000
    })

    const fitAddon = new FitAddon()
    xterm.loadAddon(fitAddon)
    xterm.open(terminalRef.current)
    fitAddon.fit()

    const cwd = workspacePath ?? 'C:\\'
    const id = await window.api.createTerminal(cwd)
    terminalIdRef.current = id

    xterm.onData((data) => {
      if (terminalIdRef.current) {
        window.api.writeTerminal(terminalIdRef.current, data)
      }
    })

    const unsubscribe = window.api.onTerminalData((termId, data) => {
      if (termId === terminalIdRef.current) {
        xterm.write(data)
      }
    })

    xtermRef.current = xterm
    fitAddonRef.current = fitAddon

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
      if (terminalIdRef.current) {
        window.api.resizeTerminal(
          terminalIdRef.current,
          xterm.cols,
          xterm.rows
        )
      }
    })
    resizeObserver.observe(terminalRef.current)

    return () => {
      unsubscribe()
      resizeObserver.disconnect()
      if (terminalIdRef.current) {
        window.api.destroyTerminal(terminalIdRef.current)
      }
      xterm.dispose()
      xtermRef.current = null
      fitAddonRef.current = null
      terminalIdRef.current = null
    }
  }, [workspacePath, config.fontFamily, config.terminalFontSize])

  useEffect(() => {
    let cleanup: (() => void) | undefined
    initTerminal().then((fn) => {
      cleanup = fn
    })
    return () => cleanup?.()
  }, [initTerminal])

  return <div ref={terminalRef} className="h-full w-full" />
}
