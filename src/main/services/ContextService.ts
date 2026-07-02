import type { AgentChatMessage, AgentConfig } from '../../shared/agent-types'
import {
  CONTEXT_COMPRESS_THRESHOLD,
  CONTEXT_KEEP_RECENT_MESSAGES,
  buildCompressionTranscript,
  computeContextUsage,
  buildCompressionTranscript
} from '../../shared/agent-context'

interface SummarizeResponse {
  choices?: Array<{ message?: { content?: string | null } }>
  error?: { message: string }
}

export interface PreparedContext {
  messages: AgentChatMessage[]
  contextSummary: string | null
  compressed: boolean
  usedTokens: number
  limitTokens: number
  compression?: {
    summary: string
    keptCount: number
  }
}

export async function prepareAgentContext(
  messages: AgentChatMessage[],
  existingSummary: string | null,
  systemPrompt: string,
  config: AgentConfig
): Promise<PreparedContext> {
  const history: AgentChatMessage[] = []

  if (existingSummary) {
    history.push({
      role: 'user',
      content: `Previous conversation summary (compressed to save context):\n\n${existingSummary}`
    })
  }

  history.push(...messages)

  let usage = computeContextUsage(history, systemPrompt, config)
  if (!usage.shouldCompress || history.length <= CONTEXT_KEEP_RECENT_MESSAGES) {
    return {
      messages: history,
      contextSummary: existingSummary,
      compressed: false,
      usedTokens: usage.usedTokens,
      limitTokens: usage.limitTokens
    }
  }

  const recent = history.slice(-CONTEXT_KEEP_RECENT_MESSAGES)
  const older = history.slice(0, -CONTEXT_KEEP_RECENT_MESSAGES)
  const transcript = buildCompressionTranscript(older)
  const summary = await summarizeConversation(transcript, config)
  const mergedSummary = existingSummary
    ? `${existingSummary}\n\n---\n\n${summary}`
    : summary

  const compressedHistory: AgentChatMessage[] = [
    {
      role: 'user',
      content: `Previous conversation summary (compressed to save context):\n\n${mergedSummary}`
    },
    ...recent
  ]

  usage = computeContextUsage(compressedHistory, systemPrompt, config)

  if (usage.shouldCompress && compressedHistory.length > 2) {
    const trimmed = compressedHistory.slice(-Math.max(2, CONTEXT_KEEP_RECENT_MESSAGES - 2))
    usage = computeContextUsage(trimmed, systemPrompt, config)
    return {
      messages: trimmed,
      contextSummary: mergedSummary,
      compressed: true,
      usedTokens: usage.usedTokens,
      limitTokens: usage.limitTokens,
      compression: {
        summary: mergedSummary,
        keptCount: Math.min(messages.length, trimmed.length)
      }
    }
  }

  return {
    messages: compressedHistory,
    contextSummary: mergedSummary,
    compressed: true,
    usedTokens: usage.usedTokens,
    limitTokens: usage.limitTokens,
    compression: {
      summary: mergedSummary,
      keptCount: Math.min(messages.length, recent.length)
    }
  }
}

async function summarizeConversation(
  transcript: string,
  config: AgentConfig
): Promise<string> {
  const baseUrl = config.apiUrl.replace(/\/+$/, '')
  const url = `${baseUrl}/chat/completions`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      max_tokens: Math.min(2048, config.maxTokens),
      messages: [
        {
          role: 'system',
          content:
            'Compress the conversation transcript into a concise summary. Preserve decisions, file paths, code changes, errors, and open tasks. Use bullet points. Do not add new information.'
        },
        {
          role: 'user',
          content: `Summarize this conversation for future context:\n\n${transcript}`
        }
      ]
    })
  })

  const data = (await response.json()) as SummarizeResponse
  if (!response.ok) {
    const errMsg = data.error?.message ?? `Summarize API error: ${response.status}`
    throw new Error(errMsg)
  }

  const summary = data.choices?.[0]?.message?.content?.trim()
  if (!summary) {
    return fallbackSummary(transcript)
  }

  return summary
}

function fallbackSummary(transcript: string): string {
  const maxChars = 4000
  if (transcript.length <= maxChars) return transcript
  return `${transcript.slice(0, maxChars)}\n...(truncated)`
}
