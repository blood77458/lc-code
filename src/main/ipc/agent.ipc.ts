import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type { AgentChatMessage, AgentConfig, AgentConversationPayload } from '../../shared/agent-types'
import { configService } from '../services/ConfigService'
import { agentService } from '../services/AgentService'
import { agentChatService } from '../services/AgentChatService'
import { resolveContextSnapshot } from '../services/AgentContextApi'
import { buildAgentSystemPrompt, computeContextUsage } from '../../shared/agent-context'
import { securityService } from '../services/SecurityService'

type WrapHandler = <T extends unknown[], R>(
  fn: (...args: T) => R | Promise<R>
) => (
  event: Electron.IpcMainInvokeEvent,
  ...args: T
) => Promise<R>

export function registerAgentIpc(wrapHandler: WrapHandler): void {
  ipcMain.handle(
    IPC_CHANNELS.AGENT_GET_CONFIG,
    wrapHandler(() => configService.getAgentConfig())
  )

  ipcMain.handle(
    IPC_CHANNELS.AGENT_SET_CONFIG,
    wrapHandler((config: AgentConfig) => {
      configService.setAgentConfig(config)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.AGENT_CHAT,
    wrapHandler((messages: AgentChatMessage[], contextSummary?: string | null) =>
      agentService.chat(messages, contextSummary ?? null)
    )
  )

  ipcMain.handle(
    IPC_CHANNELS.AGENT_CHAT_STREAM,
    wrapHandler((messages: AgentChatMessage[], contextSummary?: string | null) =>
      agentService.chatStream(messages, contextSummary ?? null)
    )
  )

  ipcMain.handle(
    IPC_CHANNELS.AGENT_LIST_CONVERSATIONS,
    wrapHandler((workspacePath: string | null) =>
      agentChatService.listConversations(workspacePath)
    )
  )

  ipcMain.handle(
    IPC_CHANNELS.AGENT_GET_CONVERSATION,
    wrapHandler((conversationId: string) => agentChatService.getConversation(conversationId))
  )

  ipcMain.handle(
    IPC_CHANNELS.AGENT_CREATE_CONVERSATION,
    wrapHandler((workspacePath: string | null, title?: string) =>
      agentChatService.createConversation(workspacePath, title)
    )
  )

  ipcMain.handle(
    IPC_CHANNELS.AGENT_SAVE_CONVERSATION,
    wrapHandler((conversationId: string, payload: AgentConversationPayload) => {
      agentChatService.saveConversation(conversationId, payload)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.AGENT_DELETE_CONVERSATION,
    wrapHandler((conversationId: string) => {
      agentChatService.deleteConversation(conversationId)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.AGENT_GET_ACTIVE_CONVERSATION,
    wrapHandler((workspacePath: string | null) =>
      agentChatService.ensureActiveConversation(workspacePath)
    )
  )

  ipcMain.handle(
    IPC_CHANNELS.AGENT_SET_ACTIVE_CONVERSATION,
    wrapHandler((workspacePath: string | null, conversationId: string) => {
      agentChatService.setActiveConversationId(workspacePath, conversationId)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.AGENT_GET_CONTEXT,
    wrapHandler(async (messages: AgentChatMessage[], contextSummary?: string | null) => {
      const config = configService.getAgentConfig()
      const workspaceRoot = securityService.getWorkspaceRoot()
      const systemPrompt = buildAgentSystemPrompt(workspaceRoot)

      const history: AgentChatMessage[] = []
      if (contextSummary) {
        history.push({
          role: 'user',
          content: `Previous conversation summary (compressed to save context):\n\n${contextSummary}`
        })
      }
      history.push(...messages)

      const apiSnapshot = await resolveContextSnapshot(config, systemPrompt, history)
      if (apiSnapshot.source === 'api') {
        return apiSnapshot
      }

      const estimated = computeContextUsage(history, systemPrompt, config)
      return {
        usedTokens: estimated.usedTokens,
        limitTokens: estimated.limitTokens,
        source: 'estimate' as const
      }
    })
  )
}
