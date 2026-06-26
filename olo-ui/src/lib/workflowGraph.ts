import type { CatalogComponentBase, CatalogNode, StudioCatalog } from '../types/catalog'
import type { WorkflowDocument, WorkflowEdge, WorkflowNode, WorkflowPort } from '../types/workflow'
import { applyCatalogFlowEdgePresentation } from './canvasLabels'
import {
  createEndNode,
  createStartNode,
  normalizeNodeType,
} from './boundaryNodes'
import { findCatalogNode } from './catalogLookup'
import { resolveNodePresentation } from './nodePresentation'
import { defaultNodePosition as designerDefaultNodePosition, resolvePortColors } from './workflowDesigner'
import {
  cloneWorkflowNodeTemplate,
  isWorkflowTemplateCatalogId,
  workflowTypeFromTemplateCatalogId,
} from './workflowNodeTemplates'
import type { Node, Edge } from '@xyflow/react'
import type { NodePresentation } from './nodePresentation'
import { uniqueNodeId } from './workflowNodeId'

export function resolveNodeDisplayLabel(
  node: Pick<WorkflowNode, 'id' | 'label' | 'type'>,
  catalog: StudioCatalog | null,
): string {
  const custom = node.label?.trim()
  if (custom) return custom
  const descriptor = findCatalogNode(catalog, normalizeNodeType(node.type))
  return descriptor?.name ?? node.id
}

export function applyNodeLabel(
  workflow: WorkflowDocument,
  nodeId: string,
  label: string,
): WorkflowDocument {
  const trimmed = label.trim()
  return {
    ...workflow,
    nodes: (workflow.nodes ?? []).map((node) =>
      node.id === nodeId
        ? { ...node, ...(trimmed ? { label: trimmed } : { label: undefined }) }
        : node,
    ),
  }
}

export const FLOW_NODE_TYPE = 'catalogNode'
export const FLOW_EDGE_TYPE = 'catalogEdge'

export interface CatalogFlowNodeData {
  label: string
  emoji?: string
  workflowType: string
  catalogId?: string
  workflowPorts?: WorkflowPort[]
  presentation?: NodePresentation
  readOnly?: boolean
  [key: string]: unknown
}

export function catalogIdToWorkflowType(catalogId: string): string {
  const colon = catalogId.lastIndexOf(':')
  if (colon >= 0) return catalogId.substring(colon + 1)
  return catalogId
}

export { slugifyNodeId, uniqueNodeId } from './workflowNodeId'

function readDesignerPosition(node: WorkflowNode): { x: number; y: number } | null {
  const designer = node.configuration?.designer as
    | { position?: { x?: number; y?: number }; x?: number; y?: number }
    | undefined
  if (!designer) return null
  if (designer.position && typeof designer.position.x === 'number' && typeof designer.position.y === 'number') {
    return { x: designer.position.x, y: designer.position.y }
  }
  if (typeof designer.x === 'number' && typeof designer.y === 'number') {
    return { x: designer.x, y: designer.y }
  }
  return null
}

function defaultNodePosition(workflow: WorkflowDocument, index: number): { x: number; y: number } {
  return designerDefaultNodePosition(workflow, index)
}

function catalogPortsToWorkflowPorts(catalogNode: CatalogNode): WorkflowNode['ports'] {
  const ports: NonNullable<WorkflowNode['ports']> = []
  for (const input of catalogNode.inputs ?? []) {
    ports.push({
      id: input.id,
      label: input.label ?? input.name ?? input.id,
      name: input.name ?? input.id,
      shortDescription: input.shortDescription,
      schema: input.schema ?? 'any',
      type: input.type ?? input.schema ?? 'any',
      acceptType: input.acceptType ?? input.type ?? input.schema ?? 'any',
      direction: 'INPUT',
      required: input.required,
      minConnections: input.minConnections,
      maxConnections: input.maxConnections,
      ui: { position: input.ui?.position ?? 'LEFT', color: input.ui?.color },
    })
  }
  for (const output of catalogNode.outputs ?? []) {
    ports.push({
      id: output.id,
      label: output.label ?? output.name ?? output.id,
      name: output.name ?? output.id,
      shortDescription: output.shortDescription,
      schema: output.schema ?? 'any',
      type: output.type ?? output.schema ?? 'any',
      acceptType: output.acceptType,
      direction: 'OUTPUT',
      required: output.required,
      minConnections: output.minConnections,
      maxConnections: output.maxConnections,
      ui: { position: output.ui?.position ?? 'RIGHT', color: output.ui?.color },
    })
  }
  return ports
}

