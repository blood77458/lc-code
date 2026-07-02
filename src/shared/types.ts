import type {
  AgentConfig,
  AgentChatMessage,
  AgentChatResult,
  AgentConversation,
  AgentConversationMeta,
  AgentConversationPayload
} from './agent-types'
import type {
  ApplyEditOptions,
  FileInfo,
  GrepMatch,
  GrepOptions,
  ListDirOptions,
  OpenFileInfo,
  ReadFileOptions,
  SearchFilesOptions,
  SearchSymbolsOptions,
  WorkspaceSymbol
} from './file-types'

export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
}

export type FileChangeType = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'

export interface FileChangeEvent {
  type: FileChangeType
  path: string
}

export interface AppConfig {
  theme: 'dark' | 'light'
  fontFamily: string
  fontSize: number
  tabSize: number
  wordWrap: boolean
  minimap: boolean
  terminalFontSize: number
}

export interface RecentProject {
  id: number
  path: string
  name: string
  openedAt: number
}

export interface Keybinding {
  id: number
  command: string
  key: string
}

export interface SaveDialogOptions {
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
}

export interface ElectronAPI {
  // File
  openFolder(): Promise<string | null>
  openWorkspace(path: string): Promise<void>
  readDir(path: string, options?: ListDirOptions): Promise<FileEntry[]>
  readFile(path: string): Promise<string>
  readFileRange(path: string, options: ReadFileOptions): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  deleteFile(path: string): Promise<void>
  moveFile(fromPath: string, toPath: string): Promise<void>
  createDirectory(path: string): Promise<void>
  getFileInfo(path: string): Promise<FileInfo>
  searchFiles(options: SearchFilesOptions): Promise<FileEntry[]>
  grep(options: GrepOptions): Promise<GrepMatch[]>
  applyEdit(options: ApplyEditOptions): Promise<string>
  searchSymbols(options: SearchSymbolsOptions): Promise<WorkspaceSymbol[]>
  loadTypeLibs(): Promise<import('./type-lib-types').TypeLibFile[]>
  watchDir(path: string): Promise<void>
  unwatchDir(): Promise<void>
  onFileChange(callback: (event: FileChangeEvent) => void): () => void

  // Terminal
  createTerminal(cwd: string): Promise<string>
  writeTerminal(id: string, data: string): Promise<void>
  resizeTerminal(id: string, cols: number, rows: number): Promise<void>
  destroyTerminal(id: string): Promise<void>
  onTerminalData(callback: (id: string, data: string) => void): () => void

  // Config
  getConfig(): Promise<AppConfig>
  setConfig(key: keyof AppConfig, value: unknown): Promise<void>
  getRecentProjects(): Promise<RecentProject[]>
  addRecentProject(path: string): Promise<void>
  getKeybindings(): Promise<Keybinding[]>
  setKeybinding(command: string, key: string): Promise<void>

  // Dialog
  showSaveDialog(options: SaveDialogOptions): Promise<string | null>

  // Window events
  onToggleTerminal(callback: () => void): () => void
  onToggleSettings(callback: () => void): () => void
  onOpenFolder(callback: (path: string) => void): () => void

  // Editor
  syncOpenFiles(files: OpenFileInfo[]): Promise<void>
  getOpenFiles(): Promise<OpenFileInfo[]>

  // Agent
  getAgentConfig(): Promise<AgentConfig>
  setAgentConfig(config: AgentConfig): Promise<void>
  agentChat(messages: AgentChatMessage[], contextSummary?: string | null): Promise<AgentChatResult>
  listAgentConversations(workspacePath: string | null): Promise<AgentConversationMeta[]>
  getAgentConversation(conversationId: string): Promise<AgentConversation | null>
  createAgentConversation(workspacePath: string | null, title?: string): Promise<AgentConversation>
  saveAgentConversation(
    conversationId: string,
    payload: AgentConversationPayload
  ): Promise<void>
  deleteAgentConversation(conversationId: string): Promise<void>
  getActiveAgentConversation(workspacePath: string | null): Promise<AgentConversation>
  setActiveAgentConversation(
    workspacePath: string | null,
    conversationId: string
  ): Promise<void>
  getAgentContext(
    messages: AgentChatMessage[],
    contextSummary?: string | null
  ): Promise<{ usedTokens: number; limitTokens: number; source: 'api' | 'estimate' }>
  onAgentStreamChunk(callback: (chunk: string) => void): () => void
  onAgentStreamDone(callback: (result: AgentChatResult) => void): () => void
  onAgentStreamError(callback: (error: string) => void): () => void
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export const DEFAULT_CONFIG: AppConfig = {
  theme: 'dark',
  fontFamily: 'JetBrains Mono, Consolas, monospace',
  fontSize: 14,
  tabSize: 2,
  wordWrap: false,
  minimap: true,
  terminalFontSize: 13
}

export const DEFAULT_KEYBINDINGS: Array<{ command: string; key: string }> = [
  { command: 'file.save', key: 'Ctrl+S' },
  { command: 'file.openFolder', key: 'Ctrl+O' },
  { command: 'terminal.toggle', key: 'Ctrl+`' },
  { command: 'settings.toggle', key: 'Ctrl+,' }
]
