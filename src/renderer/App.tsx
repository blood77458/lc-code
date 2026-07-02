import { useEffect, useRef } from 'react'
import { ActivityBar } from '@renderer/components/layout/ActivityBar'
import { Sidebar } from '@renderer/components/layout/Sidebar'
import { EditorArea } from '@renderer/components/layout/EditorArea'
import { BottomPanel } from '@renderer/components/layout/BottomPanel'
import { StatusBar } from '@renderer/components/layout/StatusBar'
import {
  syncMonacoWorkspace,
  updateMonacoModel,
  removeMonacoModel
} from '@renderer/lib/monaco-workspace'
import {
  useWorkspaceStore,
  useUIStore,
  useEditorStore
} from '@renderer/stores'

export default function App() {
  const { workspacePath, setWorkspacePath, setRecentProjects, setSidebarView } = useWorkspaceStore()
  const { toggleTerminal, setConfig } = useUIStore()
  const { tabs, reloadTab } = useEditorStore()
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const syncTabs = () => {
      const { tabs, activeTabId } = useEditorStore.getState()
      const openFiles = tabs.map((t) => ({
        path: t.path,
        name: t.name,
        content: t.content,
        language: t.language,
        isDirty: t.isDirty,
        isActive: t.id === activeTabId
      }))
      window.api.syncOpenFiles(openFiles)
    }

    syncTabs()
    return useEditorStore.subscribe(syncTabs)
  }, [])

  useEffect(() => {
    window.api.getConfig().then(setConfig)
    window.api.getRecentProjects().then(setRecentProjects)
  }, [setConfig, setRecentProjects])

  useEffect(() => {
    const unsubOpenFolder = window.api.onOpenFolder((path) => {
      setWorkspacePath(path)
    })

    const unsubToggleTerminal = window.api.onToggleTerminal(() => {
      toggleTerminal()
    })

    const unsubToggleSettings = window.api.onToggleSettings(() => {
      setSidebarView('settings')
    })

    return () => {
      unsubOpenFolder()
      unsubToggleTerminal()
      unsubToggleSettings()
    }
  }, [setWorkspacePath, toggleTerminal, setSidebarView])

  useEffect(() => {
    void syncMonacoWorkspace(workspacePath)
  }, [workspacePath])

  useEffect(() => {
    const scheduleWorkspaceSync = () => {
      if (!workspacePath) return
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
      syncTimerRef.current = setTimeout(() => {
        void syncMonacoWorkspace(workspacePath)
      }, 800)
    }

    const unsubscribe = window.api.onFileChange(async (event) => {
      if (event.type === 'unlink') {
        removeMonacoModel(event.path)
        scheduleWorkspaceSync()
        return
      }

      if (event.type === 'add' || event.type === 'change') {
        try {
          const content = await window.api.readFile(event.path)
          updateMonacoModel(event.path, content)
        } catch {
          // file may have been deleted
        }
        scheduleWorkspaceSync()
      }

      if (event.type !== 'change') return
      const tab = tabs.find((t) => t.path === event.path)
      if (!tab || tab.isDirty) return
      try {
        const content = await window.api.readFileRange(event.path, {})
        reloadTab(tab.id, content)
        updateMonacoModel(event.path, content, tab.language)
      } catch {
        // file may have been deleted
      }
    })
    return () => {
      unsubscribe()
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    }
  }, [tabs, reloadTab, workspacePath])

  useEffect(() => {
    const onKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault()
        const path = await window.api.openFolder()
        if (path) setWorkspacePath(path)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault()
        toggleTerminal()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setSidebarView('settings')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setWorkspacePath, toggleTerminal, setSidebarView])

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <EditorArea />
          <BottomPanel />
        </div>
      </div>
      <StatusBar />
    </div>
  )
}
