import { app, Menu, BrowserWindow, dialog } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import { configService } from './services/ConfigService'
import { setupWorkspace } from './ipc'

export function createAppMenu(getWindow: () => BrowserWindow | null): void {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Folder...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const win = getWindow()
            if (!win) return
            const result = await dialog.showOpenDialog(win, {
              properties: ['openDirectory']
            })
            if (!result.canceled && result.filePaths[0]) {
              setupWorkspace(result.filePaths[0], win)
            }
          }
        },
        {
          label: 'Open Recent',
          submenu: configService.getRecentProjects().map((project) => ({
            label: project.name,
            click: () => {
              const win = getWindow()
              if (!win) return
              setupWorkspace(project.path, win)
            }
          }))
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Terminal',
          accelerator: 'CmdOrCtrl+`',
          click: () => {
            getWindow()?.webContents.send(IPC_CHANNELS.WINDOW_TOGGLE_TERMINAL)
          }
        },
        {
          label: 'Toggle Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            getWindow()?.webContents.send(IPC_CHANNELS.WINDOW_TOGGLE_SETTINGS)
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Terminal',
      submenu: [
        {
          label: 'New Terminal',
          accelerator: 'CmdOrCtrl+Shift+`',
          click: () => {
            getWindow()?.webContents.send(IPC_CHANNELS.WINDOW_TOGGLE_TERMINAL)
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About LC Code',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'About LC Code',
              message: 'LC Code',
              detail: 'A Cursor-like code editor built with Electron, Monaco, and React.'
            })
          }
        }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
