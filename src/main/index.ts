import { app, BrowserWindow, shell } from 'electron'
import path from 'node:path'
import { registerIpcHandlers } from './ipc'
import { closeDatabase } from './db/database'
import { fileService } from './services/FileService'
import { terminalService } from './services/TerminalService'
import { agentService } from './services/AgentService'
import { createAppMenu } from './menu'
import { registerShortcuts, unregisterShortcuts } from './shortcuts'
import { logger } from './utils/logger'

let mainWindow: BrowserWindow | null = null

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#1e1e1e',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  fileService.setWindow(win)
  terminalService.setWindow(win)
  agentService.setWindow(win)

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  logger.info('LC Code starting')
  mainWindow = createWindow()
  registerIpcHandlers(() => mainWindow)
  createAppMenu(() => mainWindow)
  registerShortcuts(() => mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
      registerIpcHandlers(() => mainWindow)
      createAppMenu(() => mainWindow)
      registerShortcuts(() => mainWindow)
    }
  })
})

app.on('window-all-closed', () => {
  unregisterShortcuts()
  fileService.unwatch()
  terminalService.destroyAll()
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  unregisterShortcuts()
})
