import { History, MessageSquarePlus, Trash2 } from 'lucide-react'
import type { AgentConversationMeta } from '@shared/agent-types'
import { cn } from '@renderer/lib/utils'

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

interface ConversationHistoryProps {
  open: boolean
  conversations: AgentConversationMeta[]
  activeConversationId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function ConversationHistory({
  open,
  conversations,
  activeConversationId,
  onSelect,
  onDelete
}: ConversationHistoryProps) {
  if (!open) return null

  return (
    <div className="max-h-48 shrink-0 overflow-auto border-b border-border bg-panel/50">
      {conversations.length === 0 ? (
        <div className="px-3 py-4 text-center text-xs text-muted">No conversations yet</div>
      ) : (
        <div className="divide-y divide-border">
          {conversations.map((conversation) => {
            const isActive = conversation.id === activeConversationId
            return (
              <div
                key={conversation.id}
                className={cn(
                  'group flex items-start gap-2 px-3 py-2 transition-colors hover:bg-hover',
                  isActive && 'bg-hover'
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(conversation.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'truncate text-sm',
                        isActive ? 'font-medium text-foreground' : 'text-foreground/90'
                      )}
                    >
                      {conversation.title}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted">
                      {formatRelativeTime(conversation.updatedAt)}
                    </span>
                  </div>
                  {conversation.preview && (
                    <p className="mt-0.5 truncate text-xs text-muted">{conversation.preview}</p>
                  )}
                  <p className="mt-0.5 text-[10px] text-muted/80">
                    {conversation.messageCount} message{conversation.messageCount === 1 ? '' : 's'}
                  </p>
                </button>
                <button
                  type="button"
                  title="Delete conversation"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(conversation.id)
                  }}
                  className="mt-0.5 shrink-0 rounded p-1 text-muted opacity-0 transition-opacity hover:bg-background hover:text-red-400 group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface ConversationToolbarProps {
  historyOpen: boolean
  onToggleHistory: () => void
  onNewChat: () => void
  onDeleteCurrent: () => void
  canDeleteCurrent: boolean
}

export function ConversationToolbar({
  historyOpen,
  onToggleHistory,
  onNewChat,
  onDeleteCurrent,
  canDeleteCurrent
}: ConversationToolbarProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onToggleHistory}
        title="Conversation history"
        className={cn(
          'rounded p-1 text-muted hover:bg-hover hover:text-foreground',
          historyOpen && 'bg-hover text-foreground'
        )}
      >
        <History size={14} />
      </button>
      <button
        type="button"
        onClick={onNewChat}
        title="New conversation"
        className="rounded p-1 text-muted hover:bg-hover hover:text-foreground"
      >
        <MessageSquarePlus size={14} />
      </button>
      <button
        type="button"
        onClick={onDeleteCurrent}
        disabled={!canDeleteCurrent}
        title="Delete current conversation"
        className="rounded p-1 text-muted hover:bg-hover hover:text-foreground disabled:opacity-30"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
