import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import type {
  AppConfig,
  ElectronAPI,
  FileChangeEvent,
  SaveDialogOptions
} from '../shared/types'
import type {
  AgentChatMessage,
  AgentChatResult,
  AgentConfig,
  AgentConversation,
  AgentConversationPayload
} from '../shared/agent-types'
import type {
  ApplyEditOptions,
  GrepOptions,
  ListDirOptions,
  OpenFileInfo,
  ReadFileOptions,
  SearchFilesOptions,
  SearchSymbolsOptions
} from '../shared/file-types'

const api: ElectronAPI = {
  openFolder: () => ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN_FOLDER),

  openWorkspace: (path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_OPEN, path),

  readDir: (path: string, options?: ListDirOptions) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_READ_DIR, path, options),

  readFile: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_READ, path),

  readFileRange: (path: string, options: ReadFileOptions) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_READ_RANGE, path, options),

  writeFile: (path: string, content: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_WRITE, path, content),

  deleteFile: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_DELETE, path),

  moveFile: (fromPath: string, toPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_MOVE, fromPath, toPath),

  createDirectory: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_MKDIR, path),

  getFileInfo: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_STAT, path),

  searchFiles: (options: SearchFilesOptions) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_SEARCH, options),

  grep: (options: GrepOptions) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_GREP, options),

  applyEdit: (options: ApplyEditOptions) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_APPLY_EDIT, options),

  searchSymbols: (options: SearchSymbolsOptions) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_SEARCH_SYMBOLS, options),

  loadTypeLibs: () => ipcRenderer.invoke(IPC_CHANNELS.FILE_LOAD_TYPE_LIBS),

  watchDir: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_WATCH, path),

  unwatchDir: () => ipcRenderer.invoke(IPC_CHANNELS.FILE_UNWATCH),

  onFileChange: (callback: (event: FileChangeEvent) => void) => {
    const handler = (_: Electron.IpcRendererEvent, event: FileChangeEvent) =>
      callback(event)
    ipcRenderer.on(IPC_CHANNELS.FILE_CHANGE, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.FILE_CHANGE, handler)
  },

  createTerminal: (cwd: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CREATE, cwd),

  writeTerminal: (id: string, data: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_WRITE, id, data),

  resizeTerminal: (id: string, cols: number, rows: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_RESIZE, id, cols, rows),

  destroyTerminal: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_DESTROY, id),

  onTerminalData: (callback: (id: string, data: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, id: string, data: string) =>
      callback(id, data)
    ipcRenderer.on(IPC_CHANNELS.TERMINAL_DATA, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_DATA, handler)
  },

  getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_GET),

  setConfig: (key: keyof AppConfig, value: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONFIG_SET, key, value),

  getRecentProjects: () => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_GET_RECENT),

  addRecentProject: (path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONFIG_ADD_RECENT, path),

  getKeybindings: () => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_GET_KEYBINDINGS),

  setKeybinding: (command: string, key: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONFIG_SET_KEYBINDING, command, key),

  showSaveDialog: (options: SaveDialogOptions) =>
    ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SAVE, options),

  onToggleTerminal: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.WINDOW_TOGGLE_TERMINAL, handler)
    return () =>
      ipcRenderer.removeListener(IPC_CHANNELS.WINDOW_TOGGLE_TERMINAL, handler)
  },

  onToggleSettings: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.WINDOW_TOGGLE_SETTINGS, handler)
    return () =>
      ipcRenderer.removeListener(IPC_CHANNELS.WINDOW_TOGGLE_SETTINGS, handler)
  },

  onOpenFolder: (callback: (path: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, path: string) => callback(path)
    ipcRenderer.on(IPC_CHANNELS.WINDOW_OPEN_FOLDER, handler)
    return () =>
      ipcRenderer.removeListener(IPC_CHANNELS.WINDOW_OPEN_FOLDER, handler)
  },

  syncOpenFiles: (files: OpenFileInfo[]) =>
    ipcRenderer.invoke(IPC_CHANNELS.EDITOR_SYNC_OPEN_FILES, files),

  getOpenFiles: () => ipcRenderer.invoke(IPC_CHANNELS.EDITOR_GET_OPEN_FILES),

  getAgentConfig: () => ipcRenderer.invoke(IPC_CHANNELS.AGENT_GET_CONFIG),

  setAgentConfig: (config: AgentConfig) =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_SET_CONFIG, config),

  agentChat: (messages: AgentChatMessage[], contextSummary?: string | null) =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_CHAT, messages, contextSummary ?? null),

  listAgentConversations: (workspacePath: string | null) =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_LIST_CONVERSATIONS, workspacePath),

  getAgentConversation: (conversationId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_GET_CONVERSATION, conversationId),

  createAgentConversation: (workspacePath: string | null, title?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_CREATE_CONVERSATION, workspacePath, title),

  saveAgentConversation: (conversationId: string, payload: AgentConversationPayload) =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_SAVE_CONVERSATION, conversationId, payload),

  deleteAgentConversation: (conversationId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_DELETE_CONVERSATION, conversationId),

  getActiveAgentConversation: (workspacePath: string | null) =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_GET_ACTIVE_CONVERSATION, workspacePath),

  setActiveAgentConversation: (workspacePath: string | null, conversationId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_SET_ACTIVE_CONVERSATION, workspacePath, conversationId),

  getAgentContext: (messages: AgentChatMessage[], contextSummary?: string | null) =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_GET_CONTEXT, messages, contextSummary ?? null),

  onAgentStreamChunk: (callback: (chunk: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, chunk: string) => callback(chunk)
    ipcRenderer.on(IPC_CHANNELS.AGENT_STREAM_CHUNK, handler)
    return () =>
      ipcRenderer.removeListener(IPC_CHANNELS.AGENT_STREAM_CHUNK, handler)
  },

  onAgentStreamDone: (callback: (result: AgentChatResult) => void) => {
    const handler = (_: Electron.IpcRendererEvent, result: AgentChatResult) =>
      callback(result)
    ipcRenderer.on(IPC_CHANNELS.AGENT_STREAM_DONE, handler)
    return () =>
      ipcRenderer.removeListener(IPC_CHANNELS.AGENT_STREAM_DONE, handler)
  },

  onAgentStreamError: (callback: (error: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, error: string) => callback(error)
    ipcRenderer.on(IPC_CHANNELS.AGENT_STREAM_ERROR, handler)
    return () =>
      ipcRenderer.removeListener(IPC_CHANNELS.AGENT_STREAM_ERROR, handler)
  }
}

contextBridge.exposeInMainWorld('api', api)
