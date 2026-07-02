export const IPC_CHANNELS = {
  // File
  FILE_OPEN_FOLDER: 'file:openFolder',
  FILE_READ_DIR: 'file:readDir',
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_DELETE: 'file:delete',
  FILE_MOVE: 'file:move',
  FILE_MKDIR: 'file:mkdir',
  FILE_STAT: 'file:stat',
  FILE_SEARCH: 'file:search',
  FILE_GREP: 'file:grep',
  FILE_READ_RANGE: 'file:readRange',
  FILE_APPLY_EDIT: 'file:applyEdit',
  FILE_SEARCH_SYMBOLS: 'file:searchSymbols',
  FILE_LOAD_TYPE_LIBS: 'file:loadTypeLibs',
  FILE_WATCH: 'file:watch',
  FILE_UNWATCH: 'file:unwatch',
  FILE_CHANGE: 'file:change',

  // Terminal
  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_WRITE: 'terminal:write',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_DESTROY: 'terminal:destroy',
  TERMINAL_DATA: 'terminal:data',

  // Config
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  CONFIG_GET_RECENT: 'config:getRecentProjects',
  CONFIG_ADD_RECENT: 'config:addRecentProject',
  CONFIG_GET_KEYBINDINGS: 'config:getKeybindings',
  CONFIG_SET_KEYBINDING: 'config:setKeybinding',

  // Dialog
  DIALOG_SAVE: 'dialog:save',

  // Window
  WINDOW_TOGGLE_TERMINAL: 'window:toggleTerminal',
  WINDOW_TOGGLE_SETTINGS: 'window:toggleSettings',
  WINDOW_OPEN_FOLDER: 'window:openFolder',

  // Workspace
  WORKSPACE_OPEN: 'workspace:open',

  // Editor
  EDITOR_SYNC_OPEN_FILES: 'editor:syncOpenFiles',
  EDITOR_GET_OPEN_FILES: 'editor:getOpenFiles',

  // Agent
  AGENT_GET_CONFIG: 'agent:getConfig',
  AGENT_SET_CONFIG: 'agent:setConfig',
  AGENT_CHAT: 'agent:chat',
  AGENT_CHAT_STREAM: 'agent:chatStream',
  AGENT_STREAM_CHUNK: 'agent:streamChunk',
  AGENT_STREAM_DONE: 'agent:streamDone',
  AGENT_STREAM_ERROR: 'agent:streamError',
  AGENT_LIST_CONVERSATIONS: 'agent:listConversations',
  AGENT_GET_CONVERSATION: 'agent:getConversation',
  AGENT_CREATE_CONVERSATION: 'agent:createConversation',
  AGENT_SAVE_CONVERSATION: 'agent:saveConversation',
  AGENT_DELETE_CONVERSATION: 'agent:deleteConversation',
  AGENT_GET_ACTIVE_CONVERSATION: 'agent:getActiveConversation',
  AGENT_SET_ACTIVE_CONVERSATION: 'agent:setActiveConversation',
  AGENT_GET_CONTEXT: 'agent:getContext'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
