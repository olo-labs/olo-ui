import { memo, type CSSProperties } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { catalogStore } from '../../store/catalogStore'
import { workflowConfigurationStore } from '../../store/workflowConfigurationStore'
import { nodeTooltipLines } from '../../lib/canvasLabels'
import { findCatalogNode } from '../../lib/catalogLookup'
import {
  portDisplayColor,
  portDisplayLabel,
  portTooltipLines,
} from '../../lib/portConnection'
import { resolvePortColors } from '../../lib/workflowDesigner'
import type { CatalogFlowNodeData } from '../../lib/workflowGraph'
import type { WorkflowPort } from '../../types/workflow'
import { NodeInlineLabel } from './NodeInlineLabel'
import { NodeInlineProperties } from './NodeInlineProperties'

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

function PortRow({
  port,
  type,
  fallbackPosition,
  className,
  portColors,
}: {
  port: WorkflowPort
  type: 'source' | 'target'
  fallbackPosition: Position
  className: string
  portColors: Record<string, string>
}) {
  const color = portDisplayColor(port, portColors)
  const isInput = type === 'target'
  const position = handlePosition(port.ui?.position, fallbackPosition)
  const tooltipLines = portTooltipLines(port)

  return (
    <div
      className={`catalog-flow-port-row ${isInput ? 'catalog-flow-port-row-input' : 'catalog-flow-port-row-output'}`}
    >
      <Handle
        type={type}
        position={position}
        id={port.id}
        className={className}
        style={{
          top: '50%',
          ...(color ? { background: color, borderColor: color } : {}),
        }}
        aria-label={tooltipLines.join('. ')}
      />
      <span
        className="catalog-flow-port-label"
        style={{ color: color ?? undefined }}
      >
        {portDisplayLabel(port)}
      </span>
      <span className="catalog-flow-port-tooltip" role="tooltip">
        {tooltipLines.map((line, lineIndex) => (
          <span
            key={`${port.id}-${lineIndex}`}
            className={lineIndex === 0 ? 'catalog-flow-port-tooltip-title' : undefined}
          >
            {line}
          </span>
        ))}
      </span>
    </div>
  )
}

function CatalogFlowNodeComponent({ id, data, selected }: NodeProps) {
  const catalog = catalogStore.getState().catalog
  const draft = workflowConfigurationStore((s) => s.draft)
  const updateDraft = workflowConfigurationStore((s) => s.updateDraft)
  const nodeData = data as CatalogFlowNodeData
  const readOnly = Boolean(nodeData.readOnly)
  const workflowNode = draft?.nodes?.find((n) => n.id === id)
  const presentation = nodeData.presentation
  const portColors = resolvePortColors(draft)
  const descriptor = findCatalogNode(catalog, nodeData.workflowType, draft)
  const workflowPortGroups = portsFromWorkflow(nodeData.workflowPorts)
  const inputs =
    workflowPortGroups.inputs.length > 0
      ? workflowPortGroups.inputs
      : (descriptor?.inputs ?? []).map((port) => ({
          id: port.id,
          label: port.label ?? port.name ?? port.id,
          name: port.name,
          shortDescription: port.shortDescription,
          schema: port.schema ?? 'any',
          type: port.type ?? port.schema ?? 'any',
          acceptType: port.acceptType ?? port.type ?? port.schema ?? 'any',
          direction: 'INPUT' as const,
          required: port.required,
          minConnections: port.minConnections,
          maxConnections: port.maxConnections,
          ui: port.ui,
        }))
  const outputs =
    workflowPortGroups.outputs.length > 0
      ? workflowPortGroups.outputs
      : (descriptor?.outputs ?? []).map((port) => ({
          id: port.id,
          label: port.label ?? port.name ?? port.id,
          name: port.name,
          shortDescription: port.shortDescription,
          schema: port.schema ?? 'any',
          type: port.type ?? port.schema ?? 'any',
          direction: 'OUTPUT' as const,
          required: port.required,
          minConnections: port.minConnections,
          maxConnections: port.maxConnections,
          ui: port.ui,
        }))
  const tooltipLines = nodeTooltipLines(id, nodeData, descriptor)

  const nodeStyle = {
    '--catalog-node-min-width': presentation ? `${presentation.width}px` : undefined,
    '--catalog-node-max-width': presentation ? `${presentation.width}px` : undefined,
    '--catalog-node-min-height': presentation ? `${presentation.height}px` : undefined,
    '--catalog-node-selection-border': presentation?.selectionBorder,
  } as CSSProperties

  return (
    <div
      className={`catalog-flow-node ${selected ? 'selected' : ''}`}
      style={nodeStyle}
    >
      <div className="catalog-flow-node-tooltip" role="tooltip">
        {tooltipLines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>

      <div className="catalog-flow-node-body">
        <div className="catalog-flow-node-header">
          <span className="catalog-flow-node-emoji" aria-hidden>
            {presentation?.emoji ?? nodeData.emoji ?? descriptor?.emoji ?? '▢'}
          </span>
          <div className="catalog-flow-node-titles">
            <NodeInlineLabel
              nodeId={id}
              label={nodeData.label}
              placeholder={id}
              readOnly={readOnly}
              onChange={updateDraft}
            />
            <span className="catalog-flow-node-type">{presentation?.typeLabel ?? nodeData.workflowType}</span>
          </div>
        </div>

        <div className="catalog-flow-node-ports">
          {inputs.length > 0 ? (
            <div className="catalog-flow-node-ports-column catalog-flow-node-ports-column-input">
              {inputs.map((port) => (
                <PortRow
                  key={`in-${port.id}`}
                  port={port}
                  type="target"
                  fallbackPosition={Position.Left}
                  className="catalog-flow-handle catalog-flow-handle-input"
                  portColors={portColors}
                />
              ))}
            </div>
          ) : null}
          {outputs.length > 0 ? (
            <div className="catalog-flow-node-ports-column catalog-flow-node-ports-column-output">
              {outputs.map((port) => (
                <PortRow
                  key={`out-${port.id}`}
                  port={port}
                  type="source"
                  fallbackPosition={Position.Right}
                  className="catalog-flow-handle catalog-flow-handle-output"
                  portColors={portColors}
                />
              ))}
            </div>
          ) : null}
        </div>

        {workflowNode && draft ? (
          <NodeInlineProperties
            workflow={draft}
            node={workflowNode}
            catalog={catalog}
            readOnly={readOnly}
            onChange={updateDraft}
          />
        ) : null}
      </div>
    </div>
  )
}

export const CatalogFlowNode = memo(CatalogFlowNodeComponent)
