import { useCallback, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import '@renderer/lib/monaco-setup'
import { monaco } from '@renderer/lib/monaco-setup'
import { toFileUri, toFileUriString } from '@renderer/lib/monaco-uri'
import { updateMonacoModel } from '@renderer/lib/monaco-workspace'
import { useEditorStore, useUIStore } from '@renderer/stores'
import type { EditorTab } from '@renderer/stores'

interface MonacoEditorProps {
  tab: EditorTab
}

export function MonacoEditor({ tab }: MonacoEditorProps) {
  const { updateTabContent, markTabSaved, pendingReveal, clearPendingReveal } = useEditorStore()
  const { config } = useUIStore()
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const revealPending = useCallback(
    (editorInstance: editor.IStandaloneCodeEditor) => {
      const reveal = useEditorStore.getState().pendingReveal
      if (!reveal || reveal.tabId !== tab.id) return

      editorInstance.revealPositionInCenter({
        lineNumber: reveal.lineNumber,
        column: reveal.column
      })
      editorInstance.setPosition({
        lineNumber: reveal.lineNumber,
        column: reveal.column
      })
      editorInstance.focus()
      clearPendingReveal()
    },
    [tab.id, clearPendingReveal]
  )

  const handleSave = useCallback(async () => {
    const currentTab = useEditorStore.getState().tabs.find((t) => t.id === tab.id)
    if (!currentTab) return
    try {
      await window.api.writeFile(currentTab.path, currentTab.content)
      markTabSaved(tab.id)
    } catch (err) {
      console.error('Save failed:', err)
    }
  }, [tab.id, markTabSaved])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSave])

  const handleMount = (editorInstance: editor.IStandaloneCodeEditor) => {
    editorRef.current = editorInstance

    const uri = toFileUri(tab.path)
    let model = monaco.editor.getModel(uri)
    if (!model) {
      model = monaco.editor.createModel(tab.content, tab.language, uri)
    } else if (model.getValue() !== tab.content) {
      model.setValue(tab.content)
    }

    if (editorInstance.getModel()?.uri.toString() !== uri.toString()) {
      editorInstance.setModel(model)
    }

    editorInstance.addCommand(monaco.KeyCode.F12, () => {
      void editorInstance.getAction('editor.action.revealDefinition')?.run()
    })

    editorInstance.focus()
    revealPending(editorInstance)
  }

  useEffect(() => {
    if (editorRef.current) {
      revealPending(editorRef.current)
    }
  }, [pendingReveal, tab.id, revealPending])

  return (
    <div className="h-full w-full">
      <Editor
        key={tab.id}
        path={toFileUriString(tab.path)}
        keepCurrentModel
        height="100%"
        language={tab.language}
        value={tab.content}
        theme={config.theme === 'dark' ? 'vs-dark' : 'vs'}
        loading={<div className="p-4 text-sm text-muted">Loading editor...</div>}
        onChange={(value) => {
          if (value !== undefined) {
            updateTabContent(tab.id, value)
            updateMonacoModel(tab.path, value, tab.language)
          }
        }}
        onMount={handleMount}
        options={{
          fontFamily: config.fontFamily,
          fontSize: config.fontSize,
          tabSize: config.tabSize,
          wordWrap: config.wordWrap ? 'on' : 'off',
          minimap: { enabled: config.minimap },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 8 },
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          links: true,
          definitionLinkOpensInPeek: false
        }}
      />
    </div>
  )
}
