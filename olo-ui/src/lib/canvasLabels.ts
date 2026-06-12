import { boundaryNodeLabel } from './boundaryNodes'
import type { CatalogNode } from '../types/catalog'
import type { CatalogFlowNodeData } from './workflowGraph'
import type { Edge, Node } from '@xyflow/react'

export function nodeTooltipLines(
  nodeId: string,
  data: CatalogFlowNodeData,
  descriptor: CatalogNode | null,
): string[] {
  const lines = [
    data.label || nodeId,
    `${boundaryNodeLabel(data.workflowType)} · ${nodeId}`,
  ]
  if (descriptor?.description) lines.push(descriptor.description)
  return lines
}

export function edgeTooltipText(
  edge: Pick<Edge, 'source' | 'target' | 'sourceHandle' | 'targetHandle'>,
  nodes: Node<CatalogFlowNodeData>[],
): string {
  const source = nodes.find((n) => n.id === edge.source)
  const target = nodes.find((n) => n.id === edge.target)
  const sourceLabel = (source?.data as CatalogFlowNodeData | undefined)?.label ?? edge.source
  const targetLabel = (target?.data as CatalogFlowNodeData | undefined)?.label ?? edge.target
  const outPort = edge.sourceHandle ?? 'out'
  const inPort = edge.targetHandle ?? 'in'
  return `${sourceLabel} (${outPort}) → ${targetLabel} (${inPort})`
}
