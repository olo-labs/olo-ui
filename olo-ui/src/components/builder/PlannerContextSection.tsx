import { useEffect, useMemo, useState } from 'react'
import { catalogStore } from '../../store/catalogStore'
import { workflowConfigurationStore } from '../../store/workflowConfigurationStore'
import {
  addPlannerPrompt,
  estimateTokenCount,
  generatePlannerPrompt,
  isPlannerAgentEnabled,
  isPlannerToolEnabled,
  readPlannerContext,
  removePlannerPrompt,
  setDefaultPlannerPrompt,
  togglePlannerAgent,
  togglePlannerTool,
  updatePlannerContext,
  updatePlannerPrompt,
  validatePromptTemplate,
} from '../../lib/plannerContext'
import type { AgentPromptInfo } from '../../lib/plannerContext'
import { VARIABLE_SCOPE_LABELS, normalizeVariableScope } from '../../lib/workflowVariables'
import { workflowVariables } from '../../lib/workflowResources'
import { ExpandableSection } from './ExpandableSection'
import { PlannerPromptEditor } from './PlannerPromptEditor'

type SubSectionId =
  | 'prompt'
  | 'capabilities'
  | 'agents'
  | 'preview'

const DEFAULT_SUB_EXPANDED = new Set<SubSectionId>([
  'prompt',
  'capabilities',
  'agents',
  'preview',
])

function ChecklistItem({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string
  description?: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <li className="builder-check-item">
      <label className="builder-check-label">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="builder-check-text">
          <span className="builder-check-name">{title}</span>
          {description ? <span className="builder-check-desc">{description}</span> : null}
        </span>
      </label>
    </li>
  )
}

export interface PlannerContextSectionProps {
  disabled?: boolean
  otherWorkflows: { id: string; label?: string | null; description?: string | null }[]
  workflowLabel: (id: string) => string
}

