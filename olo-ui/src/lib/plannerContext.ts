import type { CatalogComponentBase } from '../types/catalog'
import type {
  WorkflowDocument,
  WorkflowPlannerPrompt,
  WorkflowPlannerPromptParameter,
} from '../types/workflow'
import {
  availableAgentRefs,
  catalogResourceId,
  toggleAvailableAgent,
  toggleCatalogTool,
  workflowTools,
  workflowVariables,
} from './workflowResources'

export const PLANNER_MACRO_CAPABILITIES = 'CAPABILITIES'
export const PLANNER_MACRO_AGENTS = 'AGENTS'
export const PLANNER_MACROS = [PLANNER_MACRO_CAPABILITIES, PLANNER_MACRO_AGENTS] as const
export const DEFAULT_PROMPT_ID = 'default-prompt'

export const DEFAULT_PROMPT_TEMPLATE = `You are a research planner.

Investigate {message}.

Use available capabilities when needed.
Delegate work when another agent is more suitable.`

export type PlannerPromptParameterType = NonNullable<WorkflowPlannerPromptParameter['type']>

export type PlannerPromptParameter = WorkflowPlannerPromptParameter

export type { WorkflowPlannerPrompt }

export interface PlannerContextSelection {
  prompts: WorkflowPlannerPrompt[]
  defaultPromptId: string
  selectedVariables: string[]
  selectedTools: string[]
  selectedAgents: string[]
  injectCapabilities: boolean
  injectAgents: boolean
}

export interface PlannerPromptValidationIssue {
  code: 'missing-parameter' | 'dangling-placeholder' | 'missing-in-prompt'
  message: string
  name?: string
}

export interface AgentPromptInfo {
  id: string
  label: string
  description?: string
}

const METADATA_KEY = 'plannerContext'
const PLACEHOLDER_PATTERN = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g

/** @deprecated Legacy bundles — migrated to selectedTools on read. */
export const CAPABILITY_BUNDLES = [
  {
    id: 'research',
    includes: [
      { catalogId: 'olo-core:web-search' },
      { catalogId: 'olo-core:http-tool' },
    ],
  },
  {
    id: 'utility',
    includes: [{ catalogId: 'olo-core:calculator' }],
  },
] as const

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string')
}

function normalizeParameterType(value: unknown): PlannerPromptParameterType {
  if (value === 'number' || value === 'boolean' || value === 'object') return value
  if (value === 'integer') return 'number'
  return 'string'
}

/** Prompt placeholders are defined by workflow variables, not per-prompt parameters. */
export function plannerParametersFromVariables(doc: WorkflowDocument): PlannerPromptParameter[] {
  return workflowVariables(doc).map((variable) => ({
    name: variable.name,
    type: normalizeParameterType(variable.type),
    required: variable.required === true,
  }))
}

function defaultPlannerPrompt(): WorkflowPlannerPrompt {
  return {
    id: DEFAULT_PROMPT_ID,
    name: 'Default planner prompt',
    promptTemplate: DEFAULT_PROMPT_TEMPLATE,
  }
}

function serializePlannerPrompt(prompt: WorkflowPlannerPrompt): WorkflowPlannerPrompt {
  return {
    id: prompt.id,
    name: prompt.name,
    promptTemplate: prompt.promptTemplate,
  }
}

function defaultSelection(): PlannerContextSelection {
  return {
    prompts: [defaultPlannerPrompt()],
    defaultPromptId: DEFAULT_PROMPT_ID,
    selectedVariables: [],
    selectedTools: ['olo-core:http-tool', 'olo-core:web-search'],
    selectedAgents: [],
    injectCapabilities: true,
    injectAgents: true,
  }
}

function inferSelectedVariables(
  doc: WorkflowDocument,
  metadataRecord: Record<string, unknown>,
): string[] {
  const fromMetadata = stringArray(metadataRecord.selectedVariables ?? metadataRecord.variables)
  if (fromMetadata.length > 0) return fromMetadata

  const declared = new Set(workflowVariables(doc).map((variable) => variable.name))
  const fromCapability = doc.capability?.required_context
  if (!Array.isArray(fromCapability)) return []
  return fromCapability.filter((name): name is string => typeof name === 'string' && declared.has(name))
}

