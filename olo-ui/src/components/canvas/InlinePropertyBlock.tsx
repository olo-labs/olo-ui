/*
 * Copyright (c) 2026 Olo Labs
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  applyEndOutputMapping,
  applyStartInputMappings,
  isEndNodeType,
  isStartNodeType,
  readEndOutputMapping,
  readStartInputMappings,
} from '../../lib/boundaryNodes'
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
import { sortedWorkflowParameters } from '../../lib/inlineWorkflowParameters'
import type { InlinePropertyConfig, WorkflowDocument, WorkflowNode } from '../../types/workflow'
import type { StudioCatalog } from '../../types/catalog'
import {
  WorkflowParameterField,
  updateWorkflowParameterValue,
} from '../WorkflowParameterField'

export function InlinePropertyBlock({
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
            catalogTools={catalog?.tools ?? []}
            onWorkflowChange={onChange}
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
