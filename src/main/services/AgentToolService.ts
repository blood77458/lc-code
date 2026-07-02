import path from 'node:path'
import { fileService } from './FileService'
import { editorService } from './EditorService'
import { runCommand } from './CommandService'
import { securityService } from './SecurityService'

export const AGENT_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'read_file',
      description:
        'Read file contents. Use start_line/end_line to read a specific range for large files.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path (absolute or relative)' },
          start_line: { type: 'number', description: 'Start line (1-based, optional)' },
          end_line: { type: 'number', description: 'End line (1-based, optional)' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'write_file',
      description: 'Write or overwrite a file in the workspace',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string' }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'apply_edit',
      description:
        'Apply a precise edit by replacing old_string with new_string. Prefer this over write_file for small changes.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          old_string: { type: 'string', description: 'Exact text to find (must match exactly)' },
          new_string: { type: 'string', description: 'Replacement text' },
          replace_all: { type: 'boolean', description: 'Replace all occurrences (default false)' }
        },
        required: ['path', 'old_string', 'new_string']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_directory',
      description: 'List files and directories. Set recursive=true to list all nested files.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path (defaults to workspace root)' },
          recursive: { type: 'boolean', description: 'List recursively (default false)' },
          max_depth: { type: 'number', description: 'Max depth when recursive (default 10)' }
        }
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_files',
      description:
        'Search for files by glob pattern. Examples: "**/*.ts", "src/**/*.tsx", "*.json"',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Glob pattern' },
          cwd: { type: 'string', description: 'Search root directory (optional)' },
          max_results: { type: 'number', description: 'Max results (default 500)' }
        },
        required: ['pattern']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'grep',
      description:
        'Search file contents for a text pattern. Returns path, line number, and matching line.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Text or regex to search' },
          cwd: { type: 'string', description: 'Directory to search in (optional)' },
          glob: { type: 'string', description: 'Filter files by glob, e.g. "**/*.ts"' },
          case_sensitive: { type: 'boolean', description: 'Case sensitive (default false)' },
          regex: { type: 'boolean', description: 'Treat query as regex (default false)' },
          max_results: { type: 'number', description: 'Max matches (default 200)' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_symbols',
      description:
        'Search for code symbols (functions, classes, interfaces) by name in TypeScript/JavaScript files',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Symbol name to search' },
          cwd: { type: 'string', description: 'Directory to search in (optional)' },
          max_results: { type: 'number', description: 'Max results (default 100)' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_file_info',
      description: 'Get file metadata: size, modified time, is directory',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_directory',
      description: 'Create a directory (and parent directories if needed)',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'delete_file',
      description: 'Delete a file or directory',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'move_file',
      description: 'Move or rename a file/directory',
      parameters: {
        type: 'object',
        properties: {
          from_path: { type: 'string' },
          to_path: { type: 'string' }
        },
        required: ['from_path', 'to_path']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_open_files',
      description:
        'Get files currently open in the editor with their contents (including unsaved changes)',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'run_command',
      description:
        'Execute a shell command. Prefer grep/search_files tools over shell grep when possible.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string' },
          cwd: { type: 'string', description: 'Working directory (optional)' }
        },
        required: ['command']
      }
    }
  }
]

function parseArgs(argsJson: string): Record<string, unknown> {
  try {
    return JSON.parse(argsJson) as Record<string, unknown>
  } catch {
    throw new Error(`Invalid tool arguments JSON: ${argsJson}`)
  }
}

export async function executeAgentTool(
  name: string,
  argsJson: string
): Promise<string> {
  const args = parseArgs(argsJson)

  switch (name) {
    case 'read_file': {
      const filePath = fileService.resolvePath(args.path as string)
      const content = await fileService.readFile(filePath, {
        startLine: args.start_line as number | undefined,
        endLine: args.end_line as number | undefined
      })
      return content
    }
    case 'write_file': {
      const filePath = fileService.resolvePath(args.path as string)
      await fileService.writeFile(filePath, (args.content as string) ?? '')
      return `Successfully wrote ${((args.content as string) ?? '').length} characters to ${filePath}`
    }
    case 'apply_edit': {
      const result = await fileService.applyEdit({
        path: args.path as string,
        oldString: args.old_string as string,
        newString: args.new_string as string,
        replaceAll: (args.replace_all as boolean) ?? false
      })
      return result
    }
    case 'list_directory': {
      const root = securityService.getWorkspaceRoot()!
      const dirPath = args.path
        ? fileService.resolvePath(args.path as string)
        : root
      const entries = await fileService.readDir(dirPath, {
        recursive: (args.recursive as boolean) ?? false,
        maxDepth: (args.max_depth as number) ?? 10
      })
      return JSON.stringify(
        entries.map((e) => ({
          name: e.name,
          path: e.path,
          type: e.isDirectory ? 'directory' : 'file'
        })),
        null,
        2
      )
    }
    case 'search_files': {
      const results = await fileService.searchFiles({
        pattern: args.pattern as string,
        cwd: args.cwd as string | undefined,
        maxResults: (args.max_results as number) ?? 500
      })
      return JSON.stringify(results, null, 2)
    }
    case 'grep': {
      const matches = await fileService.grep({
        query: args.query as string,
        cwd: args.cwd as string | undefined,
        glob: args.glob as string | undefined,
        caseSensitive: (args.case_sensitive as boolean) ?? false,
        regex: (args.regex as boolean) ?? false,
        maxResults: (args.max_results as number) ?? 200
      })
      return JSON.stringify(matches, null, 2)
    }
    case 'search_symbols': {
      const symbols = await fileService.searchSymbols({
        query: args.query as string,
        cwd: args.cwd as string | undefined,
        maxResults: (args.max_results as number) ?? 100
      })
      return JSON.stringify(symbols, null, 2)
    }
    case 'get_file_info': {
      const info = await fileService.getFileInfo(args.path as string)
      return JSON.stringify(info, null, 2)
    }
    case 'create_directory': {
      await fileService.createDirectory(args.path as string)
      return `Created directory: ${args.path}`
    }
    case 'delete_file': {
      await fileService.deleteFile(args.path as string)
      return `Deleted: ${args.path}`
    }
    case 'move_file': {
      await fileService.moveFile(args.from_path as string, args.to_path as string)
      return `Moved ${args.from_path} → ${args.to_path}`
    }
    case 'get_open_files': {
      const files = editorService.getOpenFiles()
      return JSON.stringify(files, null, 2)
    }
    case 'run_command': {
      const result = await runCommand(
        args.command as string,
        args.cwd as string | undefined
      )
      return JSON.stringify(result, null, 2)
    }
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}
