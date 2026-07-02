import { useRef, useCallback, useEffect } from 'react'
import { MonacoEditor } from '@renderer/components/editor/MonacoEditor'
import { MarkdownPreview } from '@renderer/components/editor/MarkdownPreview'
import { MarkdownViewToolbar } from '@renderer/components/editor/MarkdownViewToolbar'
import { isMarkdownFile } from '@renderer/lib/utils'
import { useEditorStore, type EditorTab } from '@renderer/stores'

interface EditorPaneProps {
  tab: EditorTab
}

export function EditorPane({ tab }: EditorPaneProps) {
  const { setMarkdownView } = useEditorStore()
  const isMarkdown = isMarkdownFile(tab.path, tab.language)
  const mode = tab.markdownView ?? 'edit'
  const splitRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    const container = splitRef.current
    if (!container) return

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current || !container) return
      const rect = container.getBoundingClientRect()
      const ratio = Math.max(0.2, Math.min(0.8, (ev.clientX - rect.left) / rect.width))
      container.style.setProperty('--editor-split', `${ratio * 100}%`)
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
  }, [])

  useEffect(() => {
    if (splitRef.current) {
      splitRef.current.style.setProperty('--editor-split', '50%')
    }
  }, [tab.id, mode])

  if (!isMarkdown) {
    return <MonacoEditor tab={tab} />
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <MarkdownViewToolbar mode={mode} onChange={(view) => setMarkdownView(tab.id, view)} />

      {mode === 'edit' && (
        <div className="min-h-0 flex-1 overflow-hidden">
          <MonacoEditor tab={tab} />
        </div>
      )}

      {mode === 'preview' && <MarkdownPreview content={tab.content} />}

      {mode === 'split' && (
        <div
          ref={splitRef}
          className="grid min-h-0 flex-1 overflow-hidden"
          style={{ gridTemplateColumns: 'var(--editor-split, 50%) 4px 1fr' }}
        >
          <div className="min-h-0 overflow-hidden border-r border-border">
            <MonacoEditor tab={tab} />
          </div>
          <div
            role="separator"
            aria-orientation="vertical"
            className="cursor-col-resize bg-border hover:bg-accent/60 active:bg-accent"
            onMouseDown={onResizeMouseDown}
          />
          <MarkdownPreview content={tab.content} />
        </div>
      )}
    </div>
  )
}
