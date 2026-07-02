import path from 'node:path'

export const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'out',
  'release',
  '.cursor',
  'coverage',
  '.next',
  'build'
])

export const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db'])

export const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.scss', '.html',
  '.xml', '.yaml', '.yml', '.sql', '.sh', '.bash', '.ps1', '.py', '.rs',
  '.go', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.vue', '.svelte',
  '.txt', '.env', '.gitignore', '.prettierrc', '.eslintrc'
])

export function isIgnoredDir(name: string): boolean {
  return IGNORED_DIRS.has(name)
}

export function isTextFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  const base = path.basename(filePath)
  if (TEXT_EXTENSIONS.has(ext)) return true
  if (base === 'Dockerfile' || base.startsWith('.env')) return true
  return ext === '' && !base.includes('.')
}

export function globToRegExp(globPattern: string): RegExp {
  const normalized = globPattern.replace(/\\/g, '/')
  let regex = '^'
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i]
    if (ch === '{') {
      let options = ''
      let j = i + 1
      while (j < normalized.length && normalized[j] !== '}') {
        options += normalized[j]
        j++
      }
      if (j < normalized.length && options.length > 0) {
        const alts = options
          .split(',')
          .map((option) => option.replace(/[.+^${}()|[\]\\]/g, '\\$&'))
          .join('|')
        regex += `(${alts})`
        i = j
      } else {
        regex += '\\{'
      }
    } else if (ch === '*') {
      if (normalized[i + 1] === '*') {
        regex += '.*'
        i++
        if (normalized[i + 1] === '/') i++
      } else {
        regex += '[^/]*'
      }
    } else if (ch === '?') {
      regex += '[^/]'
    } else if ('.+^${}()|[]\\'.includes(ch)) {
      regex += `\\${ch}`
    } else {
      regex += ch
    }
  }
  regex += '$'
  return new RegExp(regex, 'i')
}

export function matchGlob(pattern: string, relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/')
  if (pattern.includes('**')) {
    return globToRegExp(pattern).test(normalized)
  }
  const parts = pattern.split(',').map((p) => p.trim())
  return parts.some((p) => globToRegExp(p).test(normalized))
}
