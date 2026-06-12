import type { ModelProvider, ModelRouting, WorkflowDocument } from '../types/workflow'

export const DEFAULT_LOCAL_OLLAMA_URL = 'http://localhost:51435'
export const DEFAULT_LOCAL_OLLAMA_MODEL = 'llama3.2:latest'
export const DEFAULT_PROVIDER_ID = 'default-local'
export const DEFAULT_ROUTING_ID = 'default-routing'

export const MODEL_PROVIDER_KINDS = [
  {
    id: 'local',
    label: 'Local (Ollama)',
    description: 'Models served on your machine (Ollama, LM Studio, etc.)',
    defaultBaseUrl: DEFAULT_LOCAL_OLLAMA_URL,
    defaultModel: DEFAULT_LOCAL_OLLAMA_MODEL,
  },
  {
    id: 'url',
    label: 'OpenAI-compatible URL',
    description: 'Remote HTTP endpoint exposing /v1/chat/completions or /v1/models',
    defaultBaseUrl: 'http://localhost:8080/v1',
    defaultModel: '',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'OpenAI API (api.openai.com)',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
  },
] as const

export type ModelProviderKind = (typeof MODEL_PROVIDER_KINDS)[number]['id']

export function workflowModelProviders(doc: WorkflowDocument): ModelProvider[] {
  return Array.isArray(doc.modelProviders) ? [...doc.modelProviders] : []
}

export function workflowModelRouting(doc: WorkflowDocument): ModelRouting[] {
  return Array.isArray(doc.modelRouting) ? [...doc.modelRouting] : []
}

export function primaryModelRouting(doc: WorkflowDocument): ModelRouting | null {
  const routing = workflowModelRouting(doc)
  return routing.find((r) => r.id === DEFAULT_ROUTING_ID) ?? routing[0] ?? null
}

export function defaultLocalProvider(): ModelProvider {
  return {
    id: DEFAULT_PROVIDER_ID,
    provider: 'local',
    model: DEFAULT_LOCAL_OLLAMA_MODEL,
    configuration: { baseUrl: DEFAULT_LOCAL_OLLAMA_URL },
  }
}

export function defaultModelRouting(defaultProviderId: string): ModelRouting {
  return {
    id: DEFAULT_ROUTING_ID,
    defaultProviderId,
    rules: [],
    metadata: {},
  }
}

/** Ensures every workflow has at least one provider and a default routing profile. */
export function ensureWorkflowModelInfrastructure(doc: WorkflowDocument): WorkflowDocument {
  let providers = workflowModelProviders(doc)
  if (providers.length === 0) {
    providers = [defaultLocalProvider()]
  }

  let routing = workflowModelRouting(doc)
  const primaryProviderId = providers[0]?.id ?? DEFAULT_PROVIDER_ID
  if (routing.length === 0) {
    routing = [defaultModelRouting(primaryProviderId)]
  } else {
    routing = routing.map((entry, index) => {
      if (index !== 0) return entry
      const defaultProviderId =
        entry.defaultProviderId && providers.some((p) => p.id === entry.defaultProviderId)
          ? entry.defaultProviderId
          : primaryProviderId
      return { ...entry, id: entry.id ?? DEFAULT_ROUTING_ID, defaultProviderId }
    })
  }

  return { ...doc, modelProviders: providers, modelRouting: routing }
}

export function uniqueModelProviderId(existing: ModelProvider[]): string {
  const taken = new Set(existing.map((p) => p.id))
  let base = 'model-provider'
  let n = 1
  while (taken.has(n === 1 ? base : `${base}-${n}`)) n += 1
  return n === 1 ? base : `${base}-${n}`
}

export function emptyModelProvider(existing: ModelProvider[]): ModelProvider {
  const kind: ModelProviderKind = 'local'
  const meta = MODEL_PROVIDER_KINDS.find((k) => k.id === kind)!
  return {
    id: uniqueModelProviderId(existing),
    provider: kind,
    model: meta.defaultModel ?? '',
    configuration: { baseUrl: meta.defaultBaseUrl },
  }
}

export function upsertModelProvider(
  doc: WorkflowDocument,
  provider: ModelProvider,
  previousId?: string,
): WorkflowDocument {
  const list = workflowModelProviders(doc).filter((p) => p.id !== (previousId ?? provider.id))
  return ensureWorkflowModelInfrastructure({ ...doc, modelProviders: [...list, provider] })
}

export function removeModelProvider(doc: WorkflowDocument, id: string): WorkflowDocument {
  const providers = workflowModelProviders(doc).filter((p) => p.id !== id)
  let next: WorkflowDocument = { ...doc, modelProviders: providers }
  const routing = primaryModelRouting(next)
  if (routing?.defaultProviderId === id && providers[0]) {
    next = syncRoutingDefaultProvider(next, providers[0].id)
  }
  return ensureWorkflowModelInfrastructure(next)
}

