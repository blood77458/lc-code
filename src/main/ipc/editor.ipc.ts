import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type { OpenFileInfo } from '../../shared/file-types'
import { editorService } from '../services/EditorService'

type WrapHandler = <T extends unknown[], R>(
  fn: (...args: T) => R | Promise<R>
) => (
  event: Electron.IpcMainInvokeEvent,
  ...args: T
) => Promise<R>

export function registerEditorIpc(wrapHandler: WrapHandler): void {
  ipcMain.handle(
    IPC_CHANNELS.EDITOR_SYNC_OPEN_FILES,
    wrapHandler((files: OpenFileInfo[]) => {
      editorService.syncOpenFiles(files)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.EDITOR_GET_OPEN_FILES,
    wrapHandler(() => editorService.getOpenFiles())
  )
}
