import { useEditorStore } from '@renderer/stores'
import { cn } from '@renderer/lib/utils'
import { TabBar } from '@renderer/components/editor/TabBar'
import { EditorPane } from '@renderer/components/editor/EditorPane'
import { WelcomePage } from '@renderer/components/layout/WelcomePage'

export function EditorArea() {
  const { tabs, activeTabId } = useEditorStore()

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {tabs.length > 0 && <TabBar />}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {tabs.length === 0 ? (
          <WelcomePage />
        ) : (
          tabs.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                'absolute inset-0 overflow-hidden',
                tab.id !== activeTabId && 'pointer-events-none invisible'
              )}
            >
              <EditorPane tab={tab} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
