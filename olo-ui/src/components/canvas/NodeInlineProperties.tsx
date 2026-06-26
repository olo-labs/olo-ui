import { useMemo, type SyntheticEvent } from 'react'
import {
  applyEndOutputMapping,
  applyStartInputMappings,
  isEndNodeType,
  isStartNodeType,
  readEndOutputMapping,
  readStartInputMappings,
} from '../../lib/boundaryNodes'
import { presetParametersForWorkflow } from '../../lib/catalogLookup'
import { resolveNodePresentation } from '../../lib/nodePresentation'
import {
  applyAgentModelSelection,
  applyProviderRef,
  agentModelOptions,
  readAgentModelSelection,
  readProviderRef,
  workflowModelProviders,
  providerKind,
} from '../../lib/workflowModelProviders'
import { workflowVariables } from '../../lib/workflowResources'
import type { InlinePropertyConfig, WorkflowDocument, WorkflowNode } from '../../types/workflow'
import type { StudioCatalog } from '../../types/catalog'
import {
  WorkflowParameterField,
  updateWorkflowParameterValue,
  workflowParameterToDescriptor,
} from '../WorkflowParameterField'

export interface NodeInlinePropertiesProps {
  workflow: WorkflowDocument
  node: WorkflowNode
  catalog: StudioCatalog | null
  readOnly?: boolean
  onChange: (workflow: WorkflowDocument) => void
}

function sortedWorkflowParameters(workflow: WorkflowDocument, catalog: StudioCatalog | null) {
  const fromWorkflow = Object.entries(workflow.parameters ?? {}).map(([id, param]) =>
    workflowParameterToDescriptor(id, param),
  )
  if (fromWorkflow.length > 0) {
    return fromWorkflow.sort((a, b) => (a.ui?.order ?? 0) - (b.ui?.order ?? 0))
  }
  return [...presetParametersForWorkflow(catalog, workflow)].sort(
    (a, b) => (a.ui?.order ?? 0) - (b.ui?.order ?? 0),
  )
}

function InlinePropertyBlock({
  property,
  workflow,
  node,
  catalog,
  onChange,
}: {
  property: InlinePropertyConfig
  workflow: WorkflowDocument
  node: WorkflowNode
  catalog: StudioCatalog | null
  onChange: (workflow: WorkflowDocument) => void
}) {
  const variables = workflowVariables(workflow)
  const title = property.label?.trim() || property.id

  if (property.widget === 'VARIABLE_CHECKLIST' && isStartNodeType(node.type)) {
    return (
      <div className="catalog-flow-node-property-group">
        <span className="catalog-flow-node-property-title">{title}</span>
        {variables.length === 0 ? (
          <p className="catalog-flow-node-property-empty">No workflow variables</p>
        ) : (
          <ul className="catalog-flow-node-check-list">
            {variables.map((variable) => {
              const selected = new Set(readStartInputMappings(node))
              return (
                <li key={variable.name}>
                  <label className="catalog-flow-node-check-item">
                    <input
                      type="checkbox"
                      checked={selected.has(variable.name)}
                      onChange={(e) => {
                        const next = new Set(selected)
                        if (e.target.checked) next.add(variable.name)
                        else next.delete(variable.name)
                        onChange(applyStartInputMappings(workflow, node.id, [...next]))
                      }}
                    />
                    <span>{variable.name}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  if (property.widget === 'VARIABLE_SELECT' && isEndNodeType(node.type)) {
    return (
      <label className="catalog-flow-param-row">
        <span className="catalog-flow-param-label">{title}</span>
        <select
          className="catalog-flow-param-input"
          value={readEndOutputMapping(node, workflow)}
          onChange={(e) => onChange(applyEndOutputMapping(workflow, node.id, e.target.value))}
        >
          <option value="">Select…</option>
          {variables.map((variable) => (
            <option key={variable.name} value={variable.name}>
              {variable.name}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (property.widget === 'WORKFLOW_PARAMETERS') {
    const descriptors = sortedWorkflowParameters(workflow, catalog).filter(
      (descriptor) => descriptor.ui?.widget !== 'MODEL_SELECTOR',
    )
    if (descriptors.length === 0) return null
    return (
      <div className="catalog-flow-node-property-group">
        <span className="catalog-flow-node-property-title">{title}</span>
        {descriptors.map((descriptor) => (
          <WorkflowParameterField
            key={descriptor.id}
            compact
            descriptor={descriptor}
            value={workflow.parameters?.[descriptor.id]?.defaultValue}
            workflow={workflow}
            workflowVariableNames={variables.map((variable) => variable.name)}
            onChange={(value) => onChange(updateWorkflowParameterValue(workflow, descriptor.id, value))}
          />
        ))}
      </div>
    )
  }

  if (property.widget === 'MODEL_SELECTOR') {
    return (
      <label className="catalog-flow-param-row">
        <span className="catalog-flow-param-label">{title}</span>
        <select
          className="catalog-flow-param-input"
          value={readAgentModelSelection(node, workflow)}
          onChange={(e) => onChange(applyAgentModelSelection(workflow, node.id, e.target.value))}
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

  if (property.widget === 'PROVIDER_SELECTOR') {
    return (
      <label className="catalog-flow-param-row">
        <span className="catalog-flow-param-label">{title}</span>
        <select
          className="catalog-flow-param-input"
          value={readProviderRef(node)}
          onChange={(e) => onChange(applyProviderRef(workflow, node.id, e.target.value))}
        >
          <option value="">Select…</option>
          {workflowModelProviders(workflow).map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.id} ({providerKind(provider)})
            </option>
          ))}
        </select>
      </label>
    )
  }

  return null
}

export function NodeInlineProperties({
  workflow,
  node,
  catalog,
  readOnly = false,
  onChange,
}: NodeInlinePropertiesProps) {
  const presentation = useMemo(
    () => resolveNodePresentation(workflow, node, catalog),
    [catalog, node, workflow],
  )

  if (readOnly || presentation.inlineProperties.length === 0) return null

  const stopDrag = (event: SyntheticEvent) => {
    event.stopPropagation()
  }

  return (
    <div className="catalog-flow-node-properties nodrag nopan" onPointerDown={stopDrag}>
      {presentation.inlineProperties.map((property) => (
        <InlinePropertyBlock
          key={property.id}
          property={property}
          workflow={workflow}
          node={node}
          catalog={catalog}
          onChange={onChange}
        />
      ))}
    </div>
  )
}
