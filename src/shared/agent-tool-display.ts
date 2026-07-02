import type { AgentToolStep } from './agent-types'

export type CodeChangeTool = 'apply_edit' | 'write_file' | 'delete_file' | 'move_file'

export interface AgentCodeChange {
  id: string
  tool: CodeChangeTool
  path: string
  oldText?: string
  newText?: string
  fromPath?: string
  toPath?: string
  success: boolean
  message: string
}

export interface DiffLine {
  type: 'remove' | 'add' | 'context'
  content: string
}

const CODE_CHANGE_TOOLS = new Set<string>([
  'apply_edit',
  'write_file',
  'delete_file',
  'move_file'
])

function parseToolArgs(args: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(args) as Record<string, unknown>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function isToolSuccess(result: string): boolean {
  return !result.startsWith('Error:')
}

export function extractCodeChanges(steps: AgentToolStep[]): AgentCodeChange[] {
  const changes: AgentCodeChange[] = []

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (step.type !== 'tool_call' || !CODE_CHANGE_TOOLS.has(step.name)) continue

    const resultStep = steps[i + 1]
    const result =
      resultStep?.type === 'tool_result' && resultStep.name === step.name
        ? resultStep.result
        : ''
    const args = parseToolArgs(step.arguments)
    const success = isToolSuccess(result)
    const id = `${step.name}-${i}`

    switch (step.name) {
      case 'apply_edit':
        changes.push({
          id,
          tool: 'apply_edit',
          path: String(args.path ?? 'unknown'),
          oldText: String(args.old_string ?? ''),
          newText: String(args.new_string ?? ''),
          success,
          message: result || (success ? 'Edit applied' : 'Edit failed')
        })
        break
      case 'write_file':
        changes.push({
          id,
          tool: 'write_file',
          path: String(args.path ?? 'unknown'),
          newText: String(args.content ?? ''),
          success,
          message: result || (success ? 'File written' : 'Write failed')
        })
        break
      case 'delete_file':
        changes.push({
          id,
          tool: 'delete_file',
          path: String(args.path ?? 'unknown'),
          success,
          message: result || (success ? 'File deleted' : 'Delete failed')
        })
        break
      case 'move_file':
        changes.push({
          id,
          tool: 'move_file',
          path: String(args.to_path ?? args.from_path ?? 'unknown'),
          fromPath: String(args.from_path ?? ''),
          toPath: String(args.to_path ?? ''),
          success,
          message: result || (success ? 'File moved' : 'Move failed')
        })
        break
    }
  }

  return changes
}

export function filterNonCodeChangeSteps(steps: AgentToolStep[]): AgentToolStep[] {
  const skipIndexes = new Set<number>()

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (step.type === 'tool_call' && CODE_CHANGE_TOOLS.has(step.name)) {
      skipIndexes.add(i)
      if (steps[i + 1]?.type === 'tool_result' && steps[i + 1]?.name === step.name) {
        skipIndexes.add(i + 1)
      }
    }
  }

  return steps.filter((_, index) => !skipIndexes.has(index))
}

export function buildEditDiffLines(oldText: string, newText: string): DiffLine[] {
  const lines: DiffLine[] = []
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')

  if (oldLines.length === 1 && oldLines[0] === '' && newLines.length === 1 && newLines[0] === '') {
    return lines
  }

  for (const line of oldLines) {
    if (line.length > 0 || oldLines.length > 1) {
      lines.push({ type: 'remove', content: line })
    }
  }

  for (const line of newLines) {
    if (line.length > 0 || newLines.length > 1) {
      lines.push({ type: 'add', content: line })
    }
  }

  return lines
}

export function buildWriteDiffLines(content: string): DiffLine[] {
  if (!content) return []
  return content.split('\n').map((line) => ({ type: 'add' as const, content: line }))
}

export function getCodeChangeLabel(tool: CodeChangeTool): string {
  switch (tool) {
    case 'apply_edit':
      return 'Edited'
    case 'write_file':
      return 'Written'
    case 'delete_file':
      return 'Deleted'
    case 'move_file':
      return 'Moved'
  }
}
