import type Database from 'better-sqlite3'
import { DEFAULT_CONFIG, DEFAULT_KEYBINDINGS } from '../../shared/types'
import { DEFAULT_AGENT_CONFIG } from '../../shared/agent-types'

export function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recent_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      opened_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS keybindings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      command TEXT NOT NULL UNIQUE,
      key TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_chat_sessions (
      workspace_path TEXT PRIMARY KEY,
      context_summary TEXT,
      context_used INTEGER NOT NULL DEFAULT 0,
      context_limit INTEGER NOT NULL DEFAULT 65536,
      context_source TEXT NOT NULL DEFAULT 'estimate',
      messages_json TEXT NOT NULL DEFAULT '[]',
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_conversations (
      id TEXT PRIMARY KEY,
      workspace_path TEXT NOT NULL,
      title TEXT NOT NULL,
      context_summary TEXT,
      context_used INTEGER NOT NULL DEFAULT 0,
      context_limit INTEGER NOT NULL DEFAULT 65536,
      context_source TEXT NOT NULL DEFAULT 'estimate',
      messages_json TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_agent_conversations_workspace
      ON agent_conversations(workspace_path, updated_at DESC);

    CREATE TABLE IF NOT EXISTS agent_workspace_state (
      workspace_path TEXT PRIMARY KEY,
      active_conversation_id TEXT
    );
  `)

  migrateAgentConversations(database)
  seedDefaults(database)
}

function migrateAgentConversations(database: Database.Database): void {
  const legacyCount = (
    database.prepare('SELECT COUNT(*) as count FROM agent_chat_sessions').get() as { count: number }
  ).count
  const newCount = (
    database.prepare('SELECT COUNT(*) as count FROM agent_conversations').get() as { count: number }
  ).count

  if (legacyCount === 0 || newCount > 0) return

  const rows = database
    .prepare(
      `SELECT workspace_path, context_summary, context_used, context_limit, context_source, messages_json, updated_at
       FROM agent_chat_sessions`
    )
    .all() as Array<{
    workspace_path: string
    context_summary: string | null
    context_used: number
    context_limit: number
    context_source: string
    messages_json: string
    updated_at: number
  }>

  const insert = database.prepare(
    `INSERT INTO agent_conversations (
      id, workspace_path, title, context_summary, context_used, context_limit, context_source, messages_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const setActive = database.prepare(
    `INSERT INTO agent_workspace_state (workspace_path, active_conversation_id) VALUES (?, ?)
     ON CONFLICT(workspace_path) DO UPDATE SET active_conversation_id = excluded.active_conversation_id`
  )

  for (const row of rows) {
    const id = `conv-${row.updated_at}`
    let title = 'Chat history'
    try {
      const messages = JSON.parse(row.messages_json) as Array<{ role: string; content: string }>
      const firstUser = messages.find((m) => m.role === 'user')
      if (firstUser?.content) {
        title =
          firstUser.content.length > 48
            ? `${firstUser.content.slice(0, 48)}…`
            : firstUser.content
      }
    } catch {
      // keep default title
    }

    insert.run(
      id,
      row.workspace_path,
      title,
      row.context_summary,
      row.context_used,
      row.context_limit,
      row.context_source,
      row.messages_json,
      row.updated_at,
      row.updated_at
    )
    setActive.run(row.workspace_path, id)
  }
}

function seedDefaults(database: Database.Database): void {
  const insertSetting = database.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  )

  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    insertSetting.run(key, JSON.stringify(value))
  }

  const insertKeybinding = database.prepare(
    'INSERT OR IGNORE INTO keybindings (command, key) VALUES (?, ?)'
  )

  for (const { command, key } of DEFAULT_KEYBINDINGS) {
    insertKeybinding.run(command, key)
  }

  insertSetting.run('agentConfig', JSON.stringify(DEFAULT_AGENT_CONFIG))
}
