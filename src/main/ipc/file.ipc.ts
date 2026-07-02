import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type {
  ApplyEditOptions,
  GrepOptions,
  ListDirOptions,
  ReadFileOptions,
  SearchFilesOptions,
  SearchSymbolsOptions
} from '../../shared/file-types'
import { fileService } from '../services/FileService'

type WrapHandler = <T extends unknown[], R>(
  fn: (...args: T) => R | Promise<R>
) => (
  event: Electron.IpcMainInvokeEvent,
  ...args: T
) => Promise<R>

export function registerFileIpc(wrapHandler: WrapHandler): void {
  ipcMain.handle(
    IPC_CHANNELS.FILE_READ_DIR,
    wrapHandler((dirPath: string, options?: ListDirOptions) =>
      fileService.readDir(dirPath, options)
    )
  )

  ipcMain.handle(
    IPC_CHANNELS.FILE_READ,
    wrapHandler((filePath: string) => fileService.readFile(filePath))
  )

  ipcMain.handle(
    IPC_CHANNELS.FILE_READ_RANGE,
    wrapHandler((filePath: string, options: ReadFileOptions) =>
      fileService.readFile(filePath, options)
    )
  )

  ipcMain.handle(
    IPC_CHANNELS.FILE_WRITE,
    wrapHandler((filePath: string, content: string) =>
      fileService.writeFile(filePath, content)
    )
  )

  ipcMain.handle(
    IPC_CHANNELS.FILE_DELETE,
    wrapHandler((filePath: string) => fileService.deleteFile(filePath))
  )

  ipcMain.handle(
    IPC_CHANNELS.FILE_MOVE,
    wrapHandler((fromPath: string, toPath: string) =>
      fileService.moveFile(fromPath, toPath)
    )
  )

  ipcMain.handle(
    IPC_CHANNELS.FILE_MKDIR,
    wrapHandler((dirPath: string) => fileService.createDirectory(dirPath))
  )

  ipcMain.handle(
    IPC_CHANNELS.FILE_STAT,
    wrapHandler((filePath: string) => fileService.getFileInfo(filePath))
  )

  ipcMain.handle(
    IPC_CHANNELS.FILE_SEARCH,
    wrapHandler((options: SearchFilesOptions) => fileService.searchFiles(options))
  )

  ipcMain.handle(
    IPC_CHANNELS.FILE_GREP,
    wrapHandler((options: GrepOptions) => fileService.grep(options))
  )

  ipcMain.handle(
    IPC_CHANNELS.FILE_APPLY_EDIT,
    wrapHandler((options: ApplyEditOptions) => fileService.applyEdit(options))
  )

  ipcMain.handle(
    IPC_CHANNELS.FILE_SEARCH_SYMBOLS,
    wrapHandler((options: SearchSymbolsOptions) => fileService.searchSymbols(options))
  )

  ipcMain.handle(
    IPC_CHANNELS.FILE_LOAD_TYPE_LIBS,
    wrapHandler(() => fileService.loadTypeScriptLibs())
  )

  ipcMain.handle(
    IPC_CHANNELS.FILE_WATCH,
    wrapHandler((dirPath: string) => {
      fileService.watchDir(dirPath)
    })
  )

  ipcMain.handle(IPC_CHANNELS.FILE_UNWATCH, wrapHandler(() => {
    fileService.unwatch()
  }))
}
