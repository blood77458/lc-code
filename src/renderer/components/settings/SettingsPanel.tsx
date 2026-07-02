import { useEffect, useState, type ReactNode } from 'react'
import { Input } from '@renderer/components/ui/input'
import { Switch } from '@renderer/components/ui/switch'
import { Separator } from '@renderer/components/ui/separator'
import { useUIStore } from '@renderer/stores'
import type { AppConfig, Keybinding } from '@shared/types'
import type { AgentConfig } from '@shared/agent-types'
import { DEFAULT_AGENT_CONFIG } from '@shared/agent-types'

export function SettingsPanel() {
  const { config, setConfig, updateConfig } = useUIStore()
  const [keybindings, setKeybindings] = useState<Keybinding[]>([])
  const [agentConfig, setAgentConfig] = useState<AgentConfig>(DEFAULT_AGENT_CONFIG)

  useEffect(() => {
    window.api.getConfig().then(setConfig)
    window.api.getKeybindings().then(setKeybindings)
    window.api.getAgentConfig().then(setAgentConfig)
  }, [setConfig])

  const handleChange = async (key: keyof AppConfig, value: unknown) => {
    updateConfig(key, value)
    await window.api.setConfig(key, value)
  }

  const handleKeybindingChange = async (command: string, key: string) => {
    await window.api.setKeybinding(command, key)
    const updated = await window.api.getKeybindings()
    setKeybindings(updated)
  }

  const handleAgentChange = async (key: keyof AgentConfig, value: string | number) => {
    const updated = { ...agentConfig, [key]: value }
    setAgentConfig(updated)
    await window.api.setAgentConfig(updated)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-9 shrink-0 items-center border-b border-border px-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Settings
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="space-y-6 p-4">
          <section>
            <h3 className="mb-3 text-sm font-medium text-foreground">Agent / LLM</h3>
            <div className="space-y-4">
              <SettingRow label="API Base URL">
                <Input
                  value={agentConfig.apiUrl}
                  onChange={(e) => handleAgentChange('apiUrl', e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-52"
                />
              </SettingRow>
              <SettingRow label="API Key">
                <Input
                  type="password"
                  value={agentConfig.apiKey}
                  onChange={(e) => handleAgentChange('apiKey', e.target.value)}
                  placeholder="sk-..."
                  className="w-52"
                />
              </SettingRow>
              <SettingRow label="Model">
                <Input
                  value={agentConfig.model}
                  onChange={(e) => handleAgentChange('model', e.target.value)}
                  placeholder="gpt-4o-mini"
                  className="w-52"
                />
              </SettingRow>
              <SettingRow label="Context Window">
                <Input
                  type="number"
                  min={4096}
                  max={262144}
                  step={1024}
                  value={agentConfig.contextWindow}
                  onChange={(e) =>
                    handleAgentChange('contextWindow', Number(e.target.value))
                  }
                  className="w-28"
                />
              </SettingRow>
              <SettingRow label="Max Tokens">
                <Input
                  type="number"
                  min={256}
                  max={128000}
                  value={agentConfig.maxTokens}
                  onChange={(e) =>
                    handleAgentChange('maxTokens', Number(e.target.value))
                  }
                  className="w-28"
                />
              </SettingRow>
              <SettingRow label="Temperature">
                <Input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={agentConfig.temperature}
                  onChange={(e) =>
                    handleAgentChange('temperature', Number(e.target.value))
                  }
                  className="w-28"
                />
              </SettingRow>
            </div>
            <p className="mt-3 text-xs text-muted">
              Compatible with OpenAI API format (OpenAI, Azure, Ollama, DeepSeek, llama-server, etc.)
              Context ring compresses older messages automatically at ~85% usage.
            </p>
          </section>

          <Separator />

          <section>
            <h3 className="mb-3 text-sm font-medium text-foreground">Editor</h3>
            <div className="space-y-4">
              <SettingRow label="Font Family">
                <Input
                  value={config.fontFamily}
                  onChange={(e) => handleChange('fontFamily', e.target.value)}
                  className="w-52"
                />
              </SettingRow>
              <SettingRow label="Font Size">
                <Input
                  type="number"
                  min={10}
                  max={32}
                  value={config.fontSize}
                  onChange={(e) => handleChange('fontSize', Number(e.target.value))}
                  className="w-28"
                />
              </SettingRow>
              <SettingRow label="Tab Size">
                <Input
                  type="number"
                  min={1}
                  max={8}
                  value={config.tabSize}
                  onChange={(e) => handleChange('tabSize', Number(e.target.value))}
                  className="w-28"
                />
              </SettingRow>
              <SettingRow label="Word Wrap">
                <Switch
                  checked={config.wordWrap}
                  onCheckedChange={(v) => handleChange('wordWrap', v)}
                />
              </SettingRow>
              <SettingRow label="Minimap">
                <Switch
                  checked={config.minimap}
                  onCheckedChange={(v) => handleChange('minimap', v)}
                />
              </SettingRow>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="mb-3 text-sm font-medium text-foreground">Terminal</h3>
            <SettingRow label="Font Size">
              <Input
                type="number"
                min={10}
                max={24}
                value={config.terminalFontSize}
                onChange={(e) =>
                  handleChange('terminalFontSize', Number(e.target.value))
                }
                className="w-28"
              />
            </SettingRow>
          </section>

          <Separator />

          <section>
            <h3 className="mb-3 text-sm font-medium text-foreground">Keybindings</h3>
            <div className="space-y-4">
              {keybindings.map((kb) => (
                <SettingRow key={kb.command} label={kb.command}>
                  <Input
                    value={kb.key}
                    onChange={(e) => handleKeybindingChange(kb.command, e.target.value)}
                    className="w-36 font-mono text-xs"
                  />
                </SettingRow>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function SettingRow({
  label,
  children
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-8 gap-y-1">
      <span className="text-sm text-muted">{label}</span>
      <div className="justify-self-end">{children}</div>
    </div>
  )
}
