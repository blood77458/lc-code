import type { LucideIcon } from 'lucide-react'
import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileCog,
  FileImage,
  FileJson,
  FileKey,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideo,
  Braces,
  Database,
  GitBranch,
  Lock,
  Package,
  Settings,
  Terminal,
  Box
} from 'lucide-react'

export interface FileIconSpec {
  icon: LucideIcon
  colorClass: string
}

const DEFAULT_FILE: FileIconSpec = {
  icon: File,
  colorClass: 'text-muted'
}

const SPECIAL_FILES: Record<string, FileIconSpec> = {
  'package.json': { icon: Package, colorClass: 'text-red-400' },
  'package-lock.json': { icon: Lock, colorClass: 'text-red-300' },
  'pnpm-lock.yaml': { icon: Lock, colorClass: 'text-amber-300' },
  'yarn.lock': { icon: Lock, colorClass: 'text-blue-300' },
  'tsconfig.json': { icon: FileJson, colorClass: 'text-blue-400' },
  'jsconfig.json': { icon: FileJson, colorClass: 'text-yellow-400' },
  '.gitignore': { icon: GitBranch, colorClass: 'text-orange-400' },
  '.gitattributes': { icon: GitBranch, colorClass: 'text-orange-400' },
  '.env': { icon: FileKey, colorClass: 'text-yellow-500' },
  '.env.local': { icon: FileKey, colorClass: 'text-yellow-500' },
  '.env.example': { icon: FileKey, colorClass: 'text-yellow-500/80' },
  dockerfile: { icon: Box, colorClass: 'text-sky-400' },
  'docker-compose.yml': { icon: Box, colorClass: 'text-sky-400' },
  'docker-compose.yaml': { icon: Box, colorClass: 'text-sky-400' },
  'readme.md': { icon: FileText, colorClass: 'text-sky-300' },
  'license': { icon: FileText, colorClass: 'text-muted' },
  'license.md': { icon: FileText, colorClass: 'text-muted' },
  'makefile': { icon: Terminal, colorClass: 'text-emerald-400' },
  'cmakelists.txt': { icon: Settings, colorClass: 'text-emerald-400' }
}

