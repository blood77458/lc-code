import { dialog, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type { SaveDialogOptions } from '../../shared/types'

type WrapHandler = <T extends unknown[], R>(
  fn: (...args: T) => R | Promise<R>
) => (...args: T) => Promise<R>

export function registerDialogIpc(wrapHandler: WrapHandler): void {
  ipcMain.handle(
    IPC_CHANNELS.DIALOG_SAVE,
    wrapHandler(async (options: SaveDialogOptions) => {
      const result = await dialog.showSaveDialog({
        defaultPath: options.defaultPath,
        filters: options.filters
      })
      return result.canceled ? null : (result.filePath ?? null)
    })
  )
}