function parsePromptRecord(record: Record<string, unknown>, fallback: WorkflowPlannerPrompt): WorkflowPlannerPrompt {
  const id = typeof record.id === 'string' && record.id.trim() ? record.id.trim() : fallback.id
  const name = typeof record.name === 'string' && record.name.trim() ? record.name.trim() : fallback.name
  const promptTemplate =
    typeof record.promptTemplate === 'string' && record.promptTemplate.trim()
      ? record.promptTemplate
      : fallback.promptTemplate
  return { id, name, promptTemplate }
}

function parsePromptsFromArray(
  value: unknown,
  defaults: PlannerContextSelection,
): WorkflowPlannerPrompt[] | null {
  if (!Array.isArray(value)) return null
  const parsed = value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item, index) => parsePromptRecord(item, defaults.prompts[index] ?? defaultPlannerPrompt()))
  return parsed.length > 0 ? parsed : null
}

function parsePrompts(record: Record<string, unknown>, defaults: PlannerContextSelection): WorkflowPlannerPrompt[] {
  const fromArray = parsePromptsFromArray(record.prompts, defaults)
  if (fromArray) return fromArray

  const legacyTemplate =
    typeof record.promptTemplate === 'string' && record.promptTemplate.trim()
      ? record.promptTemplate
      : defaults.prompts[0]?.promptTemplate ?? DEFAULT_PROMPT_TEMPLATE

  return [
    {
      id: DEFAULT_PROMPT_ID,
      name: 'Default planner prompt',
      promptTemplate: legacyTemplate,
    },
  ]
}

function catalogIdsForLegacyBundles(bundleIds: string[]): string[] {
  const ids = new Set<string>()
  for (const bundleId of bundleIds) {
    const bundle = CAPABILITY_BUNDLES.find((b) => b.id === bundleId)
    if (!bundle) continue
    for (const item of bundle.includes) {
      if (item.catalogId) ids.add(item.catalogId)
    }
  }
  return [...ids]
}

function inferSelectedTools(doc: WorkflowDocument): string[] {
  return workflowTools(doc)
    .map((t) => t.runtimeBinding?.implementationId ?? `olo-core:${t.id}`)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
}

export function extractPromptPlaceholders(template: string): string[] {
  const names = new Set<string>()
  for (const match of template.matchAll(PLACEHOLDER_PATTERN)) {
    names.add(match[1])
  }
  return [...names]
}

export function validatePromptTemplate(
  template: string,
  doc: WorkflowDocument,
): PlannerPromptValidationIssue[] {
  const issues: PlannerPromptValidationIssue[] = []
  const variables = workflowVariables(doc)
  const variableNames = new Set(variables.map((variable) => variable.name))
  const placeholders = extractPromptPlaceholders(template)

  for (const name of placeholders) {
    if (PLANNER_MACROS.includes(name as (typeof PLANNER_MACROS)[number])) continue
    if (variableNames.has(name)) continue
    issues.push({
      code: 'dangling-placeholder',
      name,
      message: `Prompt references {${name}} but no workflow variable is defined.`,
    })
  }

  for (const variable of variables) {
    if (!variable.required) continue
    if (!placeholders.includes(variable.name)) {
      issues.push({
        code: 'missing-in-prompt',
        name: variable.name,
        message: `Required workflow variable "${variable.name}" is not used in the prompt.`,
      })
    }
  }

  return issues
}

export function estimateTokenCount(text: string): number {
  if (!text.trim()) return 0
  return Math.max(1, Math.ceil(text.length / 4))
}

export function formatCapabilityLines(
  toolIds: string[],
  catalogTools: CatalogComponentBase[],
): string[] {
  const byId = new Map(catalogTools.map((tool) => [tool.id, tool]))
  return toolIds
    .map((id) => byId.get(id))
    .filter((tool): tool is CatalogComponentBase => Boolean(tool))
    .map((tool) => {
      const description = tool.description?.trim()
      return description ? `${tool.name}\n- ${description}` : tool.name ?? tool.id
    })
}

export function formatAgentLines(agents: AgentPromptInfo[]): string[] {
  return agents.map((agent) => {
    const description = agent.description?.trim()
    return description ? `${agent.label}\n- ${description}` : agent.label
  })
}

