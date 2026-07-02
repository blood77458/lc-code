import { monaco } from './monaco-setup'
import { getLanguageFromPath } from './utils'
import { normalizeFsPath, toFileUri } from './monaco-uri'
import { useEditorStore } from '@renderer/stores'

const CODE_FILE_PATTERN = '**/*.{ts,tsx,js,jsx,mjs,cjs}'
const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts'
])

let workspaceToken = 0
let openerRegistered = false
let activeWorkspace: string | null = null
const extraLibDisposables: monaco.IDisposable[] = []

function joinPath(base: string, ...segments: string[]): string {
  const sep = base.includes('\\') ? '\\' : '/'
  let result = base.replace(/[\\/]+$/, '')
  for (const segment of segments) {
    const cleaned = segment.replace(/^[\\/]+/, '').replace(/[\\/]+$/, '')
    if (cleaned.length > 0) {
      result += `${sep}${cleaned}`
    }
  }
  return result
}

function getExtension(filePath: string): string {
  const match = filePath.match(/\.[^./\\]+$/)
  return match ? match[0].toLowerCase() : ''
}

function parseJsonc(text: string): unknown {
  const cleaned = text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/,(\s*[}\]])/g, '$1')
  return JSON.parse(cleaned)
}

function isCodeFile(filePath: string): boolean {
  return SOURCE_EXTENSIONS.has(getExtension(filePath))
}

function augmentCompilerPaths(
  workspacePath: string,
  paths: Record<string, string[]>
): Record<string, string[]> {
  const nodeTypesPrefix = 'node_modules/@types/node'
  const builtins: Record<string, string> = {
    'node:path': `${nodeTypesPrefix}/path.d.ts`,
    'node:fs': `${nodeTypesPrefix}/fs.d.ts`,
    'node:fs/promises': `${nodeTypesPrefix}/fs/promises.d.ts`,
    'node:events': `${nodeTypesPrefix}/events.d.ts`,
    'node:url': `${nodeTypesPrefix}/url.d.ts`,
    'node:os': `${nodeTypesPrefix}/os.d.ts`,
    'node:crypto': `${nodeTypesPrefix}/crypto.d.ts`,
    'node:stream': `${nodeTypesPrefix}/stream.d.ts`,
    'node:util': `${nodeTypesPrefix}/util.d.ts`,
    'node:buffer': `${nodeTypesPrefix}/buffer.d.ts`,
    electron: 'node_modules/electron/electron.d.ts'
  }

  const merged = { ...paths }
  for (const [moduleName, typePath] of Object.entries(builtins)) {
    merged[moduleName] = [joinPath(workspacePath, typePath).replace(/\\/g, '/')]
  }
  return merged
}

function getSharedCompilerOptions(
  workspacePath: string,
  baseUrl: string,
  paths: Record<string, string[]>
) {
  const mergedPaths = augmentCompilerPaths(workspacePath, paths)
  return {
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions: true,
    allowJs: true,
    checkJs: false,
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    reactNamespace: 'React',
    noEmit: true,
    esModuleInterop: true,
    skipLibCheck: true,
    resolveJsonModule: true,
    isolatedModules: true,
    strict: false,
    baseUrl,
    paths: mergedPaths
  }
}

async function readProjectConfig(workspacePath: string): Promise<{
  baseUrl: string
  paths: Record<string, string[]>
}> {
  const configFiles = ['tsconfig.json', 'tsconfig.web.json', 'tsconfig.node.json', 'jsconfig.json']
  let baseUrl = workspacePath
  const paths: Record<string, string[]> = {}

  for (const fileName of configFiles) {
    try {
      const raw = await window.api.readFile(joinPath(workspacePath, fileName))
      const parsed = parseJsonc(raw) as {
        compilerOptions?: {
          baseUrl?: string
          paths?: Record<string, string[]>
        }
      }
      if (parsed.compilerOptions?.baseUrl) {
        baseUrl = joinPath(workspacePath, parsed.compilerOptions.baseUrl)
      }
      if (parsed.compilerOptions?.paths) {
        Object.assign(paths, parsed.compilerOptions.paths)
      }
    } catch {
      // try next config file
    }
  }

  return { baseUrl, paths }
}

function cleanupStaleModels(workspacePath: string): void {
  const normalizedRoot = normalizeFsPath(workspacePath).toLowerCase()

  for (const model of [...monaco.editor.getModels()]) {
    if (model.uri.scheme !== 'file') continue

    const rawPath = model.uri.fsPath
    if (!rawPath) {
      model.dispose()
      continue
    }

    const modelPath = normalizeFsPath(rawPath).toLowerCase()
    const isDrivePath = /^[a-z]:\//i.test(modelPath.replace(/\\/g, '/'))
    const isUnixPath = modelPath.startsWith('/')

    if (!isDrivePath && !isUnixPath) {
      model.dispose()
      continue
    }

    if (!modelPath.startsWith(normalizedRoot)) {
      model.dispose()
    }
  }
}

function clearExtraLibs(): void {
  for (const disposable of extraLibDisposables) {
    disposable.dispose()
  }
  extraLibDisposables.length = 0
}

