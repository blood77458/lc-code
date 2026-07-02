import fs from 'node:fs/promises'
import path from 'node:path'
import chokidar, { type FSWatcher } from 'chokidar'
import type { BrowserWindow } from 'electron'
import type { FileChangeEvent, FileEntry } from '../../shared/types'
import type {
  ApplyEditOptions,
  FileInfo,
  GrepMatch,
  GrepOptions,
  ListDirOptions,
  ReadFileOptions,
  SearchFilesOptions,
  SearchSymbolsOptions,
  WorkspaceSymbol
} from '../../shared/file-types'
import type { TypeLibFile } from '../../shared/type-lib-types'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { securityService } from './SecurityService'
import {
  isIgnoredDir,
  isTextFile,
  matchGlob,
  IGNORED_DIRS
} from './file-utils'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const DEFAULT_GREP_RESULTS = 200
const DEFAULT_SEARCH_RESULTS = 500

export class FileService {
  private watcher: FSWatcher | null = null
  private window: BrowserWindow | null = null

  setWindow(win: BrowserWindow): void {
    this.window = win
  }

  resolvePath(targetPath: string): string {
    const root = securityService.getWorkspaceRoot()
    if (!root) throw new Error('No workspace is open')
    const resolved = path.isAbsolute(targetPath)
      ? targetPath
      : path.join(root, targetPath)
    return securityService.validatePath(resolved)
  }

  async readDir(dirPath: string, options?: ListDirOptions): Promise<FileEntry[]> {
    const resolved = this.resolvePath(dirPath)

    if (options?.recursive) {
      return this.walkDir(resolved, resolved, options.maxDepth ?? 10)
    }

    const entries = await fs.readdir(resolved, { withFileTypes: true })
    const result: FileEntry[] = []

    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue
      const fullPath = path.join(resolved, entry.name)
      result.push({
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory()
      })
    }

