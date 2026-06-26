import type { CatalogComponentBase } from '../types/catalog'
import type { WorkflowDocument } from '../types/workflow'
import {
  availableAgentRefs,
  catalogResourceId,
  toggleAvailableAgent,
  toggleCatalogTool,
  workflowTools,
  workflowVariables,
} from './workflowResources'
import { normalizePromptMacroAliases } from './promptTokens'

export const PLANNER_MACRO_CAPABILITIES = 'CAPABILITIES'
export const PLANNER_MACRO_AGENTS = 'AGENTS'
export const PLANNER_MACROS = [PLANNER_MACRO_CAPABILITIES, PLANNER_MACRO_AGENTS] as const

export interface PlannerContextSelection {
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

function defaultSelection(): PlannerContextSelection {
  return {
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

const INTERNAL_TOOLS_HEADING = '## Available tools'
const INTERNAL_AGENTS_HEADING = '## Available agents'

function appendPromptSection(body: string, heading: string, block: string): string {
  const trimmed = body.trimEnd()
  if (!block.trim()) return trimmed
  return `${trimmed}\n\n${heading}\n\n${block}`.trim()
}

export function resolveAgentPromptInfos(
  doc: WorkflowDocument,
  workflows: { id?: string; label?: string; description?: string }[],
): AgentPromptInfo[] {
  const byId = new Map(
    workflows
      .filter((workflow) => typeof workflow.id === 'string' && workflow.id.length > 0)
      .map((workflow) => [workflow.id!, workflow]),
  )
  return availableAgentRefs(doc).map((ref) => {
    const summary = byId.get(ref.id)
    return {
      id: ref.id,
      label: summary?.label?.trim() || ref.id,
      description: summary?.description?.trim(),
    }
  })
}

export function generatePlannerPrompt(
  template: string,
  context: PlannerContextSelection,
  catalogTools: CatalogComponentBase[],
  agents: AgentPromptInfo[],
): string {
  let text = normalizePromptMacroAliases(template)

  const toolsBlock = formatCapabilityLines(context.selectedTools, catalogTools).join('\n\n')
  const selectedAgents = agents.filter((agent) => context.selectedAgents.includes(agent.id))
  const agentsBlock = formatAgentLines(selectedAgents).join('\n\n')

  if (text.includes(`{${PLANNER_MACRO_CAPABILITIES}}`)) {
    text = text.replaceAll(`{${PLANNER_MACRO_CAPABILITIES}}`, toolsBlock || '(none)')
  }

  if (text.includes(`{${PLANNER_MACRO_AGENTS}}`)) {
    text = text.replaceAll(`{${PLANNER_MACRO_AGENTS}}`, agentsBlock || '(none)')
  }

  if (context.injectCapabilities) {
    text = appendPromptSection(text, INTERNAL_TOOLS_HEADING, toolsBlock)
  }

  if (context.injectAgents) {
    text = appendPromptSection(text, INTERNAL_AGENTS_HEADING, agentsBlock)
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

  if (Object.keys(metadataRecord).length > 0) {
    return {
      selectedVariables,
      selectedTools,
      selectedAgents,
      injectCapabilities: metadataRecord.injectCapabilities !== false,
      injectAgents: metadataRecord.injectAgents !== false,
    }
  }

  const fallback = defaultSelection()
  fallback.selectedVariables = selectedVariables
  fallback.selectedAgents = selectedAgents
  fallback.selectedTools = selectedTools
  return fallback
}

function writePlannerContext(
  doc: WorkflowDocument,
  selection: PlannerContextSelection,
): WorkflowDocument {
  const existingMetadata = readPlannerContextRecord(doc)

  return {
    ...doc,
    metadata: {
      ...doc.metadata,
      [METADATA_KEY]: {
        ...existingMetadata,
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

export function plannerContextSummary(
  _doc: WorkflowDocument,
  selection: PlannerContextSelection,
): string {
  return [
    `Tools (${selection.selectedTools.length})`,
    `Agents (${selection.selectedAgents.length})`,
  ].join(' · ')
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