export function createWorkflowNodeFromCatalog(
  catalogItem: CatalogComponentBase,
  position: { x: number; y: number },
  existingIds: Iterable<string>,
  catalog: StudioCatalog | null,
  workflow: WorkflowDocument,
): WorkflowNode {
  if (isWorkflowTemplateCatalogId(catalogItem.id)) {
    const workflowType = workflowTypeFromTemplateCatalogId(catalogItem.id)
    return cloneWorkflowNodeTemplate(workflow, workflowType, position, existingIds)
  }

  const workflowType = catalogIdToWorkflowType(catalogItem.id)
  const normalized = normalizeNodeType(workflowType)
  if (normalized === 'START') {
    return createStartNode(workflow, position, existingIds)
  }
  if (normalized === 'END') {
    return createEndNode(workflow, position, existingIds)
  }
  const id = uniqueNodeId(catalogItem.name ?? workflowType, existingIds)
  const catalogNode =
    findCatalogNode(catalog, workflowType)
    ?? findCatalogNode(catalog, catalogItem.id)
    ?? (catalogItem.kind === 'NODE' ? (catalogItem as CatalogNode) : null)
  const ports = catalogNode ? catalogPortsToWorkflowPorts(catalogNode) : []

  return {
    id,
    type: normalizeNodeType(workflowType),
    label: catalogItem.name?.trim() || undefined,
    ports,
    reads: [],
    writes: [],
    configuration: {
      designer: { position },
    },
  }
}

function workflowEdgeEndpoints(edge: WorkflowEdge): { source: string; target: string; sourceHandle?: string; targetHandle?: string } | null {
  const source = edge.sourceNodeId ?? edge.source ?? edge.from
  const target = edge.targetNodeId ?? edge.target ?? edge.to
  if (!source || !target) return null
  return {
    source,
    target,
    sourceHandle: edge.sourcePortId,
    targetHandle: edge.targetPortId,
  }
}

export function workflowToFlow(
  workflow: WorkflowDocument,
  catalog: StudioCatalog | null,
  options?: { readOnly?: boolean },
): { nodes: Node<CatalogFlowNodeData>[]; edges: Edge[] } {
  const readOnly = Boolean(options?.readOnly)
  const workflowNodes = workflow.nodes ?? []
  const portColors = resolvePortColors(workflow)
  const nodes: Node<CatalogFlowNodeData>[] = workflowNodes.map((node, index) => {
    const workflowType = normalizeNodeType(node.type)
    const descriptor = findCatalogNode(catalog, workflowType, workflow)
    const presentation = resolveNodePresentation(workflow, node, catalog)
    const position = readDesignerPosition(node) ?? defaultNodePosition(workflow, index)
    return {
      id: node.id,
      type: FLOW_NODE_TYPE,
      position,
      draggable: readOnly ? false : undefined,
      data: {
        label: resolveNodeDisplayLabel(node, catalog),
        emoji: presentation.emoji ?? descriptor?.emoji,
        workflowType,
        catalogId: descriptor?.id,
        workflowPorts: node.ports,
        presentation,
        readOnly,
      },
    }
  })

  const edges: Edge[] = []
  for (const [index, edge] of (workflow.edges ?? []).entries()) {
    const endpoints = workflowEdgeEndpoints(edge)
    if (!endpoints) continue
    const flowEdge: Edge = {
      id: `edge-${index}-${endpoints.source}-${endpoints.sourceHandle ?? 'out'}-${endpoints.target}`,
      type: FLOW_EDGE_TYPE,
      source: endpoints.source,
      target: endpoints.target,
      sourceHandle: endpoints.sourceHandle,
      targetHandle: endpoints.targetHandle,
    }
    edges.push(applyCatalogFlowEdgePresentation(flowEdge, nodes, catalog, workflow, portColors))
  }

  return { nodes, edges }
}

export function flowToWorkflow(
  flowNodes: Node<CatalogFlowNodeData>[],
  flowEdges: Edge[],
  workflow: WorkflowDocument,
): WorkflowDocument {
  const existingById = new Map((workflow.nodes ?? []).map((n) => [n.id, n]))

  const nodes: WorkflowNode[] = flowNodes.map((flowNode) => {
    const existing = existingById.get(flowNode.id)
    const configuration = {
      ...(existing?.configuration ?? {}),
      designer: {
        ...((existing?.configuration?.designer as object) ?? {}),
        position: { x: flowNode.position.x, y: flowNode.position.y },
      },
    }
    return {
      ...existing,
      id: flowNode.id,
      type: normalizeNodeType(flowNode.data.workflowType),
      label:
        typeof flowNode.data.label === 'string' && flowNode.data.label.trim()
          ? flowNode.data.label.trim()
          : existing?.label,
      configuration,
      ports: existing?.ports ?? [],
      reads: existing?.reads ?? [],
      writes: existing?.writes ?? [],
    }
  })

  const edges: WorkflowEdge[] = flowEdges.map((edge) => ({
    sourceNodeId: edge.source,
    targetNodeId: edge.target,
    ...(edge.sourceHandle ? { sourcePortId: edge.sourceHandle } : {}),
    ...(edge.targetHandle ? { targetPortId: edge.targetHandle } : {}),
  }))

  return {
    ...workflow,
    nodes,
    edges,
  }
}
