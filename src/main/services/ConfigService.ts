import path from 'node:path'
import type { AppConfig, Keybinding, RecentProject } from '../../shared/types'
import { DEFAULT_CONFIG } from '../../shared/types'
import type { AgentConfig } from '../../shared/agent-types'
import { DEFAULT_AGENT_CONFIG } from '../../shared/agent-types'
import { getDatabase } from '../db/database'

export class ConfigService {
  getConfig(): AppConfig {
    const db = getDatabase()
    const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{
      key: string
      value: string
    }>

    const config = { ...DEFAULT_CONFIG }
    for (const row of rows) {
      try {
        const key = row.key as keyof AppConfig
        if (key in config) {
          ;(config as Record<string, unknown>)[key] = JSON.parse(row.value)
        }
      } catch {
        // ignore malformed values
      }
    }
    return config
  }

  setConfig(key: keyof AppConfig, value: unknown): void {
    const db = getDatabase()
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
      key,
      JSON.stringify(value)
    )
  }

  getRecentProjects(): RecentProject[] {
    const db = getDatabase()
    const rows = db
      .prepare(
        'SELECT id, path, name, opened_at as openedAt FROM recent_projects ORDER BY opened_at DESC LIMIT 10'
      )
      .all() as RecentProject[]
    return rows
  }

  addRecentProject(projectPath: string): void {
    const db = getDatabase()
    const name = path.basename(projectPath)
    const now = Date.now()

    db.prepare(
      `INSERT INTO recent_projects (path, name, opened_at) VALUES (?, ?, ?)
       ON CONFLICT(path) DO UPDATE SET opened_at = excluded.opened_at, name = excluded.name`
    ).run(projectPath, name, now)

    // Keep only latest 10
    db.prepare(
      `DELETE FROM recent_projects WHERE id NOT IN (
        SELECT id FROM recent_projects ORDER BY opened_at DESC LIMIT 10
      )`
    ).run()
  }

  getKeybindings(): Keybinding[] {
    const db = getDatabase()
    return db
      .prepare('SELECT id, command, key FROM keybindings ORDER BY command')
      .all() as Keybinding[]
  }

  setKeybinding(command: string, key: string): void {
    const db = getDatabase()
    db.prepare(
      'INSERT OR REPLACE INTO keybindings (command, key) VALUES (?, ?)'
    ).run(command, key)
  }

  getAgentConfig(): AgentConfig {
    const db = getDatabase()
    const row = db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get('agentConfig') as { value: string } | undefined

    if (!row) return { ...DEFAULT_AGENT_CONFIG }

    try {
      return { ...DEFAULT_AGENT_CONFIG, ...JSON.parse(row.value) }
    } catch {
      return { ...DEFAULT_AGENT_CONFIG }
    }
  }

  setAgentConfig(config: AgentConfig): void {
    const db = getDatabase()
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
      'agentConfig',
      JSON.stringify(config)
    )
  }
}

export const configService = new ConfigService()