export function generatePlannerPrompt(
  prompt: WorkflowPlannerPrompt,
  context: Pick<
    PlannerContextSelection,
    'selectedTools' | 'selectedAgents' | 'injectCapabilities' | 'injectAgents'
  >,
  catalogTools: CatalogComponentBase[],
  agents: AgentPromptInfo[],
): string {
  let text = prompt.promptTemplate

  if (context.injectCapabilities && text.includes(`{${PLANNER_MACRO_CAPABILITIES}}`)) {
    const block = formatCapabilityLines(context.selectedTools, catalogTools).join('\n\n')
    text = text.replaceAll(`{${PLANNER_MACRO_CAPABILITIES}}`, block || '(none)')
  }

  if (context.injectAgents && text.includes(`{${PLANNER_MACRO_AGENTS}}`)) {
    const selected = agents.filter((agent) => context.selectedAgents.includes(agent.id))
    const block = formatAgentLines(selected).join('\n\n')
    text = text.replaceAll(`{${PLANNER_MACRO_AGENTS}}`, block || '(none)')
  }

  return text.trim()
}

function readPlannerContextRecord(doc: WorkflowDocument): Record<string, unknown> {
  const raw = doc.metadata?.[METADATA_KEY]
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  return {}
}

export function readPlannerContext(doc: WorkflowDocument): PlannerContextSelection {
  const defaults = defaultSelection()
  const metadataRecord = readPlannerContextRecord(doc)

  const promptsFromRoot = parsePromptsFromArray(doc.prompts, defaults)
  const prompts =
    promptsFromRoot ??
    parsePrompts(metadataRecord, defaults)

  const rootDefaultPromptId =
    typeof doc.defaultPromptId === 'string' ? doc.defaultPromptId : undefined
  const metadataDefaultPromptId =
    typeof metadataRecord.defaultPromptId === 'string'
      ? metadataRecord.defaultPromptId
      : undefined
  const defaultPromptIdCandidate = rootDefaultPromptId ?? metadataDefaultPromptId
  const defaultPromptId =
    defaultPromptIdCandidate &&
    prompts.some((prompt) => prompt.id === defaultPromptIdCandidate)
      ? defaultPromptIdCandidate
      : prompts[0]?.id ?? DEFAULT_PROMPT_ID

  let selectedTools = stringArray(metadataRecord.selectedTools)
  if (selectedTools.length === 0 && metadataRecord.capabilities) {
    selectedTools = catalogIdsForLegacyBundles(stringArray(metadataRecord.capabilities))
  }
  if (selectedTools.length === 0) {
    selectedTools = inferSelectedTools(doc)
  }

  let selectedAgents = stringArray(metadataRecord.selectedAgents ?? metadataRecord.agents)
  if (selectedAgents.length === 0) {
    selectedAgents = availableAgentRefs(doc).map((agent) => agent.id)
  }

  const selectedVariables = inferSelectedVariables(doc, metadataRecord)

  if (
    promptsFromRoot ||
    Object.keys(metadataRecord).length > 0 ||
    doc.defaultPromptId ||
    doc.prompts
  ) {
    return {
      prompts,
      defaultPromptId,
      selectedVariables,
      selectedTools,
      selectedAgents,
      injectCapabilities: metadataRecord.injectCapabilities !== false,
      injectAgents: metadataRecord.injectAgents !== false,
    }
  }

  const fallback = defaultSelection()
  fallback.prompts = prompts
  fallback.defaultPromptId = defaultPromptId
  fallback.selectedVariables = selectedVariables
  fallback.selectedAgents = selectedAgents
  fallback.selectedTools = selectedTools
  return fallback
}

export function plannerPromptById(
  selection: PlannerContextSelection,
  promptId: string,
): WorkflowPlannerPrompt | null {
  return selection.prompts.find((prompt) => prompt.id === promptId) ?? null
}

export function defaultPlannerPromptForWorkflow(
  selection: PlannerContextSelection,
): WorkflowPlannerPrompt {
  return (
    plannerPromptById(selection, selection.defaultPromptId) ??
    selection.prompts[0] ??
    defaultPlannerPrompt()
  )
}

function writePlannerContext(
  doc: WorkflowDocument,
  selection: PlannerContextSelection,
): WorkflowDocument {
  const existingMetadata = readPlannerContextRecord(doc)
  const { prompts: _legacyPrompts, defaultPromptId: _legacyDefault, ...plannerMetadata } =
    existingMetadata

  return {
    ...doc,
    prompts: selection.prompts.map(serializePlannerPrompt),
    defaultPromptId: selection.defaultPromptId,
    metadata: {
      ...doc.metadata,
      [METADATA_KEY]: {
        ...plannerMetadata,
        selectedVariables: selection.selectedVariables,
        selectedTools: selection.selectedTools,
        selectedAgents: selection.selectedAgents,
        injectCapabilities: selection.injectCapabilities,
        injectAgents: selection.injectAgents,
      },
    },
  }
}

