export interface ListDirOptions {
  recursive?: boolean
  maxDepth?: number
}

export interface ReadFileOptions {
  startLine?: number
  endLine?: number
}

export interface SearchFilesOptions {
  pattern: string
  cwd?: string
  maxResults?: number
}

export interface GrepOptions {
  query: string
  cwd?: string
  glob?: string
  caseSensitive?: boolean
  regex?: boolean
  maxResults?: number
}

export interface GrepMatch {
  path: string
  line: number
  column: number
  text: string
}

export interface FileInfo {
  path: string
  name: string
  isDirectory: boolean
  size: number
  modifiedAt: number
  createdAt: number
}

export interface OpenFileInfo {
  path: string
  name: string
  content: string
  language: string
  isDirty: boolean
  isActive: boolean
}

export interface ApplyEditOptions {
  path: string
  oldString: string
  newString: string
  replaceAll?: boolean
}

export interface WorkspaceSymbol {
  name: string
  kind: 'function' | 'class' | 'interface' | 'variable' | 'method' | 'type'
  path: string
  line: number
}

export interface SearchSymbolsOptions {
  query: string
  cwd?: string
  maxResults?: number
}
