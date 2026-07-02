import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { terminalService } from '../services/TerminalService'

type WrapHandler = <T extends unknown[], R>(
  fn: (...args: T) => R | Promise<R>
) => (...args: T) => Promise<R>

export function registerTerminalIpc(wrapHandler: WrapHandler): void {
  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_CREATE,
    wrapHandler((cwd: string) => terminalService.create(cwd))
  )

  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_WRITE,
    wrapHandler((id: string, data: string) => {
      terminalService.write(id, data)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_RESIZE,
    wrapHandler((id: string, cols: number, rows: number) => {
      terminalService.resize(id, cols, rows)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_DESTROY,
    wrapHandler((id: string) => {
      terminalService.destroy(id)
    })
  )
}