export function syncRoutingDefaultProvider(
  doc: WorkflowDocument,
  defaultProviderId: string,
): WorkflowDocument {
  const routing = workflowModelRouting(doc)
  if (routing.length === 0) {
    return { ...doc, modelRouting: [defaultModelRouting(defaultProviderId)] }
  }
  return {
    ...doc,
    modelRouting: routing.map((entry, index) =>
      index === 0 ? { ...entry, id: entry.id ?? DEFAULT_ROUTING_ID, defaultProviderId } : entry,
    ),
  }
}

export function setPrimaryRoutingDefaultProvider(
  doc: WorkflowDocument,
  defaultProviderId: string,
): WorkflowDocument {
  return syncRoutingDefaultProvider(doc, defaultProviderId)
}

export interface AgentModelOption {
  value: string
  label: string
  group: 'routing' | 'provider'
  description?: string
}

export function agentModelOptions(doc: WorkflowDocument): AgentModelOption[] {
  const options: AgentModelOption[] = []
  for (const route of workflowModelRouting(doc)) {
    if (!route.id) continue
    const provider = workflowModelProviders(doc).find((p) => p.id === route.defaultProviderId)
    const providerLabel = provider
      ? `${provider.id} (${providerKind(provider)} · ${provider.model || 'default'})`
      : route.defaultProviderId ?? 'unset'
    options.push({
      value: `routing:${route.id}`,
      label: route.id,
      group: 'routing',
      description: `Default → ${providerLabel}`,
    })
  }
  for (const provider of workflowModelProviders(doc)) {
    options.push({
      value: `provider:${provider.id}`,
      label: provider.id,
      group: 'provider',
      description: `${providerKind(provider)} · ${provider.model || 'default'}`,
    })
  }
  return options
}

export function readAgentModelSelection(
  node: { configuration?: Record<string, unknown> },
  doc: WorkflowDocument,
): string {
  const routingRef = node.configuration?.routingRef
  if (typeof routingRef === 'string' && routingRef.trim()) {
    return `routing:${routingRef}`
  }
  const providerRef = readProviderRef(node)
  if (providerRef) return `provider:${providerRef}`
  const defaultRouting = primaryModelRouting(doc)
  if (defaultRouting?.id) return `routing:${defaultRouting.id}`
  const first = workflowModelProviders(doc)[0]
  return first ? `provider:${first.id}` : ''
}

export function applyAgentModelSelection(
  doc: WorkflowDocument,
  nodeId: string,
  selection: string,
): WorkflowDocument {
  const nodes = (doc.nodes ?? []).map((node) => {
    if (node.id !== nodeId) return node
    const configuration = { ...node.configuration }
    if (!selection) {
      delete configuration.routingRef
      delete configuration.providerRef
      return { ...node, configuration }
    }
    if (selection.startsWith('routing:')) {
      const routingRef = selection.slice('routing:'.length)
      configuration.routingRef = routingRef
      delete configuration.providerRef
      return { ...node, configuration }
    }
    if (selection.startsWith('provider:')) {
      const providerRef = selection.slice('provider:'.length)
      configuration.providerRef = providerRef
      delete configuration.routingRef
      return { ...node, configuration }
    }
    configuration.providerRef = selection
    delete configuration.routingRef
    return { ...node, configuration }
  })
  return { ...doc, nodes }
}

export function isAgentNodeType(type: string): boolean {
  return type.toUpperCase() === 'AGENT'
}

export function providerKind(provider: ModelProvider): ModelProviderKind {
  const value = provider.provider?.toLowerCase()
  if (value === 'ollama') return 'local'
  if (value === 'local' || value === 'url' || value === 'openai') return value
  return 'url'
}

export function providerBaseUrl(provider: ModelProvider): string {
  const kind = providerKind(provider)
  const fromConfig = provider.configuration?.baseUrl
  if (typeof fromConfig === 'string' && fromConfig.trim()) return fromConfig.trim()
  return MODEL_PROVIDER_KINDS.find((k) => k.id === kind)?.defaultBaseUrl ?? ''
}

export function providerApiKey(provider: ModelProvider): string {
  const raw = provider.configuration?.apiKey ?? provider.configuration?.apiKeyRef
  return typeof raw === 'string' ? raw : ''
}

export function applyProviderRef(
  doc: WorkflowDocument,
  nodeId: string,
  providerRef: string,
): WorkflowDocument {
  const nodes = (doc.nodes ?? []).map((node) => {
    if (node.id !== nodeId) return node
    return {
      ...node,
      configuration: {
        ...node.configuration,
        providerRef: providerRef || undefined,
      },
    }
  })
  return { ...doc, nodes }
}

export function readProviderRef(node: { configuration?: Record<string, unknown> }): string {
  const value = node.configuration?.providerRef
  return typeof value === 'string' ? value : ''
}

export function isModelConsumerNodeType(type: string): boolean {
  const upper = type.toUpperCase()
  return upper === 'AGENT' || upper === 'MODEL'
}