function syncCapabilityRequiredContext(
  doc: WorkflowDocument,
  selectedVariables: string[],
): WorkflowDocument {
  return {
    ...doc,
    capability: {
      ...doc.capability,
      required_context: [...selectedVariables],
    },
  }
}

function syncToolsFromSelection(
  doc: WorkflowDocument,
  selectedToolIds: string[],
  catalogTools: CatalogComponentBase[],
): WorkflowDocument {
  const targetIds = new Set(selectedToolIds)
  let next = doc
  for (const tool of catalogTools) {
    const shouldEnable = targetIds.has(tool.id)
    const isEnabled = workflowTools(next).some(
      (entry) =>
        entry.runtimeBinding?.implementationId === tool.id ||
        catalogResourceId(tool.id) === entry.id,
    )
    if (shouldEnable !== isEnabled) {
      next = toggleCatalogTool(next, tool, shouldEnable)
    }
  }
  return next
}

function syncAgents(doc: WorkflowDocument, agentIds: string[]): WorkflowDocument {
  const desired = new Set(agentIds)
  let next = doc
  for (const ref of availableAgentRefs(doc)) {
    if (!desired.has(ref.id)) {
      next = toggleAvailableAgent(next, ref.id, false)
    }
  }
  for (const id of desired) {
    if (!availableAgentRefs(next).some((agent) => agent.id === id)) {
      next = toggleAvailableAgent(next, id, true)
    }
  }
  return next
}

export function applyPlannerContext(
  doc: WorkflowDocument,
  selection: PlannerContextSelection,
  catalogTools: CatalogComponentBase[],
): WorkflowDocument {
  let next = writePlannerContext(doc, selection)
  next = syncCapabilityRequiredContext(next, selection.selectedVariables)
  next = syncToolsFromSelection(next, selection.selectedTools, catalogTools)
  next = syncAgents(next, selection.selectedAgents)
  return next
}

export function updatePlannerContext(
  doc: WorkflowDocument,
  patch: Partial<PlannerContextSelection>,
  catalogTools: CatalogComponentBase[],
): WorkflowDocument {
  const current = readPlannerContext(doc)
  return applyPlannerContext(doc, { ...current, ...patch }, catalogTools)
}

export function updatePlannerPrompt(
  doc: WorkflowDocument,
  promptId: string,
  patch: Partial<Pick<WorkflowPlannerPrompt, 'name' | 'promptTemplate'>>,
  catalogTools: CatalogComponentBase[],
): WorkflowDocument {
  const current = readPlannerContext(doc)
  const prompts = current.prompts.map((prompt) =>
    prompt.id === promptId ? serializePlannerPrompt({ ...prompt, ...patch }) : prompt,
  )
  return applyPlannerContext(doc, { ...current, prompts }, catalogTools)
}

export function uniquePromptId(existing: WorkflowPlannerPrompt[]): string {
  const taken = new Set(existing.map((prompt) => prompt.id))
  let base = 'prompt'
  let index = 1
  while (taken.has(index === 1 ? base : `${base}-${index}`)) index += 1
  return index === 1 ? base : `${base}-${index}`
}

export function addPlannerPrompt(
  doc: WorkflowDocument,
  catalogTools: CatalogComponentBase[],
): WorkflowDocument {
  const current = readPlannerContext(doc)
  const id = uniquePromptId(current.prompts)
  const prompt: WorkflowPlannerPrompt = {
    id,
    name: `Prompt ${current.prompts.length + 1}`,
    promptTemplate: '',
  }
  return applyPlannerContext(doc, { ...current, prompts: [...current.prompts, prompt] }, catalogTools)
}

export function removePlannerPrompt(
  doc: WorkflowDocument,
  promptId: string,
  catalogTools: CatalogComponentBase[],
): WorkflowDocument {
  const current = readPlannerContext(doc)
  if (current.prompts.length <= 1) return doc
  const prompts = current.prompts.filter((prompt) => prompt.id !== promptId)
  const defaultPromptId =
    current.defaultPromptId === promptId ? prompts[0]?.id ?? DEFAULT_PROMPT_ID : current.defaultPromptId
  return applyPlannerContext(doc, { ...current, prompts, defaultPromptId }, catalogTools)
}

export function setDefaultPlannerPrompt(
  doc: WorkflowDocument,
  promptId: string,
  catalogTools: CatalogComponentBase[],
): WorkflowDocument {
  const current = readPlannerContext(doc)
  if (!current.prompts.some((prompt) => prompt.id === promptId)) return doc
  return applyPlannerContext(doc, { ...current, defaultPromptId: promptId }, catalogTools)
}