function upsertModel(filePath: string, content: string, language?: string): void {
  const uri = toFileUri(filePath)
  const lang = language ?? getLanguageFromPath(filePath)
  const existing = monaco.editor.getModel(uri)

  if (existing) {
    if (existing.getValue() !== content) {
      existing.setValue(content)
    }
    monaco.editor.setModelLanguage(existing, lang)
    return
  }

  monaco.editor.createModel(content, lang, uri)
}

function disposeWorkspaceModels(workspacePath: string, keepPaths: Set<string>): void {
  const normalizedRoot = normalizeFsPath(workspacePath).toLowerCase()
  const normalizedKeep = new Set(
    [...keepPaths].map((filePath) => normalizeFsPath(filePath).toLowerCase())
  )

  for (const model of monaco.editor.getModels()) {
    if (model.uri.scheme !== 'file') continue
    const modelPath = normalizeFsPath(model.uri.fsPath).toLowerCase()
    if (!modelPath.startsWith(normalizedRoot)) continue
    if (normalizedKeep.has(modelPath)) continue
    model.dispose()
  }
}

async function loadTypeLibs(): Promise<void> {
  clearExtraLibs()
  const libs = await window.api.loadTypeLibs()
  for (const lib of libs) {
    const libUri = toFileUri(lib.path).toString()
    const disposable = monaco.languages.typescript.typescriptDefaults.addExtraLib(
      lib.content,
      libUri
    )
    extraLibDisposables.push(disposable)
    monaco.languages.typescript.javascriptDefaults.addExtraLib(lib.content, libUri)
  }
}

async function syncProjectSources(workspacePath: string, token: number): Promise<void> {
  const files = await window.api.searchFiles({
    pattern: CODE_FILE_PATTERN,
    cwd: workspacePath,
    maxResults: 1000
  })

  const activePaths = new Set<string>()

  for (const tab of useEditorStore.getState().tabs) {
    activePaths.add(normalizeFsPath(tab.path))
  }

  for (const file of files) {
    if (token !== workspaceToken) return
    if (!isCodeFile(file.path)) continue

    activePaths.add(normalizeFsPath(file.path))

    try {
      const openTab = useEditorStore.getState().tabs.find((tab) => tab.path === file.path)
      const content = openTab?.content ?? (await window.api.readFile(file.path))
      upsertModel(file.path, content, openTab?.language)
    } catch {
      // skip unreadable files
    }
  }

  disposeWorkspaceModels(workspacePath, activePaths)
}

export function updateMonacoModel(filePath: string, content: string, language?: string): void {
  if (!isCodeFile(filePath)) return
  upsertModel(filePath, content, language)
}

export function removeMonacoModel(filePath: string): void {
  const model = monaco.editor.getModel(toFileUri(filePath))
  model?.dispose()
}

export function registerMonacoNavigation(): void {
  if (openerRegistered) return
  openerRegistered = true

  monaco.editor.registerEditorOpener({
    openCodeEditor: async (_source, resource, selectionOrPosition) => {
      if (!resource || resource.scheme !== 'file') return false

      const filePath = resource.fsPath
      if (!filePath) return false

      const lineNumber =
        selectionOrPosition && 'startLineNumber' in selectionOrPosition
          ? selectionOrPosition.startLineNumber
          : selectionOrPosition?.lineNumber ?? 1
      const column =
        selectionOrPosition && 'startColumn' in selectionOrPosition
          ? selectionOrPosition.startColumn
          : selectionOrPosition?.column ?? 1

      try {
        const content = await window.api.readFile(filePath)
        const language = getLanguageFromPath(filePath)
        updateMonacoModel(filePath, content, language)
        useEditorStore
          .getState()
          .openFileWithReveal(filePath, content, language, lineNumber, column)
        return true
      } catch {
        return false
      }
    }
  })
}

export async function syncMonacoWorkspace(workspacePath: string | null): Promise<void> {
  const token = ++workspaceToken
  activeWorkspace = workspacePath

  registerMonacoNavigation()

  const defaults = [
    monaco.languages.typescript.typescriptDefaults,
    monaco.languages.typescript.javascriptDefaults
  ]
  defaults.forEach((setting) => {
    setting.setEagerModelSync(true)
    setting.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false
    })
    setting.setInlayHintsOptions({ includeInlayParameterNameHints: 'none' })
  })

  if (!workspacePath) {
    clearExtraLibs()
    return
  }

  cleanupStaleModels(workspacePath)

  const { baseUrl, paths } = await readProjectConfig(workspacePath)
  if (token !== workspaceToken) return

  const compilerOptions = getSharedCompilerOptions(workspacePath, baseUrl, paths)
  defaults.forEach((setting) => setting.setCompilerOptions(compilerOptions))

  await loadTypeLibs()
  if (token !== workspaceToken) return

  await syncProjectSources(workspacePath, token)
  if (token !== workspaceToken) return

  // Re-trigger diagnostics after all project models are registered.
  defaults.forEach((setting) => setting.setCompilerOptions({ ...compilerOptions }))
}

export function getActiveMonacoWorkspace(): string | null {
  return activeWorkspace
}
