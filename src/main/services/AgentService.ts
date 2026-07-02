import type { BrowserWindow } from 'electron'
import type {
  AgentChatMessage,
  AgentChatResult,
  AgentConfig,
  AgentToolStep
} from '../../shared/agent-types'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { configService } from './ConfigService'
import { securityService } from './SecurityService'
import { AGENT_TOOLS, executeAgentTool } from './AgentToolService'
import { prepareAgentContext } from './ContextService'
import { resolveContextSnapshot, type OpenAIUsage } from './AgentContextApi'
import { buildAgentSystemPrompt } from '../../shared/agent-context'

interface OpenAIToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

interface OpenAIMessage {
  role: string
  content: string | null
  tool_calls?: OpenAIToolCall[]
  tool_call_id?: string
  name?: string
}

interface OpenAIResponse {
  choices: Array<{
    message: OpenAIMessage
    finish_reason: string
  }>
  usage?: OpenAIUsage
  error?: { message: string }
}

const MAX_TOOL_ITERATIONS = 10

export class AgentService {
  private window: BrowserWindow | null = null

  setWindow(win: BrowserWindow): void {
    this.window = win
  }

  async chat(
    messages: AgentChatMessage[],
    contextSummary: string | null = null
  ): Promise<AgentChatResult> {
    const config = configService.getAgentConfig()
    if (!config.apiKey) {
      throw new Error('API key is not configured. Please set it in Settings.')
    }

    const workspaceRoot = securityService.getWorkspaceRoot()
    const systemPrompt = buildAgentSystemPrompt(workspaceRoot)

    const prepared = await prepareAgentContext(
      messages,
      contextSummary,
      systemPrompt,
      config
    )

    const apiMessages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...prepared.messages.map((m) => ({ role: m.role, content: m.content }))
    ]

    const steps: AgentToolStep[] = []
    let iterations = 0
    let lastUsage: OpenAIUsage | undefined

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++
      const response = await this.callOpenAI(apiMessages, config)
      if (response.usage) {
        lastUsage = response.usage
      }
      const choice = response.choices[0]
      if (!choice) throw new Error('No response from API')

      const assistantMsg = choice.message

      if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
        apiMessages.push({
          role: 'assistant',
          content: assistantMsg.content,
          tool_calls: assistantMsg.tool_calls
        })

        for (const toolCall of assistantMsg.tool_calls) {
          const toolName = toolCall.function.name
          const toolArgs = toolCall.function.arguments

          steps.push({
            type: 'tool_call',
            name: toolName,
            arguments: toolArgs,
            result: ''
          })

          let result: string
          try {
            result = await executeAgentTool(toolName, toolArgs)
          } catch (err) {
            result = `Error: ${err instanceof Error ? err.message : String(err)}`
          }

          steps.push({
            type: 'tool_result',
            name: toolName,
            arguments: toolArgs,
            result
          })

          apiMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolName,
            content: result
          })
        }
        continue
      }

      const contextSnapshot = await resolveContextSnapshot(
        config,
        systemPrompt,
        prepared.messages,
        lastUsage
      )

      return {
        content: assistantMsg.content ?? '',
        steps,
        context: {
          usedTokens: contextSnapshot.usedTokens,
          limitTokens: contextSnapshot.limitTokens,
          compressed: prepared.compressed,
          source: contextSnapshot.source
        },
        compression: prepared.compression
      }
    }

    throw new Error('Maximum tool call iterations reached')
  }

  async chatStream(
    messages: AgentChatMessage[],
    contextSummary: string | null = null
  ): Promise<AgentChatResult> {
    const result = await this.chat(messages, contextSummary)

    // Simulate streaming by sending chunks of the final content
    const content = result.content
    const chunkSize = 20
    for (let i = 0; i < content.length; i += chunkSize) {
      const chunk = content.slice(i, i + chunkSize)
      this.window?.webContents.send(IPC_CHANNELS.AGENT_STREAM_CHUNK, chunk)
      await new Promise((r) => setTimeout(r, 16))
    }

    this.window?.webContents.send(IPC_CHANNELS.AGENT_STREAM_DONE, result)
    return result
  }

  private async callOpenAI(
    messages: OpenAIMessage[],
    config: AgentConfig
  ): Promise<OpenAIResponse> {
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
        messages,
        tools: AGENT_TOOLS,
        tool_choice: 'auto',
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: false
      })
    })

    const data = (await response.json()) as OpenAIResponse

    if (!response.ok) {
      const errMsg = data.error?.message ?? `API error: ${response.status}`
      throw new Error(errMsg)
    }

    return data
  }
}

export const agentService = new AgentService()