export function togglePlannerTool(
  doc: WorkflowDocument,
  toolId: string,
  enabled: boolean,
  catalogTools: CatalogComponentBase[],
): WorkflowDocument {
  const current = readPlannerContext(doc)
  const selectedTools = enabled
    ? current.selectedTools.includes(toolId)
      ? current.selectedTools
      : [...current.selectedTools, toolId]
    : current.selectedTools.filter((id) => id !== toolId)
  return applyPlannerContext(doc, { ...current, selectedTools }, catalogTools)
}

export function togglePlannerAgent(
  doc: WorkflowDocument,
  agentId: string,
  enabled: boolean,
  catalogTools: CatalogComponentBase[],
): WorkflowDocument {
  const current = readPlannerContext(doc)
  const selectedAgents = enabled
    ? current.selectedAgents.includes(agentId)
      ? current.selectedAgents
      : [...current.selectedAgents, agentId]
    : current.selectedAgents.filter((id) => id !== agentId)
  return applyPlannerContext(doc, { ...current, selectedAgents }, catalogTools)
}

export function isPlannerToolEnabled(doc: WorkflowDocument, toolId: string): boolean {
  return readPlannerContext(doc).selectedTools.includes(toolId)
}

export function isPlannerAgentEnabled(doc: WorkflowDocument, agentId: string): boolean {
  return readPlannerContext(doc).selectedAgents.includes(agentId)
}

export function isPlannerVariableEnabled(doc: WorkflowDocument, variableName: string): boolean {
  return readPlannerContext(doc).selectedVariables.includes(variableName)
}

export function togglePlannerVariable(
  doc: WorkflowDocument,
  variableName: string,
  enabled: boolean,
  catalogTools: CatalogComponentBase[],
): WorkflowDocument {
  const current = readPlannerContext(doc)
  const selectedVariables = enabled
    ? current.selectedVariables.includes(variableName)
      ? current.selectedVariables
      : [...current.selectedVariables, variableName]
    : current.selectedVariables.filter((name) => name !== variableName)
  return applyPlannerContext(doc, { ...current, selectedVariables }, catalogTools)
}

export function readAgentPromptRef(
  node: { configuration?: Record<string, unknown> },
  doc: WorkflowDocument,
): string {
  const ref = node.configuration?.promptRef
  const selection = readPlannerContext(doc)
  if (typeof ref === 'string' && ref.trim() && selection.prompts.some((prompt) => prompt.id === ref)) {
    return ref
  }
  return selection.defaultPromptId
}

export function applyAgentPromptRef(
  doc: WorkflowDocument,
  nodeId: string,
  promptRef: string,
): WorkflowDocument {
  const selection = readPlannerContext(doc)
  const resolved =
    promptRef && selection.prompts.some((prompt) => prompt.id === promptRef)
      ? promptRef
      : selection.defaultPromptId
  const nodes = (doc.nodes ?? []).map((node) => {
    if (node.id !== nodeId) return node
    return {
      ...node,
      configuration: {
        ...node.configuration,
        promptRef: resolved,
      },
    }
  })
  return { ...doc, nodes }
}

export function plannerContextSummary(
  doc: WorkflowDocument,
  selection: PlannerContextSelection,
): string {
  const issueCount = selection.prompts.reduce(
    (count, prompt) => count + validatePromptTemplate(prompt.promptTemplate, doc).length,
    0,
  )
  const parts = [
    `Prompts (${selection.prompts.length})`,
    `Variables (${selection.selectedVariables.length})`,
    `Tools (${selection.selectedTools.length})`,
    `Agents (${selection.selectedAgents.length})`,
  ]
  if (issueCount > 0) parts.push(`${issueCount} issue(s)`)
  return parts.join(' · ')
}

export function plannerAutocompleteOptions(
  workflowVariableNames: string[],
): { value: string; label: string; group: string }[] {
  const options = workflowVariableNames.map((name) => ({
    value: `{${name}}`,
    label: name,
    group: 'Workflow variables',
  }))
  options.push(
    { value: `{${PLANNER_MACRO_CAPABILITIES}}`, label: PLANNER_MACRO_CAPABILITIES, group: 'Macros' },
    { value: `{${PLANNER_MACRO_AGENTS}}`, label: PLANNER_MACRO_AGENTS, group: 'Macros' },
  )
  return options
}
