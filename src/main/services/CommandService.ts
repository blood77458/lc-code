import { exec } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'
import { securityService } from './SecurityService'

const execAsync = promisify(exec)

export interface CommandResult {
  stdout: string
  stderr: string
  exitCode: number
}

export async function runCommand(
  command: string,
  cwd?: string
): Promise<CommandResult> {
  const workspaceRoot = securityService.getWorkspaceRoot()
  if (!workspaceRoot) {
    throw new Error('No workspace is open')
  }

  let resolvedCwd = workspaceRoot
  if (cwd) {
    const target = path.isAbsolute(cwd) ? cwd : path.join(workspaceRoot, cwd)
    resolvedCwd = securityService.validatePath(target)
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: resolvedCwd,
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
      shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
      env: process.env
    })
    return { stdout: stdout ?? '', stderr: stderr ?? '', exitCode: 0 }
  } catch (err: unknown) {
    const e = err as {
      stdout?: string
      stderr?: string
      code?: number | string
      message?: string
    }
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? e.message ?? String(err),
      exitCode: typeof e.code === 'number' ? e.code : 1
    }
  }
}
