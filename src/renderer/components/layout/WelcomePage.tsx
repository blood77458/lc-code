import { FolderOpen, Clock } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { useWorkspaceStore } from '@renderer/stores'

export function WelcomePage() {
  const { recentProjects } = useWorkspaceStore()

  const handleOpenFolder = async () => {
    const path = await window.api.openFolder()
    if (path) {
      useWorkspaceStore.getState().setWorkspacePath(path)
    }
  }

  const handleOpenRecent = async (path: string) => {
    await window.api.openWorkspace(path)
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-light text-foreground">LC Code</h1>
        <p className="text-muted">A lightweight code editor</p>
      </div>

      <Button onClick={handleOpenFolder} className="gap-2">
        <FolderOpen size={16} />
        Open Folder
      </Button>

      {recentProjects.length > 0 && (
        <div className="w-full max-w-md">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted">
            <Clock size={14} />
            <span>Recent Projects</span>
          </div>
          <div className="flex flex-col gap-1">
            {recentProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleOpenRecent(project.path)}
                className="flex flex-col rounded-md px-3 py-2 text-left hover:bg-hover"
              >
                <span className="text-sm text-foreground">{project.name}</span>
                <span className="truncate text-xs text-muted">{project.path}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-muted">
        <kbd className="rounded bg-sidebar px-1.5 py-0.5">Ctrl+O</kbd> Open Folder
        {' · '}
        <kbd className="rounded bg-sidebar px-1.5 py-0.5">Ctrl+`</kbd> Terminal
        {' · '}
        <kbd className="rounded bg-sidebar px-1.5 py-0.5">Ctrl+,</kbd> Settings
      </div>
    </div>
  )
}
