import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import type { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { securityService } from './SecurityService'

interface TerminalBackend {
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
}

interface TerminalInstance {
  id: string
  backend: TerminalBackend
}

function getDefaultShell(): string {
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'powershell.exe'
  }
  return process.env.SHELL || '/bin/bash'
}

function createPtyBackend(
  shell: string,
  cwd: string,
  onData: (data: string) => void
): TerminalBackend | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pty = require('node-pty') as typeof import('node-pty')
    const instance = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd,
      env: process.env as Record<string, string>
    })

    instance.onData(onData)

    return {
      write: (data) => instance.write(data),
      resize: (cols, rows) => instance.resize(cols, rows),
      kill: () => instance.kill()
    }
  } catch {
    return null
  }
}

function createSpawnBackend(
  shell: string,
  cwd: string,
  onData: (data: string) => void
): TerminalBackend {
  const args = process.platform === 'win32' ? [] : ['-l']
  const proc: ChildProcessWithoutNullStreams = spawn(shell, args, {
    cwd,
    env: process.env,
    stdio: 'pipe',
    windowsHide: true
  })

  proc.stdout.on('data', (chunk: Buffer) => onData(chunk.toString()))
  proc.stderr.on('data', (chunk: Buffer) => onData(chunk.toString()))
  proc.on('exit', (code) => onData(`\r\n[Process exited with code ${code}]\r\n`))

  if (process.platform === 'win32') {
    onData('PowerShell (fallback mode — install VS Build Tools for full PTY support)\r\n')
  }

  return {
    write: (data) => {
      if (proc.stdin.writable) proc.stdin.write(data)
    },
    resize: () => {
      // spawn fallback does not support resize
    },
    kill: () => {
      proc.kill()
    }
  }
}

export class TerminalService {
  private terminals = new Map<string, TerminalInstance>()
  private window: BrowserWindow | null = null

  setWindow(win: BrowserWindow): void {
    this.window = win
  }

  create(cwd: string): string {
    const resolvedCwd = securityService.getWorkspaceRoot()
      ? securityService.validatePath(cwd)
      : cwd

    const id = randomUUID()
    const shell = getDefaultShell()

    const onData = (data: string) => {
      this.window?.webContents.send(IPC_CHANNELS.TERMINAL_DATA, id, data)
    }

    const ptyBackend = createPtyBackend(shell, resolvedCwd, onData)
    const backend = ptyBackend ?? createSpawnBackend(shell, resolvedCwd, onData)

    this.terminals.set(id, { id, backend })
    return id
  }

  write(id: string, data: string): void {
    const terminal = this.terminals.get(id)
    if (!terminal) throw new Error(`Terminal not found: ${id}`)
    terminal.backend.write(data)
  }

  resize(id: string, cols: number, rows: number): void {
    const terminal = this.terminals.get(id)
    if (!terminal) return
    terminal.backend.resize(cols, rows)
  }

  destroy(id: string): void {
    const terminal = this.terminals.get(id)
    if (terminal) {
      terminal.backend.kill()
      this.terminals.delete(id)
    }
  }

  destroyAll(): void {
    for (const [id] of this.terminals) {
      this.destroy(id)
    }
  }
}

export const terminalService = new TerminalService()
