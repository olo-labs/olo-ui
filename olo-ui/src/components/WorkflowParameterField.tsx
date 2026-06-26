import type { CatalogParameter, CatalogComponentBase } from '../types/catalog'
import type { WorkflowDocument, WorkflowParameter } from '../types/workflow'
import { agentModelOptions } from '../lib/workflowModelProviders'
import { catalogStore } from '../store/catalogStore'
import { workflowConfigurationStore } from '../store/workflowConfigurationStore'
import {
  readPlannerContext,
  updatePlannerContext,
} from '../lib/plannerContext'
import { PromptTokenTextarea } from './PromptTokenTextarea'
import {
  SYSTEM_PROMPT_PARAMETER_ID,
  buildPromptInsertOptions,
} from '../lib/promptTokens'

export function workflowParameterToDescriptor(
  id: string,
  param: WorkflowParameter,
): CatalogParameter {
  return {
    id,
    type: param.type ?? 'string',
    label: param.label ?? id,
    description: param.description,
    required: param.required,
    validation: param.validation,
    ui: param.ui,
  }
}

export function updateWorkflowParameterValue(
  workflow: WorkflowDocument,
  paramId: string,
  value: unknown,
): WorkflowDocument {
  const existing = workflow.parameters?.[paramId] ?? { type: 'string' }
  return {
    ...workflow,
    parameters: {
      ...workflow.parameters,
      [paramId]: {
        ...existing,
        defaultValue: value,
      },
    },
  }
}

export function WorkflowParameterField({
  descriptor,
  value,
  onChange,
  compact = false,
  workflowVariableNames = [],
  workflow,
  onWorkflowChange,
  catalogTools,
}: {
  descriptor: CatalogParameter
  value: unknown
  onChange: (value: unknown) => void
  compact?: boolean
  workflowVariableNames?: string[]
  workflow?: WorkflowDocument | null
  onWorkflowChange?: (workflow: WorkflowDocument) => void
  catalogTools?: CatalogComponentBase[]
}) {
  const widget = descriptor.ui?.widget ?? 'STRING'
  const label = descriptor.label ?? descriptor.id
  const rowClass = compact ? 'catalog-flow-param-row' : 'tenant-config-form-row workflow-param-row'
  const inputClass = compact ? 'catalog-flow-param-input' : 'tenant-config-input'

  if (widget === 'BOOLEAN') {
    return (
      <label className={rowClass}>
        <span className="catalog-flow-param-label">{label}</span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    )
  }

  if (
    widget === 'SLIDER'
    || widget === 'NUMBER'
    || descriptor.type === 'number'
    || descriptor.type === 'integer'
  ) {
    const min = descriptor.validation?.minimum
    const max = descriptor.validation?.maximum
    const step = descriptor.validation?.step ?? (descriptor.type === 'integer' ? 1 : 0.1)
    return (
      <label className={rowClass}>
        <span className="catalog-flow-param-label">{label}</span>
        <input
          className={inputClass}
          type="number"
          value={value === undefined || value === null ? '' : String(value)}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') {
              onChange(null)
              return
            }
            onChange(descriptor.type === 'integer' ? parseInt(raw, 10) : parseFloat(raw))
          }}
        />
      </label>
    )
  }

  if (widget === 'MODEL_SELECTOR' && workflow) {
    const stringValue = value == null ? '' : String(value)
    return (
      <label className={rowClass}>
        <span className="catalog-flow-param-label">{label}</span>
        <select
          className={inputClass}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select…</option>
          {agentModelOptions(workflow).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (widget === 'TEXTAREA' && descriptor.id === SYSTEM_PROMPT_PARAMETER_ID) {
    const stringValue = value == null ? '' : String(value)
    const plannerContext = workflow ? readPlannerContext(workflow) : null
    const resolvedCatalogTools = catalogTools ?? catalogStore.getState().catalog?.tools ?? []
    const workflowSummaries = workflowConfigurationStore.getState().workflows

    const patchPlannerContext = (patch: { injectCapabilities?: boolean; injectAgents?: boolean }) => {
      if (!workflow || !onWorkflowChange) return
      onWorkflowChange(updatePlannerContext(workflow, patch, resolvedCatalogTools))
    }

    return (
      <div className={compact ? 'catalog-flow-param-row catalog-flow-param-row-stack' : 'workflow-param-row-stack'}>
        <span className={compact ? 'catalog-flow-param-label' : 'tenant-config-label'}>{label}</span>
        <PromptTokenTextarea
          compact={compact}
          rows={compact ? 3 : 6}
          value={stringValue}
          placeholder={descriptor.ui?.placeholder}
          workflowVariableNames={workflowVariableNames}
          insertOptions={buildPromptInsertOptions(workflowVariableNames)}
          textareaClassName={compact ? 'catalog-flow-param-textarea' : 'tenant-config-input workflow-param-textarea'}
          onChange={(next) => onChange(next)}
        />
        {workflow && onWorkflowChange && plannerContext ? (
          <div className="prompt-inject-options">
            <label className="prompt-inject-option">
              <input
                type="checkbox"
                checked={plannerContext.injectCapabilities}
                onChange={(e) => patchPlannerContext({ injectCapabilities: e.target.checked })}
              />
              <span>Tools</span>
            </label>
            <label className="prompt-inject-option">
              <input
                type="checkbox"
                checked={plannerContext.injectAgents}
                onChange={(e) => patchPlannerContext({ injectAgents: e.target.checked })}
              />
              <span>Agents</span>
            </label>
            <p className="prompt-inject-hint">
              When enabled, tool and agent definitions are appended to the prompt at run time, in
              addition to {'{tools}'} and {'{agents}'} placeholders in your template.
              {plannerContext.selectedTools.length > 0 || plannerContext.selectedAgents.length > 0 ? (
                <>
                  {' '}
                  Using {plannerContext.selectedTools.length} tool
                  {plannerContext.selectedTools.length === 1 ? '' : 's'} and{' '}
                  {plannerContext.selectedAgents.length} agent
                  {plannerContext.selectedAgents.length === 1 ? '' : 's'} from planner context.
                </>
              ) : null}
            </p>
          </div>
        ) : null}
      </div>
    )
  }

  if (widget === 'TEXTAREA') {
    return (
      <label className={rowClass}>
        <span className="catalog-flow-param-label">{label}</span>
        <textarea
          className={`${inputClass} catalog-flow-param-textarea`}
          value={value == null ? '' : String(value)}
          placeholder={descriptor.ui?.placeholder}
          rows={2}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    )
  }

  return (
    <label className={rowClass}>
      <span className="catalog-flow-param-label">{label}</span>
      <input
        className={inputClass}
        type="text"
        value={value == null ? '' : String(value)}
        placeholder={descriptor.ui?.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
