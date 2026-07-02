import { create } from 'zustand'
import type { AppConfig, FileEntry, RecentProject } from '@shared/types'
import { DEFAULT_CONFIG } from '@shared/types'
import { isMarkdownFile } from '@renderer/lib/utils'

export type SidebarView = 'explorer' | 'agent' | 'settings'

export type MarkdownViewMode = 'edit' | 'preview' | 'split'

interface WorkspaceState {
  workspacePath: string | null
  recentProjects: RecentProject[]
  sidebarView: SidebarView
  setWorkspacePath: (path: string | null) => void
  setRecentProjects: (projects: RecentProject[]) => void
  setSidebarView: (view: SidebarView) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspacePath: null,
  recentProjects: [],
  sidebarView: 'explorer',
  setWorkspacePath: (path) => set({ workspacePath: path }),
  setRecentProjects: (projects) => set({ recentProjects: projects }),
  setSidebarView: (view) => set({ sidebarView: view })
}))

export interface EditorTab {
  id: string
  path: string
  name: string
  content: string
  isDirty: boolean
  language: string
  markdownView?: MarkdownViewMode
}

interface EditorState {
  tabs: EditorTab[]
  activeTabId: string | null
  pendingReveal: { tabId: string; lineNumber: number; column: number } | null
  openFile: (path: string, content: string, language: string) => void
  openFileWithReveal: (
    path: string,
    content: string,
    language: string,
    lineNumber: number,
    column: number
  ) => void
  clearPendingReveal: () => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTabContent: (id: string, content: string) => void
  markTabSaved: (id: string) => void
  reloadTab: (id: string, content: string) => void
  setMarkdownView: (id: string, view: MarkdownViewMode) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  pendingReveal: null,

  openFile: (path, content, language) => {
    const existing = get().tabs.find((t) => t.path === path)
    if (existing) {
      set({ activeTabId: existing.id, pendingReveal: null })
      return
    }
    const id = `tab-${Date.now()}`
    const name = path.split(/[/\\]/).pop() ?? path
    set((state) => ({
      tabs: [
        ...state.tabs,
        {
          id,
          path,
          name,
          content,
          isDirty: false,
          language,
          markdownView: isMarkdownFile(path, language) ? 'split' : undefined
        }
      ],
      activeTabId: id,
      pendingReveal: null
    }))
  },

  openFileWithReveal: (path, content, language, lineNumber, column) => {
    const existing = get().tabs.find((t) => t.path === path)
    if (existing) {
      set({
        activeTabId: existing.id,
        pendingReveal: { tabId: existing.id, lineNumber, column }
      })
      return
    }

    const id = `tab-${Date.now()}`
    const name = path.split(/[/\\]/).pop() ?? path
    set((state) => ({
      tabs: [
        ...state.tabs,
        {
          id,
          path,
          name,
          content,
          isDirty: false,
          language,
          markdownView: isMarkdownFile(path, language) ? 'split' : undefined
        }
      ],
      activeTabId: id,
      pendingReveal: { tabId: id, lineNumber, column }
    }))
  },

  clearPendingReveal: () => set({ pendingReveal: null }),

  closeTab: (id) => {
    set((state) => {
      const tabs = state.tabs.filter((t) => t.id !== id)
      let activeTabId = state.activeTabId
      if (activeTabId === id) {
        const idx = state.tabs.findIndex((t) => t.id === id)
        activeTabId = tabs[Math.min(idx, tabs.length - 1)]?.id ?? null
      }
      return { tabs, activeTabId }
    })
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTabContent: (id, content) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, content, isDirty: true } : t
      )
    }))
  },

  markTabSaved: (id) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, isDirty: false } : t))
    }))
  },

  reloadTab: (id, content) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, content, isDirty: false } : t
      )
    }))
  },

  setMarkdownView: (id, view) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, markdownView: view } : t))
    }))
  }
}))

interface UIState {
  terminalVisible: boolean
  terminalHeight: number
  sidebarWidth: number
  config: AppConfig
  toggleTerminal: () => void
  setTerminalHeight: (height: number) => void
  setSidebarWidth: (width: number) => void
  setConfig: (config: AppConfig) => void
  updateConfig: (key: keyof AppConfig, value: unknown) => void
}

export const useUIStore = create<UIState>((set) => ({
  terminalVisible: false,
  terminalHeight: 250,
  sidebarWidth: 288,
  config: DEFAULT_CONFIG,
  toggleTerminal: () => set((s) => ({ terminalVisible: !s.terminalVisible })),
  setTerminalHeight: (height) => set({ terminalHeight: height }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setConfig: (config) => set({ config }),
  updateConfig: (key, value) =>
    set((s) => ({ config: { ...s.config, [key]: value } }))
}))

interface FileTreeState {
  expandedDirs: Set<string>
  toggleDir: (path: string) => void
  expandDir: (path: string) => void
}

export const useFileTreeStore = create<FileTreeState>((set) => ({
  expandedDirs: new Set<string>(),
  toggleDir: (path) =>
    set((state) => {
      const next = new Set(state.expandedDirs)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return { expandedDirs: next }
    }),
  expandDir: (path) =>
    set((state) => {
      const next = new Set(state.expandedDirs)
      next.add(path)
      return { expandedDirs: next }
    })
}))
