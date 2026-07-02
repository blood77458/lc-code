import { X } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useEditorStore } from '@renderer/stores'

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useEditorStore()

  return (
    <div className="flex h-9 items-end overflow-x-auto border-b border-border bg-tab-inactive">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            'group flex h-full max-w-48 cursor-pointer items-center gap-2 border-r border-border px-3 text-sm',
            activeTabId === tab.id
              ? 'bg-tab-active text-foreground'
              : 'bg-tab-inactive text-muted hover:bg-hover hover:text-foreground'
          )}
          onClick={() => setActiveTab(tab.id)}
        >
          <span className="truncate">
            {tab.isDirty && <span className="mr-1 text-accent">●</span>}
            {tab.name}
          </span>
          <button
            className="ml-auto shrink-0 rounded p-0.5 opacity-0 hover:bg-border group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              closeTab(tab.id)
            }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
