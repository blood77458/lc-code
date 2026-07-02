import path from 'node:path'

export class SecurityService {
  private workspaceRoot: string | null = null

  setWorkspaceRoot(root: string): void {
    this.workspaceRoot = path.resolve(root)
  }

  getWorkspaceRoot(): string | null {
    return this.workspaceRoot
  }

  clearWorkspace(): void {
    this.workspaceRoot = null
  }

  validatePath(targetPath: string): string {
    if (!this.workspaceRoot) {
      throw new Error('No workspace is open')
    }

    const resolved = path.resolve(targetPath)
    const normalizedRoot = path.resolve(this.workspaceRoot)

    if (!this.isWithinWorkspace(resolved)) {
      throw new Error(`Access denied: path is outside workspace (${targetPath})`)
    }

    return resolved
  }

  isWithinWorkspace(targetPath: string): boolean {
    if (!this.workspaceRoot) return false
    const resolved = path.resolve(targetPath)
    const normalizedRoot = path.resolve(this.workspaceRoot)

    if (process.platform === 'win32') {
      const lowerResolved = resolved.toLowerCase()
      const lowerRoot = normalizedRoot.toLowerCase()
      const sep = path.sep.toLowerCase()
      return (
        lowerResolved === lowerRoot ||
        lowerResolved.startsWith(lowerRoot + sep)
      )
    }

    return (
      resolved === normalizedRoot ||
      resolved.startsWith(normalizedRoot + path.sep)
    )
  }
}

export const securityService = new SecurityService()
