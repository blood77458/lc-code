import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Send, Bot, Wrench, ChevronDown, ChevronRight, X } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { useAgentStore } from '@renderer/stores/agentStore'
import { useWorkspaceStore } from '@renderer/stores'
import type { AgentToolStep } from '@shared/agent-types'
import { extractCodeChanges, filterNonCodeChangeSteps } from '@shared/agent-tool-display'
import { CodeChangeBlock } from '@renderer/components/agent/CodeChangeBlock'
import { DEFAULT_AGENT_CONFIG } from '@shared/agent-types'
import { buildAgentSystemPrompt, computeContextUsage } from '@shared/agent-context'
import { ContextRing } from '@renderer/components/agent/ContextRing'
import {
  ConversationHistory,
  ConversationToolbar
} from '@renderer/components/agent/ConversationHistory'
import { cn } from '@renderer/lib/utils'

function ToolSteps({ steps }: { steps: AgentToolStep[] }) {
  const [expanded, setExpanded] = useState(false)
  const toolCalls = steps.filter((s) => s.type === 'tool_call')

  if (toolCalls.length === 0) return null

  return (
    <div className="mt-2 rounded border border-border bg-background/50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-muted hover:text-foreground"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Wrench size={12} />
        <span>{toolCalls.length} tool call{toolCalls.length > 1 ? 's' : ''}</span>
      </button>
      {expanded && (
        <div className="space-y-2 border-t border-border p-2">
          {steps.map((step, i) => (
            <div key={i} className="rounded bg-sidebar p-2 text-xs">
              <div className="mb-1 font-mono text-accent">
                {step.type === 'tool_call' ? '→' : '←'} {step.name}
              </div>
              {step.type === 'tool_call' && (
                <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-all text-muted">
                  {step.arguments}
                </pre>
              )}
              {step.type === 'tool_result' && (
                <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all text-foreground/80">
                  {step.result.slice(0, 2000)}
                  {step.result.length > 2000 ? '\n...(truncated)' : ''}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MessageBubble({
  role,
  content,
  steps,
  isError
}: {
  role: 'user' | 'assistant'
  content: string
  steps?: AgentToolStep[]
  isError?: boolean
}) {
  const isUser = role === 'user'
  const codeChanges = steps ? extractCodeChanges(steps) : []
  const otherSteps = steps ? filterNonCodeChangeSteps(steps) : []

  return (
    <div className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {!isUser && (
        <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20">
          <Bot size={14} className="text-accent" />
        </div>
      )}
      <div className={cn('min-w-0 space-y-2', isUser ? 'max-w-[90%]' : 'flex-1')}>
        {content && (
          <div
            className={cn(
              'rounded-lg px-3 py-2 text-sm',
              isUser
                ? 'bg-accent text-white'
                : isError
                  ? 'border border-red-500/50 bg-red-500/10 text-red-300'
                  : 'bg-hover text-foreground'
            )}
          >
            <div className="whitespace-pre-wrap break-words">{content}</div>
          </div>
        )}

        {!isUser && codeChanges.length > 0 && (
          <div className="space-y-2">
            {codeChanges.map((change) => (
              <CodeChangeBlock key={change.id} change={change} />
            ))}
          </div>
        )}

        {!isUser && otherSteps.length > 0 && <ToolSteps steps={otherSteps} />}
      </div>
    </div>
  )
}

export function AgentPanel() {
  const { workspacePath } = useWorkspaceStore()
  const {
    activeConversationId,
    conversationTitle,
    conversations,
    messages,
    contextSummary,
    contextUsed,
    contextLimit,
    contextSource,
    isLoading,
    isCompressing,
    compressionNotice,
    streamingContent,
    addUserMessage,
    addAssistantMessage,
    setLoading,
    setCompressing,
    setContextStats,
    applyCompression,
    setCompressionNotice,
    setConversations,
    hydrateConversation,
    getConversationPayload,
    getChatHistory
  } = useAgentStore()

  const [input, setInput] = useState('')
  const [agentConfig, setAgentConfig] = useState(DEFAULT_AGENT_CONFIG)
  const [sessionReady, setSessionReady] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const refreshConversationList = useCallback(async () => {
    const list = await window.api.listAgentConversations(workspacePath)
    setConversations(list)
  }, [workspacePath, setConversations])

  const saveActiveConversation = useCallback(async () => {
    const id = useAgentStore.getState().activeConversationId
    if (!id) return
    await window.api.saveAgentConversation(id, useAgentStore.getState().getConversationPayload())
    await refreshConversationList()
  }, [refreshConversationList])

  const loadConversation = useCallback(
    async (conversationId: string) => {
      await saveActiveConversation()
      const conversation = await window.api.getAgentConversation(conversationId)
      if (!conversation) return
      await window.api.setActiveAgentConversation(workspacePath, conversationId)
      hydrateConversation(conversation)
      setHistoryOpen(false)
      await refreshConversationList()
    },
    [workspacePath, hydrateConversation, saveActiveConversation, refreshConversationList]
  )

  useEffect(() => {
    window.api.getAgentConfig().then(setAgentConfig)
  }, [])

  useEffect(() => {
    let cancelled = false
    setSessionReady(false)

    const init = async () => {
      const state = useAgentStore.getState()
      if (state.activeConversationId) {
        await window.api.saveAgentConversation(
          state.activeConversationId,
          state.getConversationPayload()
        )
      }

      const [list, active] = await Promise.all([
        window.api.listAgentConversations(workspacePath),
        window.api.getActiveAgentConversation(workspacePath)
      ])
      if (cancelled) return
      setConversations(list)
      hydrateConversation(active)
      setSessionReady(true)
    }

    init()

    return () => {
      cancelled = true
    }
  }, [workspacePath, hydrateConversation, setConversations])

  useEffect(() => {
    if (!sessionReady || !activeConversationId) return

    const timer = window.setTimeout(() => {
      window.api.saveAgentConversation(activeConversationId, getConversationPayload())
      refreshConversationList()
    }, 400)

    return () => window.clearTimeout(timer)
  }, [
    sessionReady,
    activeConversationId,
    messages,
    contextSummary,
    contextUsed,
    contextLimit,
    contextSource,
    conversationTitle,
    getConversationPayload,
    refreshConversationList
  ])

  const estimatedUsage = useMemo(() => {
    const history = getChatHistory()
    if (input.trim()) {
      history.push({ role: 'user', content: input.trim() })
    }

    const withSummary = [...history]
    if (contextSummary) {
      withSummary.unshift({
        role: 'user',
        content: `Previous conversation summary (compressed to save context):\n\n${contextSummary}`
      })
    }

    return computeContextUsage(
      withSummary,
      buildAgentSystemPrompt(workspacePath),
      agentConfig
    )
  }, [messages, contextSummary, input, workspacePath, agentConfig, getChatHistory])

  useEffect(() => {
    if (!sessionReady || isLoading) return

    let cancelled = false
    const history = getChatHistory()

    window.api.getAgentContext(history, contextSummary).then((snapshot) => {
      if (cancelled) return
      if (snapshot.source === 'api') {
        setContextStats(snapshot.usedTokens, snapshot.limitTokens, 'api')
      } else {
        setContextStats(estimatedUsage.usedTokens, estimatedUsage.limitTokens, 'estimate')
      }
    })

    return () => {
      cancelled = true
    }
  }, [
    sessionReady,
    isLoading,
    messages,
    contextSummary,
    estimatedUsage.usedTokens,
    estimatedUsage.limitTokens,
    getChatHistory,
    setContextStats
  ])

  const contextUsage = {
    usedTokens: contextUsed,
    limitTokens: contextLimit,
    shouldCompress: estimatedUsage.shouldCompress,
    source: contextSource
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent, isLoading])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    addUserMessage(text)
    setLoading(true)
    setCompressing(contextUsage.shouldCompress)

    try {
      const history = getChatHistory()
      const result = await window.api.agentChat(history, contextSummary)

      if (result.compression) {
        applyCompression(result.compression.summary, result.compression.keptCount)
      }

      addAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.content,
        steps: result.steps,
        timestamp: Date.now()
      })

      setContextStats(
        result.context.usedTokens,
        result.context.limitTokens,
        result.context.source
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      addAssistantMessage({
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: message,
        timestamp: Date.now(),
        isError: true
      })
    } finally {
      setLoading(false)
      setCompressing(false)
    }
  }, [
    input,
    isLoading,
    contextSummary,
    contextUsage.shouldCompress,
    addUserMessage,
    addAssistantMessage,
    setLoading,
    setCompressing,
    setContextStats,
    applyCompression,
    getChatHistory
  ])

  const handleNewChat = useCallback(async () => {
    await saveActiveConversation()

    const current = useAgentStore.getState()
    if (current.messages.length === 0 && current.activeConversationId) {
      setHistoryOpen(false)
      return
    }

    const conversation = await window.api.createAgentConversation(workspacePath)
    hydrateConversation(conversation)
    await refreshConversationList()
    setHistoryOpen(false)
  }, [workspacePath, hydrateConversation, saveActiveConversation, refreshConversationList])

  const handleDeleteCurrent = useCallback(async () => {
    const id = useAgentStore.getState().activeConversationId
    if (!id) return

    await window.api.deleteAgentConversation(id)
    const next = await window.api.getActiveAgentConversation(workspacePath)
    hydrateConversation(next)
    await refreshConversationList()
  }, [workspacePath, hydrateConversation, refreshConversationList])

  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
      await window.api.deleteAgentConversation(conversationId)
      const activeId = useAgentStore.getState().activeConversationId
      if (activeId === conversationId) {
        const next = await window.api.getActiveAgentConversation(workspacePath)
        hydrateConversation(next)
      }
      await refreshConversationList()
    },
    [workspacePath, hydrateConversation, refreshConversationList]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="min-w-0 flex items-center gap-2">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">
            Agent
          </span>
          <ContextRing
            used={contextUsage.usedTokens}
            limit={contextUsage.limitTokens}
            source={contextUsage.source}
            isCompressing={isCompressing}
          />
          <span className="truncate text-xs text-muted" title={conversationTitle}>
            {conversationTitle}
          </span>
        </div>
        <ConversationToolbar
          historyOpen={historyOpen}
          onToggleHistory={() => setHistoryOpen((open) => !open)}
          onNewChat={handleNewChat}
          onDeleteCurrent={handleDeleteCurrent}
          canDeleteCurrent={Boolean(activeConversationId)}
        />
      </div>

      <ConversationHistory
        open={historyOpen}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={loadConversation}
        onDelete={handleDeleteConversation}
      />

      {compressionNotice && (
        <div className="flex shrink-0 items-center justify-between border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
          <span>{compressionNotice}</span>
          <button
            type="button"
            onClick={() => setCompressionNotice(null)}
            className="rounded p-0.5 hover:bg-amber-500/20"
            aria-label="Dismiss"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {contextSummary && (
        <details className="shrink-0 border-b border-border bg-accent/5 px-3 py-2 text-xs">
          <summary className="cursor-pointer text-muted hover:text-foreground">
            Compressed context summary
          </summary>
          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-foreground/80">
            {contextSummary}
          </pre>
        </details>
      )}

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted">
            <Bot size={32} className="opacity-40" />
            <p>Ask the AI agent to help with your code</p>
            <p className="text-xs">
              Supports file read/write, directory listing, and command execution
            </p>
            {!workspacePath && (
              <p className="text-xs text-yellow-500/80">Open a workspace first for tool access</p>
            )}
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              steps={msg.steps}
              isError={msg.isError}
            />
          ))}

          {isLoading && (
            <div className="flex gap-2">
              <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20">
                <Bot size={14} className="text-accent" />
              </div>
              <div className="rounded-lg bg-hover px-3 py-2 text-sm text-muted">
                {isCompressing
                  ? 'Compressing context...'
                  : streamingContent || 'Thinking...'}
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything... (Enter to send, Shift+Enter for newline)"
            rows={3}
            disabled={isLoading}
            className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0 self-end"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
