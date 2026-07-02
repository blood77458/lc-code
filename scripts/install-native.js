/**
 * Install prebuilt native binaries when local compilation is unavailable.
 * Requires Visual Studio Build Tools for node-pty if prebuilds are missing.
 */
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const electronVersion = process.env.npm_config_target || '33.4.11'

function installPrebuild(packageName: string, binaryName: string): void {
  const pkgDir = join(process.cwd(), 'node_modules', packageName)
  const binaryPath = join(pkgDir, 'build', 'Release', binaryName)

  if (existsSync(binaryPath)) {
    console.log(`[install-native] ${packageName} binary already present`)
    return
  }

  console.log(`[install-native] Installing prebuild for ${packageName}...`)
  try {
    execSync(
      `npx prebuild-install --runtime electron --target ${electronVersion}`,
      { cwd: pkgDir, stdio: 'inherit' }
    )
  } catch {
    console.warn(
      `[install-native] Could not install prebuild for ${packageName}. ` +
        'Terminal will use spawn fallback. Install VS Build Tools for full PTY support.'
    )
  }
}

installPrebuild('better-sqlite3', 'better_sqlite3.node')
installPrebuild('node-pty', 'pty.node')
