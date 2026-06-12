import { workflowConfigurationStore } from '../../store/workflowConfigurationStore'
import {
  applyEndOutputMapping,
  applyStartInputMappings,
  boundaryNodeLabel,
  isEndNodeType,
  isStartNodeType,
  readEndOutputMapping,
  readStartInputMappings,
} from '../../lib/boundaryNodes'
import {
  applyAgentPromptRef,
  plannerPromptById,
  readAgentPromptRef,
  readPlannerContext,
} from '../../lib/plannerContext'
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
  const variables = workflowVariables(workflow)

  if (isStartNodeType(node.type)) {
    const selected = new Set(readStartInputMappings(node))
    return (
      <div className="canvas-node-properties">
        <div className="side-panel-title">{boundaryNodeLabel(node.type)} node</div>
        <p className="canvas-node-properties-hint">
          Map workflow variables that receive caller input at the start of the run.
        </p>
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
        <div className="side-panel-title">{boundaryNodeLabel(node.type)} node</div>
        <p className="canvas-node-properties-hint">
          Select the workflow variable returned to the caller when the run completes.
        </p>
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
    const plannerContext = readPlannerContext(workflow)
    const prompts = plannerContext.prompts
    const promptRef = readAgentPromptRef(node, workflow)
    const selectedPrompt = plannerPromptById(plannerContext, promptRef)
    const options = agentModelOptions(workflow)
    const selected = readAgentModelSelection(node, workflow)
    const selectedOption = options.find((option) => option.value === selected)
    const routingOptions = options.filter((option) => option.group === 'routing')
    const providerOptions = options.filter((option) => option.group === 'provider')
    return (
      <div className="canvas-node-properties">
        <div className="side-panel-title">Agent node</div>
        <p className="canvas-node-properties-hint">
          Choose the planner prompt, model routing, and provider for this agent.
        </p>
        <p className="canvas-node-properties-meta">Node id: {node.id}</p>
        {prompts.length === 0 ? (
          <p className="builder-empty">Add planner prompts in the Builder panel first.</p>
        ) : (
          <label className="canvas-node-select-field">
            <span>Planner prompt</span>
            <select
              className="workflow-canvas-select"
              value={promptRef}
              onChange={(e) => onChange(applyAgentPromptRef(workflow, node.id, e.target.value))}
            >
              {prompts.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.name}
                  {prompt.id === plannerContext.defaultPromptId ? ' (default)' : ''}
                </option>
              ))}
            </select>
          </label>
        )}
        {selectedPrompt ? (
          <p className="canvas-node-properties-meta">
            {workflowVariables(workflow).length} workflow variable
            {workflowVariables(workflow).length === 1 ? '' : 's'}
          </p>
        ) : null}
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

  return null
}

export function isCanvasNodePropertiesTarget(node: WorkflowNode): boolean {
  return (
    isStartNodeType(node.type)
    || isEndNodeType(node.type)
    || isAgentNodeType(node.type)
    || isModelConsumerNodeType(node.type)
  )
}

export function useSelectedCanvasNode(): WorkflowNode | null {
  const draft = workflowConfigurationStore((s) => s.draft)
  const nodeId = workflowConfigurationStore((s) => s.selectedCanvasNodeId)
  if (!draft || !nodeId) return null
  return draft.nodes?.find((n) => n.id === nodeId) ?? null
}