    return this.sortEntries(result)
  }

  private async walkDir(
    root: string,
    current: string,
    maxDepth: number,
    depth = 0
  ): Promise<FileEntry[]> {
    if (depth > maxDepth) return []

    const entries = await fs.readdir(current, { withFileTypes: true })
    const result: FileEntry[] = []

    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue
      const fullPath = path.join(current, entry.name)
      const isDirectory = entry.isDirectory()
      result.push({ name: entry.name, path: fullPath, isDirectory })
      if (isDirectory && depth < maxDepth) {
        const children = await this.walkDir(root, fullPath, maxDepth, depth + 1)
        result.push(...children)
      }
    }

    return this.sortEntries(result)
  }

  private sortEntries(entries: FileEntry[]): FileEntry[] {
    return entries.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }

  async readFile(filePath: string, options?: ReadFileOptions): Promise<string> {
    const resolved = this.resolvePath(filePath)
    const stat = await fs.stat(resolved)
    if (stat.isDirectory()) throw new Error('Cannot read a directory as a file')
    if (stat.size > MAX_FILE_SIZE) throw new Error('File is too large (>5MB)')

    const content = await fs.readFile(resolved, 'utf-8')

    if (options?.startLine !== undefined || options?.endLine !== undefined) {
      const lines = content.split('\n')
      const start = Math.max(1, options.startLine ?? 1) - 1
      const end = Math.min(lines.length, options.endLine ?? lines.length)
      return lines.slice(start, end).join('\n')
    }

    return content
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const resolved = this.resolvePath(filePath)
    await fs.mkdir(path.dirname(resolved), { recursive: true })
    await fs.writeFile(resolved, content, 'utf-8')
  }

  async createDirectory(dirPath: string): Promise<void> {
    const resolved = this.resolvePath(dirPath)
    await fs.mkdir(resolved, { recursive: true })
  }

  async deleteFile(targetPath: string): Promise<void> {
    const resolved = this.resolvePath(targetPath)
    const stat = await fs.stat(resolved)
    if (stat.isDirectory()) {
      await fs.rm(resolved, { recursive: true, force: true })
    } else {
      await fs.unlink(resolved)
    }
  }

  async moveFile(fromPath: string, toPath: string): Promise<void> {
    const resolvedFrom = this.resolvePath(fromPath)
    const resolvedTo = this.resolvePath(toPath)
    await fs.mkdir(path.dirname(resolvedTo), { recursive: true })
    await fs.rename(resolvedFrom, resolvedTo)
  }

  async getFileInfo(targetPath: string): Promise<FileInfo> {
    const resolved = this.resolvePath(targetPath)
    const stat = await fs.stat(resolved)
    return {
      path: resolved,
      name: path.basename(resolved),
      isDirectory: stat.isDirectory(),
      size: stat.size,
      modifiedAt: stat.mtimeMs,
      createdAt: stat.birthtimeMs
    }
  }

  async applyEdit(options: ApplyEditOptions): Promise<string> {
    const resolved = this.resolvePath(options.path)
    const content = await fs.readFile(resolved, 'utf-8')

    if (!content.includes(options.oldString)) {
      throw new Error(
        `old_string not found in file. Ensure the string matches exactly including whitespace.`
      )
    }

    let newContent: string
    if (options.replaceAll) {
      newContent = content.split(options.oldString).join(options.newString)
    } else {
      newContent = content.replace(options.oldString, options.newString)
    }

    await fs.writeFile(resolved, newContent, 'utf-8')
    return `Successfully applied edit to ${resolved}`
  }

  async searchFiles(options: SearchFilesOptions): Promise<FileEntry[]> {
    const root = securityService.getWorkspaceRoot()
    if (!root) throw new Error('No workspace is open')

    const cwd = options.cwd ? this.resolvePath(options.cwd) : root
    const maxResults = options.maxResults ?? DEFAULT_SEARCH_RESULTS
    const results: FileEntry[] = []

    await this.collectMatchingFiles(cwd, root, options.pattern, results, maxResults)
    return results
  }

  private async collectMatchingFiles(
    dir: string,
    workspaceRoot: string,
    pattern: string,
    results: FileEntry[],
    maxResults: number
  ): Promise<void> {
    if (results.length >= maxResults) return

    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (results.length >= maxResults) return
      if (isIgnoredDir(entry.name)) continue

      const fullPath = path.join(dir, entry.name)
      const relativePath = path.relative(workspaceRoot, fullPath).replace(/\\/g, '/')

      if (entry.isDirectory()) {
        await this.collectMatchingFiles(fullPath, workspaceRoot, pattern, results, maxResults)
      } else if (matchGlob(pattern, relativePath) || matchGlob(pattern, entry.name)) {
        results.push({ name: entry.name, path: fullPath, isDirectory: false })
      }
    }
  }

  async grep(options: GrepOptions): Promise<GrepMatch[]> {
    const root = securityService.getWorkspaceRoot()
    if (!root) throw new Error('No workspace is open')

    const cwd = options.cwd ? this.resolvePath(options.cwd) : root
    const maxResults = options.maxResults ?? DEFAULT_GREP_RESULTS
    const results: GrepMatch[] = []

    let searchPattern: RegExp
    try {
      if (options.regex) {
        searchPattern = new RegExp(options.query, options.caseSensitive ? 'g' : 'gi')
      } else {
        const escaped = options.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        searchPattern = new RegExp(escaped, options.caseSensitive ? 'g' : 'gi')
      }
    } catch {
      throw new Error(`Invalid search pattern: ${options.query}`)
    }

    await this.grepInDir(cwd, root, options, searchPattern, results, maxResults)
    return results
  }

  private async grepInDir(
    dir: string,
    workspaceRoot: string,
    options: GrepOptions,
    pattern: RegExp,
    results: GrepMatch[],
    maxResults: number
  ): Promise<void> {
    if (results.length >= maxResults) return

    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (results.length >= maxResults) return
      if (isIgnoredDir(entry.name)) continue

      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        await this.grepInDir(fullPath, workspaceRoot, options, pattern, results, maxResults)
      } else {
        const relativePath = path.relative(workspaceRoot, fullPath).replace(/\\/g, '/')
        if (options.glob && !matchGlob(options.glob, relativePath)) continue
        if (!isTextFile(fullPath)) continue

        try {
          const stat = await fs.stat(fullPath)
          if (stat.size > MAX_FILE_SIZE) continue

          const content = await fs.readFile(fullPath, 'utf-8')
          const lines = content.split('\n')

          for (let i = 0; i < lines.length; i++) {
            if (results.length >= maxResults) return
            const line = lines[i]
            const match = pattern.exec(line)
            if (match) {
              results.push({
                path: fullPath,
                line: i + 1,
                column: match.index + 1,
                text: line.trimEnd()
              })
            }
            pattern.lastIndex = 0
          }
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  async searchSymbols(options: SearchSymbolsOptions): Promise<WorkspaceSymbol[]> {
    const root = securityService.getWorkspaceRoot()
    if (!root) throw new Error('No workspace is open')

    const cwd = options.cwd ? this.resolvePath(options.cwd) : root
    const maxResults = options.maxResults ?? 100
    const query = options.query.toLowerCase()
    const results: WorkspaceSymbol[] = []

    const symbolPatterns: Array<{ regex: RegExp; kind: WorkspaceSymbol['kind'] }> = [
      { regex: /export\s+(?:async\s+)?function\s+(\w+)/g, kind: 'function' },
      { regex: /export\s+class\s+(\w+)/g, kind: 'class' },
      { regex: /export\s+interface\s+(\w+)/g, kind: 'interface' },
      { regex: /export\s+type\s+(\w+)/g, kind: 'type' },
      { regex: /export\s+const\s+(\w+)/g, kind: 'variable' },
      { regex: /(?:async\s+)?function\s+(\w+)/g, kind: 'function' },
      { regex: /class\s+(\w+)/g, kind: 'class' },
      { regex: /interface\s+(\w+)/g, kind: 'interface' },
      { regex: /^\s*(?:public|private|protected)?\s*(\w+)\s*\(/gm, kind: 'method' }
    ]

    const codeFiles = await this.searchFiles({
      pattern: '**/*.{ts,tsx,js,jsx}',
      cwd,
      maxResults: 200
    })

    for (const file of codeFiles) {
      if (results.length >= maxResults) break
      try {
        const content = await fs.readFile(file.path, 'utf-8')
        const lines = content.split('\n')

        for (const { regex, kind } of symbolPatterns) {
          let match
          while ((match = regex.exec(content)) !== null && results.length < maxResults) {
            const name = match[1]
            if (name.toLowerCase().includes(query)) {
              const before = content.slice(0, match.index)
              const line = before.split('\n').length
              results.push({ name, kind, path: file.path, line })
            }
          }
        }
      } catch {
        // skip
      }
    }

    return results
  }

  watchDir(dirPath: string): void {
    const resolved = this.resolvePath(dirPath)
    this.unwatch()

    this.watcher = chokidar.watch(resolved, {
      ignored: (p) => {
        const base = path.basename(p)
        return IGNORED_DIRS.has(base)
      },
      ignoreInitial: true,
      persistent: true,
      depth: 99
    })

    const emit = (type: FileChangeEvent['type'], filePath: string) => {
      if (!securityService.isWithinWorkspace(filePath)) return
      this.window?.webContents.send(IPC_CHANNELS.FILE_CHANGE, {
        type,
        path: filePath
      } satisfies FileChangeEvent)
    }

    this.watcher
      .on('add', (p) => emit('add', p))
      .on('change', (p) => emit('change', p))
      .on('unlink', (p) => emit('unlink', p))
      .on('addDir', (p) => emit('addDir', p))
      .on('unlinkDir', (p) => emit('unlinkDir', p))
  }

  unwatch(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }

  async loadTypeScriptLibs(): Promise<TypeLibFile[]> {
    const root = securityService.getWorkspaceRoot()
    if (!root) return []

    const libs: TypeLibFile[] = []
    const seen = new Set<string>()
    const maxLibs = 400
    const defaultMaxSize = 768 * 1024
    const largeMaxSize = 2.5 * 1024 * 1024

    const pushLib = async (filePath: string, maxSize = defaultMaxSize) => {
      if (libs.length >= maxLibs || seen.has(filePath)) return
      try {
        const stat = await fs.stat(filePath)
        if (!stat.isFile() || stat.size > maxSize) return
        const content = await fs.readFile(filePath, 'utf-8')
        seen.add(filePath)
        libs.push({ path: filePath, content })
      } catch {
        // ignore unreadable libs
      }
    }

    const collectDtsFiles = async (
      dir: string,
      depth = 0,
      perPackageLimit = 80,
      maxSize = defaultMaxSize
    ) => {
      if (depth > 4 || libs.length >= maxLibs) return

      let entries
      try {
        entries = await fs.readdir(dir, { withFileTypes: true })
      } catch {
        return
      }

      let added = 0
      for (const entry of entries) {
        if (libs.length >= maxLibs || added >= perPackageLimit) break
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await collectDtsFiles(fullPath, depth + 1, perPackageLimit - added, maxSize)
          continue
        }
        if (!entry.name.endsWith('.d.ts')) continue
        await pushLib(fullPath, maxSize)
        added++
      }
    }

    const priorityPackages = [
      { name: 'electron', dir: path.join(root, 'node_modules', 'electron'), limit: 10, maxSize: largeMaxSize },
      { name: 'node', dir: path.join(root, 'node_modules', '@types', 'node'), limit: 120, maxSize: defaultMaxSize },
      { name: 'react', dir: path.join(root, 'node_modules', '@types', 'react'), limit: 40, maxSize: defaultMaxSize },
      {
        name: 'react-dom',
        dir: path.join(root, 'node_modules', '@types', 'react-dom'),
        limit: 40,
        maxSize: defaultMaxSize
      }
    ]

    for (const pkg of priorityPackages) {
      if (libs.length >= maxLibs) break
      await collectDtsFiles(pkg.dir, 0, pkg.limit, pkg.maxSize)
    }

    const typesRoot = path.join(root, 'node_modules', '@types')
    try {
      const typePackages = await fs.readdir(typesRoot)
      for (const pkg of typePackages) {
        if (libs.length >= maxLibs) break
        if (pkg === 'node' || pkg === 'react' || pkg === 'react-dom') continue
        const pkgDir = path.join(typesRoot, pkg)
        await collectDtsFiles(pkgDir)
      }
    } catch {
      // no @types folder
    }

    try {
      const pkgRaw = await fs.readFile(path.join(root, 'package.json'), 'utf-8')
      const pkgJson = JSON.parse(pkgRaw) as {
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
      }
      const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies }
      for (const name of Object.keys(deps ?? {})) {
        if (libs.length >= maxLibs) break
        if (name === 'electron') continue
        try {
          const pkgDir = path.join(root, 'node_modules', name)
          const pkgMetaRaw = await fs.readFile(path.join(pkgDir, 'package.json'), 'utf-8')
          const pkgMeta = JSON.parse(pkgMetaRaw) as { types?: string; typings?: string }
          const typesEntry = pkgMeta.types ?? pkgMeta.typings
          if (typesEntry) {
            const typesPath = path.join(pkgDir, typesEntry)
            const maxSize = name === 'electron' ? largeMaxSize : defaultMaxSize
            await pushLib(typesPath, maxSize)
            if (name !== 'electron') {
              await collectDtsFiles(path.dirname(typesPath), 0, 20, maxSize)
            }
          }
        } catch {
          // skip packages without typings
        }
      }
    } catch {
      // no package.json
    }

    return libs
  }
}

export const fileService = new FileService()
