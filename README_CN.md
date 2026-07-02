# LC Code

> 一款现代化的桌面代码编辑器，基于 Electron + React 构建，专为开发者打造的高效编码体验。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Electron](https://img.shields.io/badge/Electron-33.3-479DEE?logo=electron)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)

---

## 📋 目录

- [功能特性](#-功能特性)
- [架构设计](#-架构设计)
- [项目结构](#-项目结构)
- [技术栈](#-技术栈)
- [快速开始](#-快速开始)
- [AI Agent 工具详解](#-ai-agent-工具详解)
- [核心功能深入](#-核心功能深入)
- [快捷键](#-快捷键)
- [数据库 Schema](#-数据库-schema)
- [安全机制](#-安全机制)
- [贡献指南](#-贡献指南)

---

## 🌟 功能特性

### 代码编辑
- **Monaco Editor** 引擎，提供业界领先的代码编辑体验
- 完整的语法高亮支持（数百种语言）
- 智能代码补全和错误检测
- **TypeScript 类型库加载** — 自动加载 `.d.ts` 文件支持类型提示
- 代码折叠、多光标编辑、查找替换
- 自定义用户/系统设置（JSON 格式）

### 内置终端
- **xterm.js** 前端终端 + **node-pty** 后端伪终端
- 支持 Windows、macOS、Linux 平台
- **多终端会话管理** — 基于 UUID 管理多个终端实例
- 自动检测系统默认 Shell（PowerShell / cmd / bash / zsh）
- 支持 ANSI 颜色输出和自定义样式

### AI Agent
- **多会话管理** — 每个工作区支持多个对话，持久化存储
- 13 种强大工具集成
- 支持自然语言操作项目文件
- **上下文压缩** — 智能对话摘要，自动管理 Token 限制
- **代码变更追踪** — 提取并展示工具调用的文件修改
- 代码生成、重构、解释
- 终端命令执行
- 支持自定义 Agent 配置

### 文件管理
- 文件树查看与导航
- 文件创建、重命名、删除、复制、移动
- 文件内容读写操作
- 目录遍历（支持递归，可配置深度限制）
- **文件类型扩展** — 支持更多文本文件类型（Dockerfile、.env 等）

### 本地数据库
- **SQLite** 本地数据存储（WAL 模式）
- 项目配置持久化
- AI 对话历史存储
- 用户设置管理
- 工作区状态跟踪

### 其他特性
- 实时文件监听（基于 **chokidar**）
- 多标签页支持
- 自定义主题

---

## 🏗️ 架构设计

```
┌──────────────────────────────────────────────────────────────┐
│                    渲染进程 (Renderer)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              React UI (index.tsx)                     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐     │   │
│  │  │ FileTree │ │  Editor  │ │    Terminal      │     │   │
│  │  │  Panel   │ │          │ │    Panel         │     │   │
│  │  └──────────┘ └──────────┘ └──────────────────┘     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐     │   │
│  │  │  Agent   │ │ Settings │ │   WelcomePage    │     │   │
│  │  │  Panel   │ │  Panel   │ │                  │     │   │
│  │  └──────────┘ └──────────┘ └──────────────────┘     │   │
│  └──────────────────────────────────────────────────────┘   │
│                      │                                       │
│              IPC (contextBridge)                              │
└──────────────────────┼───────────────────────────────────────┘
                       │
┌──────────────────────┼───────────────────────────────────────┐
│                   主进程 (Main)                              │
│  ┌───────────────────┴──────────────────────────────────┐   │
│  │           IPC Handlers (ipcMain)                     │   │
│  │  file.* | terminal.* | agent.* | config.*            │   │
│  └───────────────────┬──────────────────────────────────┘   │
│                      │                                       │
│  ┌───────────────────┴──────────────────────────────────┐   │
│  │         Service Layer (模块化)                        │   │
│  │  File | Terminal | Config | Editor | Security        │   │
│  │  Agent | AgentChat | AgentTool | Context | Command   │   │
│  └───────────────────┬──────────────────────────────────┘   │
│                      │                                       │
│  ┌───────────────────┴──────────────────────────────────┐   │
│  │         Database (better-sqlite3, WAL mode)         │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 服务层架构

```
┌──────────────────────────────────────────────────────┐
│                   Agent 服务层                        │
├──────────────────────────────────────────────────────┤
│  AgentService        → LLM 聊天 & 工具调用循环        │
│  AgentChatService    → 多会话 CRUD、对话管理           │
│  AgentToolService    → 13 种工具定义 & 执行           │
│  ContextService      → 上下文压缩 & 摘要               │
│  ContextApi          → 上下文快照 & Token 追踪         │
│  CommandService      → Shell 命令执行                  │
└──────────────────────────────────────────────────────┘
```

### 进程间通信（IPC）

采用 **contextBridge + ipcRenderer** 的安全通信模式：

1. **渲染进程** 通过 `window.api` API 调用主进程功能
2. **主进程** 通过 `ipcMain.handle` 处理请求并返回结果
3. **安全隔离**：渲染进程无法直接访问 Node.js API

```typescript
// 渲染进程调用示例
const content = await window.api.readFile({ path: filePath });

// 主进程处理示例
ipcMain.handle('file:read', async (_event, args) => {
  return fileService.read(args);
});
```

---

## 📁 项目结构

```
lc_code/
├── package.json              # 项目配置和依赖
├── electron.vite.config.ts   # Electron-Vite 构建配置
├── tsconfig.json             # TypeScript 配置
├── tsconfig.node.json        # 主进程 TS 配置
├── tsconfig.web.json         # 渲染进程 TS 配置
├── README.md                 # 英文说明文档
├── README_CN.md              # 中文说明文档
│
├── resources/                # 静态资源
│   └── .gitkeep
│
├── scripts/                  # 构建脚本
│   ├── install-native.js     # 原生依赖安装
│   ├── build-demo-gif.py     # 演示 GIF 生成
│   └── capture-window.ps1    # 窗口截图
│
├── docs/                     # 文档
│   └── demo/
│       └── screenshots/      # 截图
│
├── src/
│   ├── main/                 # Electron 主进程
│   │   ├── index.ts          # 主进程入口
│   │   ├── menu.ts           # 原生菜单
│   │   ├── shortcuts.ts      # 全局快捷键
│   │   ├── services/         # 核心服务层（模块化）
│   │   │   ├── FileService.ts          # 文件操作 & 监听 & TS 库加载
│   │   │   ├── TerminalService.ts      # 终端会话管理
│   │   │   ├── ConfigService.ts        # 设置 & 偏好
│   │   │   ├── EditorService.ts        # 打开文件管理
│   │   │   ├── SecurityService.ts      # 工作区路径验证
│   │   │   ├── AgentService.ts         # LLM 聊天 & 工具调用
│   │   │   ├── AgentChatService.ts     # 多会话对话管理
│   │   │   ├── AgentToolService.ts     # 13 种工具定义 & 执行
│   │   │   ├── ContextService.ts       # 上下文压缩
│   │   │   ├── CommandService.ts       # Shell 命令执行
│   │   │   └── file-utils.ts           # 文件工具函数
│   │   ├── ipc/              # IPC 频道定义 & 处理
│   │   │   ├── index.ts
│   │   │   ├── file.ipc.ts
│   │   │   ├── terminal.ipc.ts
│   │   │   ├── config.ipc.ts
│   │   │   ├── dialog.ipc.ts
│   │   │   ├── editor.ipc.ts
│   │   │   └── agent.ipc.ts
│   │   ├── db/               # 数据库
│   │   │   ├── database.ts   # SQLite 连接 & WAL 模式
│   │   │   └── migrations.ts # 表迁移 & 种子数据
│   │   └── utils/
│   │       └── logger.ts     # 日志工具
│   │
│   ├── preload/              # 预加载脚本
│   │   └── index.ts          # contextBridge 暴露 API
│   │
│   ├── renderer/             # React 渲染进程
│   │   ├── index.html        # HTML 入口
│   │   ├── main.tsx          # React 入口挂载
│   │   ├── App.tsx           # 应用根组件
│   │   ├── index.css         # 全局样式 (Tailwind)
│   │   ├── env.d.ts          # TypeScript 声明
│   │   ├── components/       # React 组件
│   │   │   ├── layout/       # 应用布局组件
│   │   │   │   ├── ActivityBar.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── EditorArea.tsx
│   │   │   │   ├── BottomPanel.tsx
│   │   │   │   ├── StatusBar.tsx
│   │   │   │   └── WelcomePage.tsx
│   │   │   ├── editor/       # Monaco 编辑器封装
│   │   │   │   ├── MonacoEditor.tsx
│   │   │   │   ├── EditorPane.tsx
│   │   │   │   ├── TabBar.tsx
│   │   │   │   ├── MarkdownPreview.tsx
│   │   │   │   └── MarkdownViewToolbar.tsx
│   │   │   ├── file-tree/    # 文件树组件
│   │   │   │   ├── FileTree.tsx
│   │   │   │   └── FileTypeIcon.tsx
│   │   │   ├── terminal/     # 终端组件
│   │   │   │   └── TerminalPanel.tsx
│   │   │   ├── agent/        # AI Agent 聊天 UI
│   │   │   │   ├── AgentPanel.tsx
│   │   │   │   ├── ConversationHistory.tsx
│   │   │   │   ├── CodeChangeBlock.tsx
│   │   │   │   └── ContextRing.tsx
│   │   │   ├── settings/     # 设置面板
│   │   │   │   └── SettingsPanel.tsx
│   │   │   ├── ui/           # 共享 UI 原语 (Radix UI)
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── scroll-area.tsx
│   │   │   │   ├── separator.tsx
│   │   │   │   └── switch.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── lib/              # 前端工具
│   │   │   ├── monaco-setup.ts      # Monaco 配置
│   │   │   ├── monaco-uri.ts        # Monaco URI 处理
│   │   │   ├── monaco-workspace.ts  # Monaco 工作区配置
│   │   │   ├── file-icons.ts        # 文件图标映射
│   │   │   └── utils.ts
│   │   └── stores/           # Zustand 状态管理
│   │       ├── index.ts
│   │       ├── agentStore.ts
│   │       └── ...
│   │
│   └── shared/               # 主进程与渲染进程共享代码
│       ├── types.ts              # 核心类型定义
│       ├── ipc-channels.ts       # IPC 频道常量
│       ├── file-types.ts         # 文件操作类型
│       ├── agent-types.ts        # AI Agent 类型 & 配置
│       ├── agent-context.ts      # 上下文压缩逻辑
│       ├── agent-tool-display.ts # 代码变更提取 & Diff
│       └── type-lib-types.ts     # TypeScript 库类型
│
├── out/                      # 构建输出
└── release/                  # 发布版本
```

### 核心文件说明

| 文件 | 说明 |
|------|------|
| `src/main/index.ts` | Electron 主进程入口，创建窗口，注册 IPC 处理器 |
| `src/main/services/FileService.ts` | 文件读写、创建、删除、复制、移动、TypeScript 库加载 |
| `src/main/services/TerminalService.ts` | 终端会话管理，基于 UUID 支持多终端 |
| `src/main/services/AgentService.ts` | LLM 聊天、工具调用循环 |
| `src/main/services/AgentChatService.ts` | 多会话 CRUD、对话持久化 |
| `src/main/services/AgentToolService.ts` | 13 种工具定义 & 执行 |
| `src/main/services/ContextService.ts` | 上下文压缩 & 摘要生成 |
| `src/main/services/CommandService.ts` | Shell 命令执行 |
| `src/preload/index.ts` | 安全桥接，暴露 `window.api` API |
| `src/renderer/App.tsx` | 应用根组件 |
| `src/renderer/components/MonacoEditor.tsx` | Monaco 编辑器封装 |
| `src/shared/ipc-channels.ts` | 所有 IPC 频道常量定义 |
| `src/shared/agent-types.ts` | AI Agent 类型定义 |

---

## 🛠️ 技术栈

### 核心框架

| 技术 | 版本 | 用途 |
|------|------|------|
| [Electron](https://www.electronjs.org/) | 33 | 桌面应用框架 |
| [React](https://react.dev/) | 19 | UI 框架 |
| [TypeScript](https://www.typescriptlang.org/) | 5.7 | 类型安全 |
| [Vite](https://vitejs.dev/) | 6 | 构建工具 |
| [Electron-Vite](https://electron-vite.org/) | 3 | Electron 构建 |

### UI 与样式

| 技术 | 版本 | 用途 |
|------|------|------|
| [Tailwind CSS](https://tailwindcss.com/) | 4 | 原子化 CSS |
| [Radix UI](https://www.radix-ui.com/) | latest | 无样式 UI 组件 |
| [lucide-react](https://lucide.dev/) | latest | 图标库 |
| [react-markdown](https://github.com/remarkjs/react-markdown) | 10 | Markdown 渲染 |

### 编辑器与终端

| 技术 | 版本 | 用途 |
|------|------|------|
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | latest | 代码编辑器 |
| [xterm.js](https://xtermjs.org/) | latest | 终端前端 |
| [node-pty](https://github.com/Tyriar/node-pty) | latest | 终端后端 |

### 工具与库

| 技术 | 版本 | 用途 |
|------|------|------|
| [Zustand](https://github.com/pmndrs/zustand) | latest | 状态管理 |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | latest | 本地数据库 |
| [chokidar](https://github.com/paulmillr/chokidar) | latest | 文件监听 |
| [class-variance-authority](https://cva.style/) | latest | 条件样式 |
| [clsx](https://github.com/lukeed/clsx) | latest | 条件类名 |
| [tailwind-merge](https://github.com/dcastil/tailwind-merge) | latest | Tailwind 类合并 |

### 开发工具

| 技术 | 版本 | 用途 |
|------|------|------|
| [electron-builder](https://www.electron.build/) | latest | 应用打包 |
| [electron-rebuild](https://github.com/electron/electron-rebuild) | latest | 原生依赖重建 |

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0 或 **pnpm** >= 8.0.0

### 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd lc_code

# 安装依赖（使用 npm）
npm install

# 或使用 pnpm（推荐）
pnpm install
```

### 开发模式

```bash
# 启动开发服务器（热重载）
npm run dev

# 或使用 pnpm
pnpm dev
```

这将同时启动 Electron 主进程和 Vite 开发服务器，修改代码后自动重载。

### 构建

```bash
# 构建生产版本
npm run build

# 或使用 pnpm
pnpm build
```

构建产物输出到 `out/` 目录。

### 打包应用

```bash
# 打包为可安装应用（Windows/macOS/Linux）
npm run dist

# 或使用 pnpm
pnpm dist
```

打包产物输出到 `release/` 目录。

### 发布

```bash
# 构建并发布（需要配置 GitHub Token）
npm run dist

# 或使用 pnpm
pnpm dist
```

### 预览构建产物

```bash
# 预览生产构建
npm run preview

# 或使用 pnpm
pnpm preview
```

### 原生依赖重建

如果原生模块构建失败：

```bash
npm run rebuild
```

---

## 🤖 AI Agent 工具详解

LC Code 内置了一个强大的 AI Agent，支持 **多会话管理** 和以下 **13 种工具**：

### 文件操作类

| 工具 | 说明 | 参数 |
|------|------|------|
| `read_file` | 读取文件内容（支持行范围） | `path`: 文件路径, `start_line`/`end_line`: 行范围 |
| `write_file` | 写入文件内容 | `path`: 文件路径, `content`: 内容 |
| `apply_edit` | 精确编辑文件（替换指定文本，推荐用于小修改） | `path`, `old_string`, `new_string`, `replace_all` |
| `create_directory` | 创建目录及父目录 | `path`: 目录路径 |
| `delete_file` | 删除文件或目录 | `path`: 文件/目录路径 |
| `move_file` | 移动或重命名文件/目录 | `from_path`, `to_path` |

### 搜索与查询类

| 工具 | 说明 | 参数 |
|------|------|------|
| `search_files` | 按 glob 模式搜索文件（如 `**/*.ts`） | `pattern`: 搜索模式, `cwd`: 搜索目录, `max_results` |
| `grep` | 在文件中搜索文本/正则 | `query`: 搜索内容, `glob`: 文件过滤, `regex`, `case_sensitive` |
| `search_symbols` | 搜索代码符号（函数/类/接口/变量/方法/类型） | `query`: 符号名称, `cwd`, `max_results` |

### 文件信息类

| 工具 | 说明 | 参数 |
|------|------|------|
| `get_file_info` | 获取文件元数据（大小、修改时间、创建时间） | `path`: 文件路径 |
| `list_directory` | 列出目录内容（支持递归） | `path`: 目录路径, `recursive`, `max_depth` |

### 编辑器操作类

| 工具 | 说明 | 参数 |
|------|------|------|
| `get_open_files` | 获取当前打开的文件及内容（包括未保存更改） | 无参数 |

### 命令执行类

| 工具 | 说明 | 参数 |
|------|------|------|
| `run_command` | 执行 Shell 命令（推荐优先使用 grep/search_files） | `command`: 命令, `cwd`: 工作目录 |

### AI Agent 架构

```
┌─────────────────────────────────────────────────────┐
│                  Agent 架构                          │
├─────────────────────────────────────────────────────┤
│  AgentService                                        │
│  ├── chat()           → 同步聊天                    │
│  └── chatStream()     → 流式聊天（模拟）             │
│                                                      │
│  AgentChatService                                    │
│  ├── listConversations()  → 列出会话                 │
│  ├── getConversation()    → 获取会话                 │
│  ├── createConversation() → 创建会话                 │
│  ├── saveConversation()   → 保存会话                 │
│  ├── deleteConversation() → 删除会话                 │
│  └── ensureActive()       → 确保活跃会话             │
│                                                      │
│  AgentToolService                                    │
│  ├── AGENT_TOOLS        → 13 种工具定义              │
│  └── executeAgentTool() → 工具执行                   │
│                                                      │
│  ContextService                                      │
│  └── prepareAgentContext() → 上下文压缩              │
│                                                      │
│  CommandService                                      │
│  └── runCommand()       → Shell 命令执行             │
└─────────────────────────────────────────────────────┘
```

### AI Agent 配置

Agent 配置存储在 SQLite 数据库中，支持自定义：
- Agent 名称和描述
- 系统提示词（自动生成，包含工作区路径）
- 模型配置（provider, model, temperature 等）
- 上下文窗口大小
- 可用工具列表

---

## 🔍 核心功能深入

### File Service（文件服务）

文件服务封装了所有文件操作，提供统一的 API：

```typescript
// 读取文件（支持行范围）
const content = await fileService.readFile({ path: '/path/to/file.txt' });
const lines = await fileService.readFile({ path: '/path/to/file.txt', startLine: 10, endLine: 20 });

// 写入文件
await fileService.writeFile({ path: '/path/to/file.txt', content: 'hello' });

// 精确编辑
await fileService.applyEdit({ path: '/path/to/file.txt', oldString: 'old', newString: 'new' });

// 创建目录
await fileService.createDirectory({ path: '/path/to/dir' });

// 删除文件
await fileService.deleteFile({ path: '/path/to/file.txt' });

// 列出目录（支持递归）
const files = await fileService.readDir({ path: '/path/to/dir', recursive: true, maxDepth: 5 });

// 搜索文件
const matches = await fileService.searchFiles({ pattern: '**/*.ts' });

// 文本搜索
const grep = await fileService.grep({ query: 'function', regex: true });

// 搜索代码符号
const symbols = await fileService.searchSymbols({ query: 'App' });

// 加载 TypeScript 类型库
const libs = await fileService.loadTypeScriptLibs();
```

**安全措施：**
- 路径验证，防止目录穿越
- 文件编码处理（UTF-8）
- 文件大小限制（5MB）
- 递归深度限制
- 忽略目录过滤（`node_modules`, `.git` 等）

### Terminal Service（终端服务）

终端服务管理所有终端会话：

```typescript
// 创建终端（返回终端 ID）
const terminalId = await terminalService.create(cwd);

// 向终端写入数据
terminalService.write(terminalId, 'ls -la\n');

// 调整终端大小
terminalService.resize(terminalId, cols, rows);

// 销毁终端
terminalService.destroy(terminalId);

// 销毁所有终端
terminalService.destroyAll();
```

**特性：**
- 自动检测系统默认 Shell
- 支持多终端标签页
- PTY 后端（node-pty）
- Spawn 回退模式（Windows 无 VS Build Tools 时）
- ANSI 颜色支持
- 独立窗口模式

### 上下文压缩（Context Compression）

上下文压缩系统自动管理 Token 使用：

```
┌─────────────────────────────────────────────────┐
│              上下文压缩流程                       │
├─────────────────────────────────────────────────┤
│                                                  │
│  1. Token 估算                                   │
│     system_prompt + messages > 85% 预算          │
│                                                  │
│  2. 保留最近消息                                 │
│     保留最后 6 条消息                            │
│                                                  │
│  3. 压缩旧消息                                   │
│     发送旧消息到 LLM 生成摘要                     │
│                                                  │
│  4. 递归压缩                                     │
│     如果仍超限，递归压缩摘要                      │
│                                                  │
│  5. 构建压缩上下文                               │
│     [摘要] + [最近消息]                          │
│                                                  │
│  6. 失败回退                                     │
│     截断到最大字符数 (4000)                      │
│                                                  │
└─────────────────────────────────────────────────┘
```

**关键参数：**
- `CONTEXT_COMPRESS_THRESHOLD`: 0.85（85% 触发压缩）
- `CONTEXT_KEEP_RECENT_MESSAGES`: 6（保留最近 6 条消息）
- `TOOLS_TOKEN_OVERHEAD`: 3200（工具定义 Token 开销）

### 文件监听

使用 chokidar 实现实时文件监听：

```typescript
// 监听目录变化
const watcher = chokidar.watch(directory, {
  ignored: (p) => IGNORED_DIRS.has(path.basename(p)),
  ignoreInitial: true,
  persistent: true,
  depth: 99
});

watcher.on('change', (path) => { /* 文件内容变化 */ });
watcher.on('add', (path) => { /* 新文件添加 */ });
watcher.on('unlink', (path) => { /* 文件删除 */ });
```

**忽略目录：** `node_modules`, `.git`, `dist`, `out`, `release`, `.cursor`, `coverage`, `.next`, `build`

---

## ⌨️ 快捷键

### 全局快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + O` | 打开文件夹 |
| `Ctrl/Cmd + S` | 保存文件 |
| `Ctrl/Cmd + `` ` | 切换终端面板 |
| `Ctrl/Cmd + ,` | 切换设置面板 |
| `Ctrl/Cmd + Shift + N` | 切换终端（保留） |
| `Ctrl/Cmd + Shift + `` ` | 新建终端 |
| `F5` | 刷新/重新加载 |
| `Ctrl/Cmd + Shift + I` | 开发者工具 |

### 原生菜单

应用程序提供完整的原生菜单：
- **File** — 打开文件夹、打开最近项目、关闭/退出
- **Edit** — 撤销、重做、剪切、复制、粘贴、全选
- **View** — 切换终端、切换设置、缩放、全屏
- **Terminal** — 新建终端
- **Help** — 关于 LC Code

---

## 🗄️ 数据库 Schema

LC Code 使用 SQLite 存储应用数据，数据库文件位于用户数据目录。

### 表结构

#### `settings` — 用户设置

| 字段 | 类型 | 说明 |
|------|------|------|
| `key` | TEXT (PK) | 设置键 |
| `value` | TEXT | 设置值（JSON） |

#### `recent_projects` — 最近项目

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER (PK) | 自增 ID |
| `path` | TEXT (UNIQUE) | 项目路径 |
| `name` | TEXT | 项目名称 |
| `opened_at` | INTEGER | 打开时间戳 |

> 最多保留最近 10 个项目

#### `keybindings` — 快捷键绑定

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER (PK) | 自增 ID |
| `command` | TEXT (UNIQUE) | 命令标识 |
| `key` | TEXT | 快捷键组合 |

#### `agent_chat_sessions` — 旧版单会话存储（已迁移）

| 字段 | 类型 | 说明 |
|------|------|------|
| `workspace_path` | TEXT (PK) | 工作区路径 |
| `context_summary` | TEXT | 上下文摘要 |
| `context_used/limit/source` | INTEGER/TEXT | Token 追踪 |
| `messages_json` | TEXT | 消息 JSON |
| `updated_at` | INTEGER | 更新时间 |

#### `agent_conversations` — 多会话存储

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT (PK) | 会话唯一 ID |
| `workspace_path` | TEXT | 工作区路径 |
| `title` | TEXT | 会话标题（自动从首条用户消息提取） |
| `context_summary` | TEXT | 压缩上下文摘要 |
| `context_used/limit/source` | INTEGER/TEXT | Token 追踪 |
| `messages_json` | TEXT | 消息 JSON 数组 |
| `created_at/updated_at` | INTEGER | 时间戳 |

> 索引：`idx_agent_conversations_workspace (workspace_path, updated_at DESC)`

#### `agent_workspace_state` — 工作区状态

| 字段 | 类型 | 说明 |
|------|------|------|
| `workspace_path` | TEXT (PK) | 工作区路径 |
| `active_conversation_id` | TEXT | 当前活跃会话 ID |

> `ON CONFLICT(workspace_path) DO UPDATE` — 确保唯一性

---

## 🔒 安全机制

### 进程隔离

| 特性 | 说明 |
|------|------|
| **渲染进程隔离** | 渲染进程通过 contextBridge 访问主进程功能 |
| **Node.js 限制** | 渲染进程默认禁用 Node.js 集成 |
| **sandbox** | 渲染进程启用 sandbox |

### IPC 安全

| 机制 | 说明 |
|------|------|
| **频道验证** | 所有 IPC 请求通过预定义频道（`IPC_CHANNELS`） |
| **路径验证** | 文件路径安全检查，防止目录穿越 |

### 路径安全

| 机制 | 说明 |
|------|------|
| **工作区验证** | `SecurityService.validatePath()` 确保路径在工作区内 |
| **忽略目录** | 自动跳过 `node_modules`, `.git`, `dist` 等目录 |
| **文件大小** | 限制 5MB 以内文件读取 |

### 沙箱保护

- 渲染进程运行在沙箱中
- 通过 `contextBridge` 暴露安全的 API
- 防止 XSS 攻击

---

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

### 开发流程

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 使用 TypeScript 编写代码
- 遵循 ESLint 配置
- 添加必要的注释
- 编写单元测试

### 提交规范

遵循 [Conventional Commits](https://www.conventionalcomm.org/) 规范：

```
feat: 添加 AI Agent 文件编辑工具
fix: 修复终端颜色显示问题
docs: 更新 README 文档
style: 格式化代码
refactor: 重构文件服务
test: 添加单元测试
chore: 更新依赖
```

---

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

---

## 📞 联系方式

- **项目主页**: [GitHub Repository](<repository-url>)
- **问题反馈**: [GitHub Issues](<repository-url>/issues)
- **功能建议**: [GitHub Discussions](<repository-url>/discussions)

---

## 🙏 致谢

感谢以下开源项目：

- [Electron](https://www.electronjs.org/) - 桌面应用框架
- [React](https://react.dev/) - UI 框架
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - 代码编辑器
- [xterm.js](https://xtermjs.org/) - 终端组件
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Zustand](https://github.com/pmndrs/zustand) - 状态管理
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - 数据库
- [Radix UI](https://www.radix-ui.com/) - 无样式 UI 组件
- [lucide-react](https://lucide.dev/) - 图标库

---

<div align="center">

**LC Code** — 为开发者打造的现代化桌面代码编辑器

Made with ❤️ by the LC Code Team

</div>
