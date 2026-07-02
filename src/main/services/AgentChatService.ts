import { randomUUID } from 'node:crypto'
import type {
  AgentConversation,
  AgentConversationMeta,
  AgentConversationPayload,
  AgentMessage
} from '../../shared/agent-types'
import { deriveConversationTitle } from '../../shared/agent-types'
import { getDatabase } from '../db/database'

export const GLOBAL_AGENT_WORKSPACE = '__global__'

interface ConversationRow {
  id: string
  workspace_path: string
  title: string
  context_summary: string | null
  context_used: number
  context_limit: number
  context_source: string
  messages_json: string
  created_at: number
  updated_at: number
}

export class AgentChatService {
  listConversations(workspacePath: string | null): AgentConversationMeta[] {
    const key = this.toKey(workspacePath)
    const db = getDatabase()
    const rows = db
      .prepare(
        `SELECT id, title, messages_json, updated_at
         FROM agent_conversations
         WHERE workspace_path = ?
         ORDER BY updated_at DESC`
      )
      .all(key) as Array<Pick<ConversationRow, 'id' | 'title' | 'messages_json' | 'updated_at'>>

    return rows.map((row) => this.toMeta(row))
  }

  getConversation(conversationId: string): AgentConversation | null {
    const db = getDatabase()
    const row = db
      .prepare('SELECT * FROM agent_conversations WHERE id = ?')
      .get(conversationId) as ConversationRow | undefined

    if (!row) return null
    return this.toConversation(row)
  }

  createConversation(workspacePath: string | null, title = 'New chat'): AgentConversation {
    const key = this.toKey(workspacePath)
    const now = Date.now()
    const id = `conv-${randomUUID()}`
    const db = getDatabase()

    db.prepare(
      `INSERT INTO agent_conversations (
        id, workspace_path, title, context_summary, context_used, context_limit, context_source, messages_json, created_at, updated_at
      ) VALUES (?, ?, ?, NULL, 0, 65536, 'estimate', '[]', ?, ?)`
    ).run(id, key, title, now, now)

    this.setActiveConversationId(workspacePath, id)

    return {
      id,
      workspacePath,
      title,
      messages: [],
      contextSummary: null,
      contextUsed: 0,
      contextLimit: 65536,
      contextSource: 'estimate',
      createdAt: now,
      updatedAt: now
    }
  }

  saveConversation(conversationId: string, payload: AgentConversationPayload): void {
    const db = getDatabase()
    const title =
      payload.title.trim() ||
      deriveConversationTitle(payload.messages, 'New chat')

    db.prepare(
      `UPDATE agent_conversations SET
        title = ?,
        context_summary = ?,
        context_used = ?,
        context_limit = ?,
        context_source = ?,
        messages_json = ?,
        updated_at = ?
      WHERE id = ?`
    ).run(
      title,
      payload.contextSummary,
      payload.contextUsed,
      payload.contextLimit,
      payload.contextSource,
      JSON.stringify(payload.messages),
      Date.now(),
      conversationId
    )
  }

  deleteConversation(conversationId: string): void {
    const db = getDatabase()
    const row = db
      .prepare('SELECT workspace_path FROM agent_conversations WHERE id = ?')
      .get(conversationId) as { workspace_path: string } | undefined

    db.prepare('DELETE FROM agent_conversations WHERE id = ?').run(conversationId)

    if (!row) return

    const active = db
      .prepare('SELECT active_conversation_id FROM agent_workspace_state WHERE workspace_path = ?')
      .get(row.workspace_path) as { active_conversation_id: string | null } | undefined

    if (active?.active_conversation_id === conversationId) {
      const next = db
        .prepare(
          `SELECT id FROM agent_conversations
           WHERE workspace_path = ?
           ORDER BY updated_at DESC
           LIMIT 1`
        )
        .get(row.workspace_path) as { id: string } | undefined

      if (next) {
        this.setActiveConversationId(this.fromKey(row.workspace_path), next.id)
      } else {
        db.prepare('DELETE FROM agent_workspace_state WHERE workspace_path = ?').run(row.workspace_path)
      }
    }
  }

  getActiveConversationId(workspacePath: string | null): string | null {
    const key = this.toKey(workspacePath)
    const db = getDatabase()
    const row = db
      .prepare('SELECT active_conversation_id FROM agent_workspace_state WHERE workspace_path = ?')
      .get(key) as { active_conversation_id: string | null } | undefined
    return row?.active_conversation_id ?? null
  }

  setActiveConversationId(workspacePath: string | null, conversationId: string): void {
    const key = this.toKey(workspacePath)
    const db = getDatabase()
    db.prepare(
      `INSERT INTO agent_workspace_state (workspace_path, active_conversation_id)
       VALUES (?, ?)
       ON CONFLICT(workspace_path) DO UPDATE SET active_conversation_id = excluded.active_conversation_id`
    ).run(key, conversationId)
  }

  ensureActiveConversation(workspacePath: string | null): AgentConversation {
    const activeId = this.getActiveConversationId(workspacePath)
    if (activeId) {
      const existing = this.getConversation(activeId)
      if (existing) return existing
    }

    const conversations = this.listConversations(workspacePath)
    if (conversations.length > 0) {
      const conversation = this.getConversation(conversations[0].id)
      if (conversation) {
        this.setActiveConversationId(workspacePath, conversation.id)
        return conversation
      }
    }

    return this.createConversation(workspacePath)
  }

  private toConversation(row: ConversationRow): AgentConversation {
    let messages: AgentMessage[] = []
    try {
      const parsed = JSON.parse(row.messages_json) as AgentMessage[]
      messages = Array.isArray(parsed) ? parsed : []
    } catch {
      messages = []
    }

    return {
      id: row.id,
      workspacePath: row.workspace_path === GLOBAL_AGENT_WORKSPACE ? null : row.workspace_path,
      title: row.title,
      messages,
      contextSummary: row.context_summary,
      contextUsed: row.context_used,
      contextLimit: row.context_limit,
      contextSource: row.context_source === 'api' ? 'api' : 'estimate',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private toMeta(
    row: Pick<ConversationRow, 'id' | 'title' | 'messages_json' | 'updated_at'>
  ): AgentConversationMeta {
    let messageCount = 0
    let preview = ''

    try {
      const messages = JSON.parse(row.messages_json) as AgentMessage[]
      if (Array.isArray(messages)) {
        messageCount = messages.length
        const last = messages[messages.length - 1]
        preview = last?.content?.replace(/\s+/g, ' ').trim().slice(0, 80) ?? ''
      }
    } catch {
      // ignore malformed json
    }

    return {
      id: row.id,
      title: row.title,
      messageCount,
      preview,
      updatedAt: row.updated_at
    }
  }

  private toKey(workspacePath: string | null): string {
    return workspacePath ?? GLOBAL_AGENT_WORKSPACE
  }

  private fromKey(workspaceKey: string): string | null {
    return workspaceKey === GLOBAL_AGENT_WORKSPACE ? null : workspaceKey
  }
}

export const agentChatService = new AgentChatService()
