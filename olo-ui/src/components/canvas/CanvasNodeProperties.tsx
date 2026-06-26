import { catalogStore } from '../../store/catalogStore'
import { workflowConfigurationStore } from '../../store/workflowConfigurationStore'
import { resolveNodeTypeLabel } from '../../lib/nodePresentation'
import {
  applyEndOutputMapping,
  applyStartInputMappings,
  isEndNodeType,
  isStartNodeType,
  readEndOutputMapping,
  readStartInputMappings,
} from '../../lib/boundaryNodes'
import { NodeLabelInput } from './NodeLabelInput'
import { workflowVariables } from '../../lib/workflowResources'
import {
  agentModelOptions,
  applyAgentModelSelection,
  applyProviderRef,
  isAgentNodeType,
  isModelConsumerNodeType,
  providerKind,
  readAgentModelSelection,
  readProviderRef,
  workflowModelProviders,
} from '../../lib/workflowModelProviders'
import type { WorkflowDocument, WorkflowNode } from '../../types/workflow'

export interface CanvasNodePropertiesProps {
  workflow: WorkflowDocument
  node: WorkflowNode
  dirty: boolean
  onChange: (workflow: WorkflowDocument) => void
}

export function CanvasNodeProperties({
  workflow,
  node,
  dirty,
  onChange,
}: CanvasNodePropertiesProps) {
  const catalog = catalogStore((s) => s.catalog)
  const typeLabel = resolveNodeTypeLabel(workflow, node, catalog)
  const variables = workflowVariables(workflow)

  const labelField = (
    <NodeLabelInput
      nodeId={node.id}
      label={node.label}
      placeholder={node.id}
      onChange={onChange}
    />
  )

  if (isStartNodeType(node.type)) {
    const selected = new Set(readStartInputMappings(node))
    return (
      <div className="canvas-node-properties">
        <div className="side-panel-title">{typeLabel} node</div>
        <p className="canvas-node-properties-hint">
          Map workflow variables that receive caller input at the start of the run.
        </p>
        {labelField}
        <p className="canvas-node-properties-meta">Node id: {node.id}</p>
        {variables.length === 0 ? (
          <p className="builder-empty">Define workflow variables in the Builder panel first.</p>
        ) : (
          <ul className="builder-check-list canvas-node-variable-list">
            {variables.map((variable) => (
              <li key={variable.name} className="builder-check-item">
                <label className="builder-check-label">
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
                  <span className="builder-check-text">
                    <span className="builder-check-name">{variable.name}</span>
                    {variable.description ? (
                      <span className="builder-check-desc">{variable.description}</span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {dirty ? <p className="canvas-node-properties-dirty">Unsaved changes</p> : null}
      </div>
    )
  }

  if (isEndNodeType(node.type)) {
    const selected = readEndOutputMapping(node, workflow)
    return (
      <div className="canvas-node-properties">
        <div className="side-panel-title">{typeLabel} node</div>
        <p className="canvas-node-properties-hint">
          Select the workflow variable returned to the caller when the run completes.
        </p>
        {labelField}
        <p className="canvas-node-properties-meta">Node id: {node.id}</p>
        {variables.length === 0 ? (
          <p className="builder-empty">Define workflow variables in the Builder panel first.</p>
        ) : (
          <label className="canvas-node-select-field">
            <span>Output variable</span>
            <select
              className="workflow-canvas-select"
              value={selected}
              onChange={(e) => {
                onChange(applyEndOutputMapping(workflow, node.id, e.target.value))
              }}
            >
              <option value="">Select variable…</option>
              {variables.map((variable) => (
                <option key={variable.name} value={variable.name}>
                  {variable.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {dirty ? <p className="canvas-node-properties-dirty">Unsaved changes</p> : null}
      </div>
    )
  }

  if (isAgentNodeType(node.type)) {
    const options = agentModelOptions(workflow)
    const selected = readAgentModelSelection(node, workflow)
    const selectedOption = options.find((option) => option.value === selected)
    const routingOptions = options.filter((option) => option.group === 'routing')
    const providerOptions = options.filter((option) => option.group === 'provider')
    return (
      <div className="canvas-node-properties">
        <div className="side-panel-title">Agent node</div>
        <p className="canvas-node-properties-hint">
          Choose model routing and provider for this agent. Edit the system prompt on the canvas node or in workflow parameters.
        </p>
        {labelField}
        <p className="canvas-node-properties-meta">Node id: {node.id}</p>
        {options.length === 0 ? (
          <p className="builder-empty">Add model providers in the Builder panel first.</p>
        ) : (
          <label className="canvas-node-select-field">
            <span>Model routing / provider</span>
            <select
              className="workflow-canvas-select"
              value={selected}
              onChange={(e) =>
                onChange(applyAgentModelSelection(workflow, node.id, e.target.value))
              }
            >
              {routingOptions.length > 0 ? (
                <optgroup label="Routing">
                  {routingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} — {option.description}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {providerOptions.length > 0 ? (
                <optgroup label="Providers">
                  {providerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.description})
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </label>
        )}
        {selectedOption ? (
          <p className="canvas-node-properties-meta">{selectedOption.description}</p>
        ) : null}
        {dirty ? <p className="canvas-node-properties-dirty">Unsaved changes</p> : null}
      </div>
    )
  }

  if (isModelConsumerNodeType(node.type)) {
    const providers = workflowModelProviders(workflow)
    const selected = readProviderRef(node)
    const selectedProvider = providers.find((p) => p.id === selected)
    return (
      <div className="canvas-node-properties">
        <div className="side-panel-title">{node.type} node</div>
        <p className="canvas-node-properties-hint">
          Choose which workflow model provider this node uses at runtime.
        </p>
        {labelField}
        <p className="canvas-node-properties-meta">Node id: {node.id}</p>
        {providers.length === 0 ? (
          <p className="builder-empty">Add model providers in the Builder panel first.</p>
        ) : (
          <label className="canvas-node-select-field">
            <span>Model provider</span>
            <select
              className="workflow-canvas-select"
              value={selected}
              onChange={(e) => onChange(applyProviderRef(workflow, node.id, e.target.value))}
            >
              <option value="">Select provider…</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.id} ({providerKind(provider)} · {provider.model || 'default'})
                </option>
              ))}
            </select>
          </label>
        )}
        {selectedProvider ? (
          <p className="canvas-node-properties-meta">
            {providerKind(selectedProvider)} → {selectedProvider.model || 'unspecified model'}
          </p>
        ) : null}
        {dirty ? <p className="canvas-node-properties-dirty">Unsaved changes</p> : null}
      </div>
    )
  }

  return (
    <div className="canvas-node-properties">
      <div className="side-panel-title">{typeLabel} node</div>
      {labelField}
      <p className="canvas-node-properties-meta">Node id: {node.id}</p>
      {dirty ? <p className="canvas-node-properties-dirty">Unsaved changes</p> : null}
    </div>
  )
}

export function isCanvasNodePropertiesTarget(_node: WorkflowNode): boolean {
  return true
}

export function useSelectedCanvasNode(): WorkflowNode | null {
  const draft = workflowConfigurationStore((s) => s.draft)
  const nodeId = workflowConfigurationStore((s) => s.selectedCanvasNodeId)
  if (!draft || !nodeId) return null
  return draft.nodes?.find((n) => n.id === nodeId) ?? null
}
