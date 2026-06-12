import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { catalogStore } from '../../store/catalogStore'
import { boundaryNodeLabel } from '../../lib/boundaryNodes'
import { nodeTooltipLines } from '../../lib/canvasLabels'
import { findCatalogNode } from '../../lib/catalogLookup'
import type { CatalogFlowNodeData } from '../../lib/workflowGraph'
import type { WorkflowPort } from '../../types/workflow'

function handlePosition(side?: string, fallback: Position = Position.Left): Position {
  switch (side?.toUpperCase()) {
    case 'TOP':
      return Position.Top
    case 'BOTTOM':
      return Position.Bottom
    case 'RIGHT':
      return Position.Right
    case 'LEFT':
      return Position.Left
    default:
      return fallback
  }
}

function portsFromWorkflow(workflowPorts?: WorkflowPort[]): {
  inputs: WorkflowPort[]
  outputs: WorkflowPort[]
} {
  if (!workflowPorts?.length) return { inputs: [], outputs: [] }
  return {
    inputs: workflowPorts.filter((p) => p.direction === 'INPUT'),
    outputs: workflowPorts.filter((p) => p.direction === 'OUTPUT'),
  }
}

function CatalogFlowNodeComponent({ id, data, selected }: NodeProps) {
  const catalog = catalogStore.getState().catalog
  const nodeData = data as CatalogFlowNodeData
  const descriptor = findCatalogNode(catalog, nodeData.workflowType)
  const workflowPortGroups = portsFromWorkflow(nodeData.workflowPorts)
  const inputs =
    workflowPortGroups.inputs.length > 0
      ? workflowPortGroups.inputs
      : (descriptor?.inputs ?? [])
  const outputs =
    workflowPortGroups.outputs.length > 0
      ? workflowPortGroups.outputs
      : (descriptor?.outputs ?? [])
  const tooltipLines = nodeTooltipLines(id, nodeData, descriptor)

  return (
    <div
      className={`catalog-flow-node ${selected ? 'selected' : ''}`}
      title={tooltipLines.join(' · ')}
    >
      <div className="catalog-flow-node-tooltip" role="tooltip">
        {tooltipLines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>
      <div className="catalog-flow-node-header">
        <span className="catalog-flow-node-emoji" aria-hidden>
          {nodeData.emoji ?? descriptor?.emoji ?? '▢'}
        </span>
        <div className="catalog-flow-node-titles">
          <span className="catalog-flow-node-label">{nodeData.label}</span>
          <span className="catalog-flow-node-type">{boundaryNodeLabel(nodeData.workflowType)}</span>
        </div>
      </div>
      {inputs.length === 0 && outputs.length === 0 ? (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="in"
            className="catalog-flow-handle catalog-flow-handle-input"
            title="in"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="out"
            className="catalog-flow-handle catalog-flow-handle-output"
            title="out"
          />
        </>
      ) : (
        <>
          {inputs.map((port, index) => (
            <Handle
              key={`in-${port.id}`}
              type="target"
              position={handlePosition(port.ui?.position, Position.Left)}
              id={port.id}
              className="catalog-flow-handle catalog-flow-handle-input"
              style={{ top: `${((index + 1) / (inputs.length + 1)) * 100}%` }}
              title={port.name ?? port.id}
            />
          ))}
          {outputs.map((port, index) => (
            <Handle
              key={`out-${port.id}`}
              type="source"
              position={handlePosition(port.ui?.position, Position.Right)}
              id={port.id}
              className="catalog-flow-handle catalog-flow-handle-output"
              style={{ top: `${((index + 1) / (outputs.length + 1)) * 100}%` }}
              title={port.name ?? port.id}
            />
          ))}
        </>
      )}
      <span className="catalog-flow-node-id">{id}</span>
    </div>
  )
}

export const CatalogFlowNode = memo(CatalogFlowNodeComponent)
