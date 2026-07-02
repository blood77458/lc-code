import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type { AppConfig } from '../../shared/types'
import { configService } from '../services/ConfigService'

type WrapHandler = <T extends unknown[], R>(
  fn: (...args: T) => R | Promise<R>
) => (...args: T) => Promise<R>

export function registerConfigIpc(wrapHandler: WrapHandler): void {
  ipcMain.handle(IPC_CHANNELS.CONFIG_GET, wrapHandler(() => configService.getConfig()))

  ipcMain.handle(
    IPC_CHANNELS.CONFIG_SET,
    wrapHandler((key: keyof AppConfig, value: unknown) => {
      configService.setConfig(key, value)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.CONFIG_GET_RECENT,
    wrapHandler(() => configService.getRecentProjects())
  )

  ipcMain.handle(
    IPC_CHANNELS.CONFIG_ADD_RECENT,
    wrapHandler((projectPath: string) => {
      configService.addRecentProject(projectPath)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.CONFIG_GET_KEYBINDINGS,
    wrapHandler(() => configService.getKeybindings())
  )

  ipcMain.handle(
    IPC_CHANNELS.CONFIG_SET_KEYBINDING,
    wrapHandler((command: string, key: string) => {
      configService.setKeybinding(command, key)
    })
  )
}
