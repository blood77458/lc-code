import { globalShortcut, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'

export function registerShortcuts(getWindow: () => BrowserWindow | null): void {
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    // Reserved for future multi-window support
    const win = getWindow()
    win?.webContents.send(IPC_CHANNELS.WINDOW_TOGGLE_TERMINAL)
  })
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll()
}
