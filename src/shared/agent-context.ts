import type { AgentChatMessage, AgentConfig } from './agent-types'

export const CONTEXT_COMPRESS_THRESHOLD = 0.85
export const CONTEXT_KEEP_RECENT_MESSAGES = 6
export const TOOLS_TOKEN_OVERHEAD = 3200

export function estimateTokens(text: string): number {
  let tokens = 0
  for (const char of text) {
    if (/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(char)) {
      tokens += 0.65
    } else {
      tokens += 0.28
    }
  }
  return Math.max(1, Math.ceil(tokens))
}

export function estimateMessageListTokens(messages: AgentChatMessage[]): number {
  return messages.reduce((sum, message) => sum + estimateTokens(message.content) + 4, 0)
}

export function getContextInputBudget(config: Pick<AgentConfig, 'contextWindow' | 'maxTokens'>): number {
  return Math.max(1024, config.contextWindow - config.maxTokens - TOOLS_TOKEN_OVERHEAD)
}

export function computeContextUsage(
  messages: AgentChatMessage[],
  systemPrompt: string,
  config: Pick<AgentConfig, 'contextWindow' | 'maxTokens'>
): { usedTokens: number; limitTokens: number; ratio: number; shouldCompress: boolean } {
  const limitTokens = getContextInputBudget(config)
  const usedTokens =
    estimateTokens(systemPrompt) + TOOLS_TOKEN_OVERHEAD + estimateMessageListTokens(messages)
  const ratio = limitTokens > 0 ? usedTokens / limitTokens : 0

  return {
    usedTokens,
    limitTokens,
    ratio,
    shouldCompress: ratio >= CONTEXT_COMPRESS_THRESHOLD
  }
}

export function formatTokenCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K`
  return String(count)
}

export function buildCompressionTranscript(messages: AgentChatMessage[]): string {
  return messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n\n')
}

export function buildAgentSystemPrompt(workspaceRoot: string | null): string {
  return `You are a helpful coding assistant integrated into LC Code editor.
You have access to these tools:
- read_file / write_file / apply_edit — file I/O and precise edits
- list_directory (supports recursive) — browse folders
- search_files — find files by glob pattern (e.g. **/*.ts)
- grep — search file contents by text/regex
- search_symbols — find functions, classes, interfaces by name
- get_file_info — file metadata (size, mtime)
- create_directory / delete_file / move_file — file system operations
- get_open_files — see files currently open in the editor
- run_command — run shell commands (use grep/search_files tools instead when possible)

Workspace root: ${workspaceRoot ?? '(no workspace open)'}
Always use tools to inspect or modify code. Prefer apply_edit over write_file for small changes.
Prefer grep and search_files over run_command for searching. Be concise.`
}
