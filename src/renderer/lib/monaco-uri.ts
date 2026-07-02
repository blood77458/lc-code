import { monaco } from './monaco-setup'

export function toFileUri(filePath: string): monaco.Uri {
  return monaco.Uri.file(filePath)
}

export function normalizeFsPath(filePath: string): string {
  return toFileUri(filePath).fsPath
}

export function toFileUriString(filePath: string): string {
  return toFileUri(filePath).toString()
}
