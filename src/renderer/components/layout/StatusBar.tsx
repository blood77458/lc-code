import { useEditorStore, useWorkspaceStore } from '@renderer/stores'

export function StatusBar() {
  const { tabs, activeTabId } = useEditorStore()
  const { workspacePath } = useWorkspaceStore()
  const activeTab = tabs.find((t) => t.id === activeTabId)

  return (
    <div className="flex h-6 items-center justify-between bg-status-bar px-3 text-xs text-white">
      <div className="flex items-center gap-4">
        {workspacePath && (
          <span className="truncate max-w-xs">{workspacePath}</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        {activeTab && (
          <>
            <span>{activeTab.language}</span>
            <span>UTF-8</span>
          </>
        )}
      </div>
    </div>
  )
}
