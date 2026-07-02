export interface AgentConfig {
  apiUrl: string
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
  contextWindow: number
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  apiUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  maxTokens: 4096,
  temperature: 0.7,
  contextWindow: 65536
}

export interface AgentContextInfo {
  usedTokens: number
  limitTokens: number
  compressed: boolean
  source: 'api' | 'estimate'
}

export interface AgentCompressionInfo {
  summary: string
  keptCount: number
}

export interface AgentChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AgentToolStep {
  type: 'tool_call' | 'tool_result'
  name: string
  arguments: string
  result: string
}

export interface AgentChatResult {
  content: string
  steps: AgentToolStep[]
  context: AgentContextInfo
  compression?: AgentCompressionInfo
}

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  steps?: AgentToolStep[]
  timestamp: number
  isError?: boolean
}

export interface AgentChatSession {
  workspacePath: string | null
  messages: AgentMessage[]
  contextSummary: string | null
  contextUsed: number
  contextLimit: number
  contextSource: 'api' | 'estimate'
  updatedAt: number
}

export interface AgentConversation {
  id: string
  workspacePath: string | null
  title: string
  messages: AgentMessage[]
  contextSummary: string | null
  contextUsed: number
  contextLimit: number
  contextSource: 'api' | 'estimate'
  createdAt: number
  updatedAt: number
}

export interface AgentConversationMeta {
  id: string
  title: string
  messageCount: number
  preview: string
  updatedAt: number
}

export type AgentConversationPayload = Pick<
  AgentConversation,
  | 'title'
  | 'messages'
  | 'contextSummary'
  | 'contextUsed'
  | 'contextLimit'
  | 'contextSource'
>

export function deriveConversationTitle(
  messages: AgentMessage[],
  fallback = 'New chat'
): string {
  const firstUser = messages.find((m) => m.role === 'user')
  if (!firstUser) return fallback
  const text = firstUser.content.replace(/\s+/g, ' ').trim()
  if (!text) return fallback
  return text.length > 48 ? `${text.slice(0, 48)}…` : text
}
