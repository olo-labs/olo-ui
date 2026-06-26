import { memo, type CSSProperties } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { catalogStore } from '../../store/catalogStore'
import { workflowConfigurationStore } from '../../store/workflowConfigurationStore'
import { nodeTooltipLines } from '../../lib/canvasLabels'
import { findCatalogComponent } from '../../lib/catalogLookup'
import {
  portDisplayColor,
  portDisplayLabel,
  portTooltipLines,
} from '../../lib/portConnection'
import { resolvePortColors } from '../../lib/workflowDesigner'
import {
  catalogComponentToPorts,
  groupPortsBySide,
  isDelegateAgentNode,
  isMessagePortId,
  PLANNER_ROUTED_MESSAGE_PORT_COLOR,
  resolveNodePorts,
  usesPlannerRoutedMessagePorts,
  type PortSide,
} from '../../lib/workflowNodePorts'
import type { CatalogFlowNodeData } from '../../lib/workflowGraph'
import type { WorkflowPort } from '../../types/workflow'
import { ChildWorkflowNodeBody } from './ChildWorkflowNodeBody'
import { NodeInlineLabel } from './NodeInlineLabel'
import { NodeInlineProperties } from './NodeInlineProperties'

function handlePosition(side: PortSide): Position {
  switch (side) {
    case 'TOP':
      return Position.Top
    case 'BOTTOM':
      return Position.Bottom
    case 'RIGHT':
      return Position.Right
    default:
      return Position.Left
  }
}

function portSlotPercent(index: number, count: number): string {
  return `${((index + 1) / (count + 1)) * 100}%`
}