const EXT_ICONS: Record<string, FileIconSpec> = {
  ts: { icon: FileCode, colorClass: 'text-blue-400' },
  tsx: { icon: FileCode, colorClass: 'text-blue-400' },
  js: { icon: FileCode, colorClass: 'text-yellow-400' },
  jsx: { icon: FileCode, colorClass: 'text-yellow-400' },
  mjs: { icon: FileCode, colorClass: 'text-yellow-400' },
  cjs: { icon: FileCode, colorClass: 'text-yellow-400' },
  vue: { icon: FileCode, colorClass: 'text-emerald-400' },
  svelte: { icon: FileCode, colorClass: 'text-orange-400' },
  py: { icon: FileCode, colorClass: 'text-blue-300' },
  pyw: { icon: FileCode, colorClass: 'text-blue-300' },
  ipynb: { icon: FileCode, colorClass: 'text-orange-300' },
  rs: { icon: FileCode, colorClass: 'text-orange-400' },
  go: { icon: FileCode, colorClass: 'text-cyan-400' },
  java: { icon: FileCode, colorClass: 'text-red-400' },
  kt: { icon: FileCode, colorClass: 'text-purple-400' },
  kts: { icon: FileCode, colorClass: 'text-purple-400' },
  cs: { icon: FileCode, colorClass: 'text-violet-400' },
  cpp: { icon: FileCode, colorClass: 'text-blue-300' },
  cc: { icon: FileCode, colorClass: 'text-blue-300' },
  cxx: { icon: FileCode, colorClass: 'text-blue-300' },
  c: { icon: FileCode, colorClass: 'text-blue-300' },
  h: { icon: FileCode, colorClass: 'text-purple-300' },
  hpp: { icon: FileCode, colorClass: 'text-purple-300' },
  swift: { icon: FileCode, colorClass: 'text-orange-300' },
  rb: { icon: FileCode, colorClass: 'text-red-400' },
  php: { icon: FileCode, colorClass: 'text-indigo-300' },
  lua: { icon: FileCode, colorClass: 'text-blue-400' },
  r: { icon: FileCode, colorClass: 'text-blue-300' },
  dart: { icon: FileCode, colorClass: 'text-cyan-300' },
  zig: { icon: FileCode, colorClass: 'text-yellow-300' },
  json: { icon: FileJson, colorClass: 'text-yellow-400' },
  jsonc: { icon: FileJson, colorClass: 'text-yellow-400' },
  json5: { icon: FileJson, colorClass: 'text-yellow-400' },
  yaml: { icon: Braces, colorClass: 'text-purple-300' },
  yml: { icon: Braces, colorClass: 'text-purple-300' },
  toml: { icon: Braces, colorClass: 'text-purple-300' },
  xml: { icon: FileCode, colorClass: 'text-orange-300' },
  html: { icon: FileCode, colorClass: 'text-orange-400' },
  htm: { icon: FileCode, colorClass: 'text-orange-400' },
  css: { icon: FileType, colorClass: 'text-sky-400' },
  scss: { icon: FileType, colorClass: 'text-pink-400' },
  sass: { icon: FileType, colorClass: 'text-pink-400' },
  less: { icon: FileType, colorClass: 'text-sky-300' },
  md: { icon: FileText, colorClass: 'text-sky-300' },
  mdx: { icon: FileText, colorClass: 'text-sky-300' },
  markdown: { icon: FileText, colorClass: 'text-sky-300' },
  txt: { icon: FileText, colorClass: 'text-muted' },
  rst: { icon: FileText, colorClass: 'text-muted' },
  sql: { icon: Database, colorClass: 'text-amber-300' },
  sqlite: { icon: Database, colorClass: 'text-amber-300' },
  db: { icon: Database, colorClass: 'text-amber-300' },
  png: { icon: FileImage, colorClass: 'text-purple-400' },
  jpg: { icon: FileImage, colorClass: 'text-purple-400' },
  jpeg: { icon: FileImage, colorClass: 'text-purple-400' },
  gif: { icon: FileImage, colorClass: 'text-purple-400' },
  webp: { icon: FileImage, colorClass: 'text-purple-400' },
  svg: { icon: FileImage, colorClass: 'text-amber-400' },
  ico: { icon: FileImage, colorClass: 'text-purple-300' },
  bmp: { icon: FileImage, colorClass: 'text-purple-300' },
  mp4: { icon: FileVideo, colorClass: 'text-pink-400' },
  webm: { icon: FileVideo, colorClass: 'text-pink-400' },
  mov: { icon: FileVideo, colorClass: 'text-pink-400' },
  avi: { icon: FileVideo, colorClass: 'text-pink-400' },
  mp3: { icon: FileAudio, colorClass: 'text-green-400' },
  wav: { icon: FileAudio, colorClass: 'text-green-400' },
  flac: { icon: FileAudio, colorClass: 'text-green-400' },
  ogg: { icon: FileAudio, colorClass: 'text-green-400' },
  zip: { icon: FileArchive, colorClass: 'text-amber-400' },
  tar: { icon: FileArchive, colorClass: 'text-amber-400' },
  gz: { icon: FileArchive, colorClass: 'text-amber-400' },
  rar: { icon: FileArchive, colorClass: 'text-amber-400' },
  '7z': { icon: FileArchive, colorClass: 'text-amber-400' },
  csv: { icon: FileSpreadsheet, colorClass: 'text-emerald-400' },
  xls: { icon: FileSpreadsheet, colorClass: 'text-emerald-400' },
  xlsx: { icon: FileSpreadsheet, colorClass: 'text-emerald-400' },
  sh: { icon: Terminal, colorClass: 'text-emerald-400' },
  bash: { icon: Terminal, colorClass: 'text-emerald-400' },
  zsh: { icon: Terminal, colorClass: 'text-emerald-400' },
  fish: { icon: Terminal, colorClass: 'text-emerald-400' },
  ps1: { icon: Terminal, colorClass: 'text-blue-300' },
  bat: { icon: Terminal, colorClass: 'text-slate-300' },
  cmd: { icon: Terminal, colorClass: 'text-slate-300' },
  ini: { icon: FileCog, colorClass: 'text-muted' },
  cfg: { icon: FileCog, colorClass: 'text-muted' },
  conf: { icon: FileCog, colorClass: 'text-muted' },
  lock: { icon: Lock, colorClass: 'text-muted' },
  wasm: { icon: Box, colorClass: 'text-purple-400' },
  graphql: { icon: Braces, colorClass: 'text-pink-400' },
  gql: { icon: Braces, colorClass: 'text-pink-400' },
  env: { icon: FileKey, colorClass: 'text-yellow-500' }
}

export function getFileIconSpec(fileName: string): FileIconSpec {
  const lower = fileName.toLowerCase()

  if (SPECIAL_FILES[lower]) {
    return SPECIAL_FILES[lower]
  }

  if (lower.startsWith('.env')) {
    return SPECIAL_FILES['.env']
  }

  if (lower === 'dockerfile' || lower.startsWith('dockerfile.')) {
    return SPECIAL_FILES.dockerfile
  }

  const dotIndex = lower.lastIndexOf('.')
  if (dotIndex <= 0) {
    return DEFAULT_FILE
  }

  const ext = lower.slice(dotIndex + 1)
  return EXT_ICONS[ext] ?? DEFAULT_FILE
}
