import { ipcMain, dialog, type BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import fs from 'node:fs'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { fileService } from '../services/FileService'
import { configService } from '../services/ConfigService'
import { terminalService } from '../services/TerminalService'
import { securityService } from '../services/SecurityService'
import { registerDialogIpc } from './dialog.ipc'
import { registerFileIpc } from './file.ipc'
import { registerTerminalIpc } from './terminal.ipc'
import { registerConfigIpc } from './config.ipc'
import { registerAgentIpc } from './agent.ipc'
import { registerEditorIpc } from './editor.ipc'
import { agentService } from '../services/AgentService'

function wrapHandler<T extends unknown[], R>(
  fn: (...args: T) => R | Promise<R>
): (event: IpcMainInvokeEvent, ...args: T) => Promise<R> {
  return async (_event, ...args) => {
    try {
      return await fn(...args)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(message)
    }
  }
}

export function registerIpcHandlers(getWindow: () => BrowserWindow | null): void {
  registerFileIpc(wrapHandler)
  registerTerminalIpc(wrapHandler)
  registerConfigIpc(wrapHandler)
  registerAgentIpc(wrapHandler)
  registerEditorIpc(wrapHandler)
  registerDialogIpc(wrapHandler)

  ipcMain.handle(
    IPC_CHANNELS.FILE_OPEN_FOLDER,
    wrapHandler(async () => {
      const win = getWindow()
      if (!win) return null

      const result = await dialog.showOpenDialog(win, {
        properties: ['openDirectory']
      })

      if (result.canceled || result.filePaths.length === 0) return null

      const folderPath = result.filePaths[0]
      setupWorkspace(folderPath, win)

      return folderPath
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.WORKSPACE_OPEN,
    wrapHandler(async (folderPath: string) => {
      const win = getWindow()
      if (!win) throw new Error('No active window')

      if (!fs.existsSync(folderPath)) {
        throw new Error(`Path does not exist: ${folderPath}`)
      }

      setupWorkspace(folderPath, win)
    })
  )
}

export function setupWorkspace(folderPath: string, win: BrowserWindow): void {
  securityService.setWorkspaceRoot(folderPath)
  configService.addRecentProject(folderPath)
  fileService.setWindow(win)
  terminalService.setWindow(win)
  agentService.setWindow(win)
  fileService.watchDir(folderPath)
  win.webContents.send(IPC_CHANNELS.WINDOW_OPEN_FOLDER, folderPath)
}