function PortRow({
  port,
  side,
  index,
  count,
  portColors,
  inline = false,
  dimmed = false,
}: {
  port: WorkflowPort
  side: PortSide
  index: number
  count: number
  portColors: Record<string, string>
  inline?: boolean
  dimmed?: boolean
}) {
  const color = dimmed
    ? PLANNER_ROUTED_MESSAGE_PORT_COLOR
    : portDisplayColor(port, portColors)
  const isInput = port.direction === 'INPUT'
  const position = handlePosition(side)
  const tooltipLines = [
    ...portTooltipLines(port),
    ...(dimmed ? ['Connected dynamically via planner/agent at runtime'] : []),
  ]
  const slot = portSlotPercent(index, count)
  const handleStyle: CSSProperties = inline
    ? { top: '50%', ...(color ? { background: color, borderColor: color } : {}) }
    : side === 'LEFT' || side === 'RIGHT'
      ? { top: slot, ...(color ? { background: color, borderColor: color } : {}) }
      : { left: slot, ...(color ? { background: color, borderColor: color } : {}) }

  const rowClass = [
    inline
      ? `catalog-flow-port-row ${isInput ? 'catalog-flow-port-row-input' : 'catalog-flow-port-row-output'} catalog-flow-port-row-inline-${side.toLowerCase()}`
      : `catalog-flow-port-row catalog-flow-port-row-side-${side.toLowerCase()}`,
    dimmed ? 'catalog-flow-port-row-dimmed' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={rowClass}
      style={inline ? undefined : ({ '--port-slot': slot } as CSSProperties)}
    >
      <Handle
        type={isInput ? 'target' : 'source'}
        position={position}
        id={port.id}
        isConnectable={!dimmed}
        className={`catalog-flow-handle catalog-flow-handle-${isInput ? 'input' : 'output'}${dimmed ? ' catalog-flow-handle-dimmed' : ''}`}
        style={handleStyle}
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

function BoundaryPorts({
  side,
  ports,
  portColors,
}: {
  side: 'TOP' | 'BOTTOM'
  ports: WorkflowPort[]
  portColors: Record<string, string>
}) {
  if (ports.length === 0) return null
  return (
    <div className={`catalog-flow-node-boundary catalog-flow-node-boundary-${side.toLowerCase()}`}>
      {ports.map((port, index) => (
        <PortRow
          key={`${side}-${port.id}`}
          port={port}
          side={side}
          index={index}
          count={ports.length}
          portColors={portColors}
        />
      ))}
    </div>
  )
}

function InlineLateralPorts({
  leftPorts,
  rightPorts,
  portColors,
  dimMessagePorts,
}: {
  leftPorts: WorkflowPort[]
  rightPorts: WorkflowPort[]
  portColors: Record<string, string>
  dimMessagePorts: boolean
}) {
  if (leftPorts.length === 0 && rightPorts.length === 0) return null
  return (
    <div className="catalog-flow-node-ports">
      {leftPorts.length > 0 ? (
        <div className="catalog-flow-node-ports-column catalog-flow-node-ports-column-input">
          {leftPorts.map((port, index) => (
            <PortRow
              key={`left-${port.id}`}
              port={port}
              side="LEFT"
              index={index}
              count={leftPorts.length}
              portColors={portColors}
              inline
              dimmed={dimMessagePorts && isMessagePortId(port.id)}
            />
          ))}
        </div>
      ) : null}
      {rightPorts.length > 0 ? (
        <div className="catalog-flow-node-ports-column catalog-flow-node-ports-column-output">
          {rightPorts.map((port, index) => (
            <PortRow
              key={`right-${port.id}`}
              port={port}
              side="RIGHT"
              index={index}
              count={rightPorts.length}
              portColors={portColors}
              inline
              dimmed={dimMessagePorts && isMessagePortId(port.id)}
            />
          ))}
        </div>
      ) : null}
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
  const descriptor = findCatalogComponent(catalog, nodeData.workflowType, workflowNode)
  const catalogPorts = descriptor ? catalogComponentToPorts(descriptor) : []
  const mergedPorts = resolveNodePorts(
    nodeData.workflowType,
    nodeData.workflowPorts,
    catalogPorts,
    workflowNode?.configuration,
  )
  const portsBySide = groupPortsBySide(
    mergedPorts.length > 0 ? mergedPorts : catalogPorts,
  )
  const tooltipLines = nodeTooltipLines(id, nodeData, descriptor)

  const dimMessagePorts = usesPlannerRoutedMessagePorts(
    nodeData.workflowType,
    workflowNode?.configuration,
  )
  const isChildWorkflow = isDelegateAgentNode(workflowNode?.configuration)
  const delegateAgentId =
    typeof workflowNode?.configuration?.delegateAgentId === 'string'
      ? workflowNode.configuration.delegateAgentId
      : ''
  const messageLeftPorts = portsBySide.LEFT.filter((port) => isMessagePortId(port.id))
  const messageRightPorts = portsBySide.RIGHT.filter((port) => isMessagePortId(port.id))

  const renderPortRow = (
    port: WorkflowPort,
    side: PortSide,
    index: number,
    count: number,
  ) => (
    <PortRow
      key={`${side}-${port.id}`}
      port={port}
      side={side}
      index={index}
      count={count}
      portColors={portColors}
      inline
      dimmed={dimMessagePorts && isMessagePortId(port.id)}
    />
  )

  const nodeStyle = {
    '--catalog-node-min-width': presentation ? `${presentation.width}px` : undefined,
    '--catalog-node-max-width': presentation ? `${presentation.width}px` : undefined,
    '--catalog-node-min-height': presentation ? `${presentation.height}px` : undefined,
    '--catalog-node-selection-border': presentation?.selectionBorder,
  } as CSSProperties

  const hasLateralPorts =
    !isChildWorkflow && (portsBySide.LEFT.length > 0 || portsBySide.RIGHT.length > 0)

  return (
    <div
      className={[
        'catalog-flow-node',
        isChildWorkflow ? 'catalog-flow-node-child-workflow' : '',
        selected ? 'selected' : '',
      ].filter(Boolean).join(' ')}
      style={nodeStyle}
    >
      <div className="catalog-flow-node-tooltip" role="tooltip">
        {tooltipLines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>

      <BoundaryPorts side="TOP" ports={portsBySide.TOP} portColors={portColors} />

      <div className="catalog-flow-node-body">
        {isChildWorkflow ? (
          <ChildWorkflowNodeBody
            delegateAgentId={delegateAgentId}
            nodeLabel={nodeData.label}
            leftPorts={messageLeftPorts}
            rightPorts={messageRightPorts}
            readOnly={readOnly}
            renderPortRow={renderPortRow}
          />
        ) : (
          <>
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

            {hasLateralPorts ? (
              <InlineLateralPorts
                leftPorts={portsBySide.LEFT}
                rightPorts={portsBySide.RIGHT}
                portColors={portColors}
                dimMessagePorts={dimMessagePorts}
              />
            ) : null}

            {workflowNode && draft ? (
              <NodeInlineProperties
                workflow={draft}
                node={workflowNode}
                catalog={catalog}
                readOnly={readOnly}
                onChange={updateDraft}
              />
            ) : null}
          </>
        )}
      </div>

      <BoundaryPorts side="BOTTOM" ports={portsBySide.BOTTOM} portColors={portColors} />
    </div>
  )
}

export const CatalogFlowNode = memo(CatalogFlowNodeComponent)