export function PlannerContextSection({
  disabled,
  otherWorkflows,
  workflowLabel,
}: PlannerContextSectionProps) {
  const catalog = catalogStore((s) => s.catalog)
  const draft = workflowConfigurationStore((s) => s.draft)
  const updateDraft = workflowConfigurationStore((s) => s.updateDraft)
  const catalogTools = catalog?.tools ?? []

  const [expandedSubs, setExpandedSubs] = useState<Set<SubSectionId>>(
    () => new Set(DEFAULT_SUB_EXPANDED),
  )
  const [activePromptId, setActivePromptId] = useState<string | null>(null)

  const selection = draft ? readPlannerContext(draft) : null
  const definedVariables = draft ? workflowVariables(draft) : []
  const activePrompt = selection
    ? (selection.prompts.find((prompt) => prompt.id === activePromptId) ?? selection.prompts[0])
    : null

  useEffect(() => {
    if (!selection) return
    if (!activePromptId || !selection.prompts.some((prompt) => prompt.id === activePromptId)) {
      setActivePromptId(selection.defaultPromptId)
    }
  }, [activePromptId, selection])

  if (!draft || !selection) {
    return <p className="builder-empty">Open a workflow to configure planner context.</p>
  }

  if (!activePrompt) {
    return <p className="builder-empty">No planner prompts defined.</p>
  }

  const validationIssues = validatePromptTemplate(activePrompt.promptTemplate, draft)

  const agentInfos: AgentPromptInfo[] = useMemo(
    () =>
      otherWorkflows.map((workflow) => ({
        id: workflow.id,
        label: workflow.label ?? workflowLabel(workflow.id),
        description: workflow.description ?? undefined,
      })),
    [otherWorkflows, workflowLabel],
  )

  const generatedPrompt = useMemo(
    () => generatePlannerPrompt(activePrompt, selection, catalogTools, agentInfos),
    [activePrompt, selection, catalogTools, agentInfos],
  )

  const tokenEstimate = estimateTokenCount(generatedPrompt)

  const toggleSub = (id: SubSectionId) => {
    setExpandedSubs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const patchContext = (patch: Parameters<typeof updatePlannerContext>[1]) => {
    updateDraft(updatePlannerContext(draft, patch, catalogTools))
  }

  const patchActivePrompt = (patch: Parameters<typeof updatePlannerPrompt>[2]) => {
    updateDraft(updatePlannerPrompt(draft, activePrompt.id, patch, catalogTools))
  }

  return (
    <div className="planner-context">
      <div className="planner-prompt-list">
        <div className="planner-prompt-list-header">
          <span className="builder-subsection-label">Planner prompts</span>
          <button
            type="button"
            className="builder-btn small"
            disabled={disabled}
            onClick={() => {
              const next = addPlannerPrompt(draft, catalogTools)
              updateDraft(next)
              const added = readPlannerContext(next).prompts.at(-1)
              if (added) setActivePromptId(added.id)
            }}
          >
            + Add prompt
          </button>
        </div>
        <ul className="planner-prompt-tabs">
          {selection.prompts.map((prompt) => {
            const isActive = prompt.id === activePrompt.id
            const isDefault = prompt.id === selection.defaultPromptId
            return (
              <li key={prompt.id} className={isActive ? 'active' : undefined}>
                <button
                  type="button"
                  className="planner-prompt-tab"
                  disabled={disabled}
                  onClick={() => setActivePromptId(prompt.id)}
                >
                  {prompt.name}
                  {isDefault ? ' (default)' : ''}
                </button>
                {selection.prompts.length > 1 ? (
                  <button
                    type="button"
                    className="builder-icon-btn danger"
                    disabled={disabled}
                    title="Remove prompt"
                    onClick={() => {
                      const next = removePlannerPrompt(draft, prompt.id, catalogTools)
                      updateDraft(next)
                      if (prompt.id === activePrompt.id) {
                        setActivePromptId(readPlannerContext(next).defaultPromptId)
                      }
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
        <label className="builder-field planner-prompt-name-field">
          <span>Prompt name</span>
          <input
            className="builder-input"
            value={activePrompt.name}
            disabled={disabled}
            onChange={(e) => patchActivePrompt({ name: e.target.value })}
          />
        </label>
        {activePrompt.id !== selection.defaultPromptId ? (
          <button
            type="button"
            className="builder-btn small"
            disabled={disabled}
            onClick={() => updateDraft(setDefaultPlannerPrompt(draft, activePrompt.id, catalogTools))}
          >
            Set as workflow default
          </button>
        ) : null}
      </div>

      <ExpandableSection
        title="Planner prompt template"
        expanded={expandedSubs.has('prompt')}
        onToggle={() => toggleSub('prompt')}
        hint="Template sent to the planner. Use {parameter} placeholders and optional macros."
      >
        <PlannerPromptEditor
          prompt={activePrompt}
          workflowVariableNames={definedVariables.map((variable) => variable.name)}
          disabled={disabled}
          onChange={patchActivePrompt}
          onInsertMacro={(macro, enabled) => {
            if (macro === 'capabilities') patchContext({ injectCapabilities: enabled })
            if (macro === 'agents') patchContext({ injectAgents: enabled })
          }}
        />
        {validationIssues.length > 0 ? (
          <ul className="planner-validation-list">
            {validationIssues.map((issue) => (
              <li key={`${issue.code}-${issue.name ?? issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        ) : (
          <p className="builder-field-hint">Prompt placeholders match workflow variables.</p>
        )}
      </ExpandableSection>

      <ExpandableSection
        title="Capabilities"
        count={selection.selectedTools.length}
        expanded={expandedSubs.has('capabilities')}
        onToggle={() => toggleSub('capabilities')}
        hint="Catalog tools exposed to the planner when capability injection is enabled."
      >
        <ul className="builder-check-list">
          <ChecklistItem
            title="Include capability definitions in prompt"
            description="Expands {CAPABILITIES} with selected tool names and descriptions."
            checked={selection.injectCapabilities}
            disabled={disabled}
            onChange={(injectCapabilities) => patchContext({ injectCapabilities })}
          />
        </ul>
        <p className="builder-subsection-label">Selected capabilities</p>
        {catalogTools.length === 0 ? (
          <p className="builder-empty">No catalog tools loaded.</p>
        ) : (
          <ul className="builder-check-list">
            {catalogTools.map((tool) => (
              <ChecklistItem
                key={tool.id}
                title={tool.name ?? tool.id}
                description={tool.description}
                checked={isPlannerToolEnabled(draft, tool.id)}
                disabled={disabled}
                onChange={(enabled) => {
                  updateDraft(togglePlannerTool(draft, tool.id, enabled, catalogTools))
                }}
              />
            ))}
          </ul>
        )}
      </ExpandableSection>

      <ExpandableSection
        title="Available agents"
        count={selection.selectedAgents.length}
        expanded={expandedSubs.has('agents')}
        onToggle={() => toggleSub('agents')}
        hint="Delegate agents the planner may route work to."
      >
        <ul className="builder-check-list">
          <ChecklistItem
            title="Include agent definitions in prompt"
            description="Expands {AGENTS} with selected agent names and descriptions."
            checked={selection.injectAgents}
            disabled={disabled}
            onChange={(injectAgents) => patchContext({ injectAgents })}
          />
        </ul>
        <p className="builder-subsection-label">Selected agents</p>
        {otherWorkflows.length === 0 ? (
          <p className="builder-empty">No other agent presets available.</p>
        ) : (
          <ul className="builder-check-list">
            {otherWorkflows.map((workflow) => (
              <ChecklistItem
                key={workflow.id}
                title={workflow.label ?? workflowLabel(workflow.id)}
                description={workflow.description ?? workflow.id}
                checked={isPlannerAgentEnabled(draft, workflow.id)}
                disabled={disabled}
                onChange={(enabled) => {
                  updateDraft(togglePlannerAgent(draft, workflow.id, enabled, catalogTools))
                }}
              />
            ))}
          </ul>
        )}
      </ExpandableSection>

      <ExpandableSection
        title="Planner context preview"
        expanded={expandedSubs.has('preview')}
        onToggle={() => toggleSub('preview')}
        hint="Runtime-composed planner prompt and context footprint."
      >
        <div className="planner-context-preview">
          <p className="planner-context-preview-label">Active prompt</p>
          <p className="planner-preview-active-name">{activePrompt.name}</p>

          <p className="planner-context-preview-label">Prompt template</p>
          <pre className="planner-context-preview-json">{activePrompt.promptTemplate}</pre>

          <p className="planner-context-preview-label">Workflow variables</p>
          <ul className="planner-preview-list">
            {definedVariables.length === 0 ? (
              <li>None defined</li>
            ) : (
              definedVariables.map((variable) => (
                <li key={variable.name}>
                  {variable.name}
                  {variable.required ? ' (required)' : ''}
                  {` · ${VARIABLE_SCOPE_LABELS[normalizeVariableScope(variable.scope)]}`}
                </li>
              ))
            )}
          </ul>

          <p className="planner-context-preview-label">Exposed to planner</p>
          <ul className="planner-preview-list">
            {selection.selectedVariables.length === 0 ? (
              <li>None selected</li>
            ) : (
              selection.selectedVariables.map((variableName) => {
                const variable = definedVariables.find((entry) => entry.name === variableName)
                return (
                  <li key={variableName}>
                    {variableName}
                    {variable
                      ? ` (${VARIABLE_SCOPE_LABELS[normalizeVariableScope(variable.scope)]})`
                      : ''}
                  </li>
                )
              })
            )}
          </ul>

          <p className="planner-context-preview-label">Capabilities</p>
          <ul className="planner-preview-list">
            {selection.selectedTools.map((toolId) => {
              const tool = catalogTools.find((entry) => entry.id === toolId)
              return <li key={toolId}>{tool?.name ?? toolId}</li>
            })}
          </ul>

          <p className="planner-context-preview-label">Agents</p>
          <ul className="planner-preview-list">
            {selection.selectedAgents.map((agentId) => (
              <li key={agentId}>{workflowLabel(agentId)}</li>
            ))}
          </ul>

          <p className="planner-context-preview-label">Generated planner prompt</p>
          <pre className="planner-context-preview-json">{generatedPrompt}</pre>

          <p className="planner-context-preview-label">Estimated context size</p>
          <p className="planner-token-estimate">{tokenEstimate} tokens</p>
        </div>
      </ExpandableSection>
    </div>
  )
}
