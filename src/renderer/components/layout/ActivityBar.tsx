import { Files, Settings, Bot } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useWorkspaceStore, type SidebarView } from '@renderer/stores'

const items: Array<{ id: SidebarView; icon: typeof Files; label: string }> = [
  { id: 'explorer', icon: Files, label: 'Explorer' },
  { id: 'agent', icon: Bot, label: 'Agent' },
  { id: 'settings', icon: Settings, label: 'Settings' }
]

export function ActivityBar() {
  const { sidebarView, setSidebarView } = useWorkspaceStore()

  return (
    <div className="flex w-12 flex-col items-center bg-activity-bar py-2">
      {items.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          title={label}
          onClick={() => setSidebarView(id)}
          className={cn(
            'mb-1 flex h-10 w-10 items-center justify-center rounded-md transition-colors',
            sidebarView === id
              ? 'text-white border-l-2 border-accent bg-hover'
              : 'text-muted hover:text-foreground'
          )}
        >
          <Icon size={22} />
        </button>
      ))}
    </div>
  )
}
