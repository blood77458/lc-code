import type { OpenFileInfo } from '../../shared/file-types'

export class EditorService {
  private openFiles: OpenFileInfo[] = []

  syncOpenFiles(files: OpenFileInfo[]): void {
    this.openFiles = files
  }

  getOpenFiles(): OpenFileInfo[] {
    return [...this.openFiles]
  }
}

export const editorService = new EditorService()
