import { create } from 'zustand'
import type {
  AgentMessage,
  AgentChatMessage,
  AgentConversation,
  AgentConversationMeta,
  AgentConversationPayload
} from '@shared/agent-types'
import { deriveConversationTitle } from '@shared/agent-types'

interface AgentState {
  activeConversationId: string | null
  conversationTitle: string
  conversations: AgentConversationMeta[]
  messages: AgentMessage[]
  contextSummary: string | null
  contextUsed: number
  contextLimit: number
  contextSource: 'api' | 'estimate'
  isLoading: boolean
  isCompressing: boolean
  compressionNotice: string | null
  streamingContent: string
  addUserMessage: (content: string) => void
  addAssistantMessage: (message: AgentMessage) => void
  setLoading: (loading: boolean) => void
  setCompressing: (compressing: boolean) => void
  setContextStats: (used: number, limit: number, source?: 'api' | 'estimate') => void
  applyCompression: (summary: string, keptCount: number) => void
  setCompressionNotice: (notice: string | null) => void
  setConversations: (conversations: AgentConversationMeta[]) => void
  hydrateConversation: (conversation: AgentConversation | null) => void
  getConversationPayload: () => AgentConversationPayload
  appendStreamChunk: (chunk: string) => void
  clearStream: () => void
  resetConversationContent: () => void
  getChatHistory: () => AgentChatMessage[]
}

export const useAgentStore = create<AgentState>((set, get) => ({
  activeConversationId: null,
  conversationTitle: 'New chat',
  conversations: [],
  messages: [],
  contextSummary: null,
  contextUsed: 0,
  contextLimit: 65536,
  contextSource: 'estimate',
  isLoading: false,
  isCompressing: false,
  compressionNotice: null,
  streamingContent: '',

  addUserMessage: (content) => {
    const msg: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now()
    }
    set((s) => {
      const messages = [...s.messages, msg]
      return {
        messages,
        conversationTitle: deriveConversationTitle(messages, s.conversationTitle)
      }
    })
  },

  addAssistantMessage: (message) => {
    set((s) => ({
      messages: [...s.messages, message],
      streamingContent: ''
    }))
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setCompressing: (compressing) => set({ isCompressing: compressing }),

  setContextStats: (used, limit, source) =>
    set({
      contextUsed: used,
      contextLimit: limit,
      ...(source ? { contextSource: source } : {})
    }),

  applyCompression: (summary, keptCount) =>
    set((s) => ({
      contextSummary: summary,
      messages: s.messages.slice(-keptCount),
      compressionNotice: 'Earlier messages were compressed to save context'
    })),

  setCompressionNotice: (notice) => set({ compressionNotice: notice }),

  setConversations: (conversations) => set({ conversations }),

  hydrateConversation: (conversation) => {
    if (!conversation) {
      set({
        activeConversationId: null,
        conversationTitle: 'New chat',
        messages: [],
        contextSummary: null,
        contextUsed: 0,
        contextLimit: 65536,
        contextSource: 'estimate',
        streamingContent: '',
        compressionNotice: null
      })
      return
    }

    set({
      activeConversationId: conversation.id,
      conversationTitle: conversation.title,
      messages: conversation.messages,
      contextSummary: conversation.contextSummary,
      contextUsed: conversation.contextUsed,
      contextLimit: conversation.contextLimit,
      contextSource: conversation.contextSource,
      streamingContent: '',
      compressionNotice: null
    })
  },

  getConversationPayload: () => {
    const state = get()
    return {
      title: deriveConversationTitle(state.messages, state.conversationTitle),
      messages: state.messages,
      contextSummary: state.contextSummary,
      contextUsed: state.contextUsed,
      contextLimit: state.contextLimit,
      contextSource: state.contextSource
    }
  },

  appendStreamChunk: (chunk) =>
    set((s) => ({ streamingContent: s.streamingContent + chunk })),

  clearStream: () => set({ streamingContent: '' }),

  resetConversationContent: () =>
    set({
      messages: [],
      contextSummary: null,
      contextUsed: 0,
      streamingContent: '',
      compressionNotice: null,
      contextSource: 'estimate',
      conversationTitle: 'New chat'
    }),

  getChatHistory: () => {
    return get().messages.map((m) => ({
      role: m.role,
      content: m.content
    }))
  }
}))
