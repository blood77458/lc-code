import type { AgentConfig } from '../../shared/agent-types'
import { computeContextUsage } from '../../shared/agent-context'
import type { AgentChatMessage } from '../../shared/agent-types'

export interface OpenAIUsage {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

export interface ApiContextSnapshot {
  usedTokens: number
  limitTokens: number
  source: 'api' | 'estimate'
}

export function getServerRoot(apiUrl: string): string {
  return apiUrl.replace(/\/v1\/?$/, '').replace(/\/+$/, '')
}

export async function fetchSlotsContext(
  config: AgentConfig
): Promise<{ used: number; limit: number } | null> {
  const root = getServerRoot(config.apiUrl)
  const headers: Record<string, string> = {}
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`
  }

  const paths = [`${root}/slots`, `${root}/v1/slots`]

  for (const url of paths) {
    try {
      const response = await fetch(url, { headers })
      if (!response.ok) continue

      const slots = (await response.json()) as Array<Record<string, unknown>>
      if (!Array.isArray(slots) || slots.length === 0) continue

      const slot = slots[0]
      const limit = readNumber(slot.n_ctx)
      if (!limit) continue

      const cached = readNumber(slot.tokens_cached) ?? readNumber(slot.n_past) ?? 0
      const decoded = readNumber((slot.next_token as Record<string, unknown> | undefined)?.n_decoded) ?? 0
      const used = Math.max(cached + decoded, 0)

      return { used, limit }
    } catch {
      // try next endpoint
    }
  }

  return null
}

export function usageFromCompletion(usage?: OpenAIUsage): number | null {
  if (!usage) return null
  if (usage.prompt_tokens != null && usage.completion_tokens != null) {
    return usage.prompt_tokens + usage.completion_tokens
  }
  if (usage.total_tokens != null) return usage.total_tokens
  if (usage.prompt_tokens != null) return usage.prompt_tokens
  return null
}

export async function resolveContextSnapshot(
  config: AgentConfig,
  systemPrompt: string,
  messages: AgentChatMessage[],
  completionUsage?: OpenAIUsage
): Promise<ApiContextSnapshot> {
  const usageTokens = usageFromCompletion(completionUsage)
  if (usageTokens != null) {
    const slotsContext = await fetchSlotsContext(config)
    return {
      usedTokens: usageTokens,
      limitTokens: slotsContext?.limit ?? config.contextWindow,
      source: 'api'
    }
  }

  const slotsContext = await fetchSlotsContext(config)
  if (slotsContext && (slotsContext.used > 0 || messages.length === 0)) {
    return {
      usedTokens: slotsContext.used,
      limitTokens: slotsContext.limit,
      source: 'api'
    }
  }

  const estimated = computeContextUsage(messages, systemPrompt, config)
  return {
    usedTokens: estimated.usedTokens,
    limitTokens: estimated.limitTokens,
    source: 'estimate'
  }
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return null
}
