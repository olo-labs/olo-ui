import { useState } from 'react'
import { testModelProvider } from '../../api/rest'
import { workflowConfigurationStore } from '../../store/workflowConfigurationStore'
import {
  DEFAULT_ROUTING_ID,
  MODEL_PROVIDER_KINDS,
  emptyModelProvider,
  primaryModelRouting,
  providerApiKey,
  providerBaseUrl,
  providerKind,
  removeModelProvider,
  setPrimaryRoutingDefaultProvider,
  upsertModelProvider,
  workflowModelProviders,
  type ModelProviderKind,
} from '../../lib/workflowModelProviders'
import type { ModelProvider } from '../../types/workflow'

type TestState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'ok'; message: string; latencyMs?: number }
  | { status: 'error'; message: string }

function configurationForKind(
  kind: ModelProviderKind,
  current: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const meta = MODEL_PROVIDER_KINDS.find((k) => k.id === kind)!
  const next: Record<string, unknown> = { ...current }
  if (!next.baseUrl) next.baseUrl = meta.defaultBaseUrl
  if (kind !== 'openai' && kind !== 'url') {
    delete next.apiKey
    delete next.apiKeyRef
  }
  return next
}

function modelForKind(kind: ModelProviderKind, currentModel: string | undefined): string {
  const meta = MODEL_PROVIDER_KINDS.find((k) => k.id === kind)!
  if (currentModel?.trim()) return currentModel
  return meta.defaultModel ?? ''
}

export function ModelProvidersSection() {
  const draft = workflowConfigurationStore((s) => s.draft)
  const updateDraft = workflowConfigurationStore((s) => s.updateDraft)
  const providers = draft ? workflowModelProviders(draft) : []
  const defaultRouting = draft ? primaryModelRouting(draft) : null
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ModelProvider | null>(null)
  const [testState, setTestState] = useState<TestState>({ status: 'idle' })

  if (!draft) {
    return <p className="builder-empty">Open a workflow to edit model providers.</p>
  }

  const startEdit = (provider: ModelProvider) => {
    setEditingId(provider.id)
    setForm({ ...provider, configuration: { ...provider.configuration } })
    setTestState({ status: 'idle' })
  }

  const startAdd = () => {
    const next = emptyModelProvider(providers)
    setEditingId('__new__')
    setForm(next)
    setTestState({ status: 'idle' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(null)
    setTestState({ status: 'idle' })
  }

  const saveForm = () => {
    if (!form || !form.id.trim() || !form.provider.trim()) return
    const previous = editingId === '__new__' ? undefined : editingId ?? undefined
    updateDraft(
      upsertModelProvider(
        draft,
        {
          ...form,
          id: form.id.trim(),
          provider: form.provider.trim(),
          model: form.model?.trim() ?? '',
        },
        previous,
      ),
    )
    cancelEdit()
  }

  const handleDelete = (id: string) => {
    updateDraft(removeModelProvider(draft, id))
    if (editingId === id) cancelEdit()
  }

  const runTest = async () => {
    if (!form) return
    setTestState({ status: 'running' })
    try {
      const result = await testModelProvider({
        provider: form.provider,
        model: form.model,
        configuration: form.configuration,
      })
      if (result.ok) {
        setTestState({
          status: 'ok',
          message: result.message,
          latencyMs: result.latencyMs,
        })
      } else {
        setTestState({ status: 'error', message: result.message })
      }
    } catch (e) {
      setTestState({
        status: 'error',
        message: e instanceof Error ? e.message : 'Test request failed',
      })
    }
  }

  const kind = form ? providerKind(form) : 'local'

  return (
    <div className="builder-variables builder-model-providers">
      {defaultRouting && providers.length > 0 ? (
        <div className="builder-routing-default">
          <label className="builder-field">
            <span>Default routing ({defaultRouting.id ?? DEFAULT_ROUTING_ID})</span>
            <select
              className="builder-input"
              value={defaultRouting.defaultProviderId ?? ''}
              onChange={(e) =>
                updateDraft(setPrimaryRoutingDefaultProvider(draft, e.target.value))
              }
            >
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.id} ({providerKind(provider)} · {provider.model || 'default'})
                </option>
              ))}
            </select>
          </label>
          <p className="builder-field-hint">
            Agents using the default routing profile resolve to this provider unless overridden.
          </p>
        </div>
      ) : null}
      <button type="button" className="builder-btn small" onClick={startAdd}>
        + Add model provider
      </button>
      {providers.length === 0 && editingId !== '__new__' ? (
        <p className="builder-empty">No model providers defined.</p>
      ) : (
        <ul className="builder-check-list">
          {providers.map((provider) => (
            <li key={provider.id} className="builder-variable-item">
              <button
                type="button"
                className="builder-variable-summary"
                onClick={() => startEdit(provider)}
              >
                <code>{provider.id}</code>
                <span className="builder-variable-type">
                  {providerKind(provider)} · {provider.model || 'no model'}
                </span>
              </button>
              <button
                type="button"
                className="builder-icon-btn danger"
                onClick={() => handleDelete(provider.id)}
                title="Remove model provider"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {form ? (
        <div className="builder-variable-form">
          <label className="builder-field">
            <span>Id</span>
            <input
              className="builder-input"
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
            />
          </label>
          <label className="builder-field">
            <span>Type</span>
            <select
              className="builder-input"
              value={kind}
              onChange={(e) => {
                const nextKind = e.target.value as ModelProviderKind
                setForm({
                  ...form,
                  provider: nextKind,
                  model: modelForKind(nextKind, form.model),
                  configuration: configurationForKind(nextKind, form.configuration),
                })
                setTestState({ status: 'idle' })
              }}
            >
              {MODEL_PROVIDER_KINDS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <p className="builder-field-hint">
            {MODEL_PROVIDER_KINDS.find((k) => k.id === kind)?.description}
          </p>
          <label className="builder-field">
            <span>Model</span>
            <input
              className="builder-input"
              placeholder="e.g. gpt-4o, llama3.2"
              value={form.model ?? ''}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
          </label>
          <label className="builder-field">
              <span>Base URL</span>
              <input
                className="builder-input"
                value={providerBaseUrl(form)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    configuration: { ...form.configuration, baseUrl: e.target.value },
                  })
                }
              />
            </label>
          {kind === 'openai' || kind === 'url' ? (
            <label className="builder-field">
              <span>API key (optional)</span>
              <input
                className="builder-input"
                type="password"
                autoComplete="off"
                placeholder={kind === 'openai' ? 'sk-… or ${env:OPENAI_API_KEY}' : 'Bearer token'}
                value={providerApiKey(form)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    configuration: {
                      ...form.configuration,
                      apiKey: e.target.value || undefined,
                    },
                  })
                }
              />
            </label>
          ) : null}
          <div className="builder-form-actions">
            <button
              type="button"
              className="builder-btn small"
              onClick={runTest}
              disabled={testState.status === 'running'}
            >
              {testState.status === 'running' ? 'Testing…' : 'Test connection'}
            </button>
          </div>
          {testState.status === 'ok' ? (
            <p className="model-provider-test-ok">
              {testState.message}
              {testState.latencyMs != null ? ` (${testState.latencyMs}ms)` : ''}
            </p>
          ) : null}
          {testState.status === 'error' ? (
            <p className="model-provider-test-error">{testState.message}</p>
          ) : null}
          <div className="builder-form-actions">
            <button type="button" className="builder-btn small" onClick={cancelEdit}>
              Cancel
            </button>
            <button type="button" className="builder-btn small primary" onClick={saveForm}>
              Save
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
