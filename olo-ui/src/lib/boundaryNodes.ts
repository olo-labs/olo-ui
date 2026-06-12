import type { CatalogNode } from '../types/catalog'
import type { WorkflowDocument, WorkflowNode } from '../types/workflow'

export const START_NODE_TYPE = 'START'
export const END_NODE_TYPE = 'END'
const LEGACY_START = 'INPUT'
const LEGACY_END = 'OUTPUT'

export const RETURN_VARIABLE_METADATA_KEY = 'returnVariable'

export function normalizeNodeType(type: string): string {
  if (type === LEGACY_START) return START_NODE_TYPE
  if (type === LEGACY_END) return END_NODE_TYPE
  return type
}

export function isStartNodeType(type: string): boolean {
  return normalizeNodeType(type) === START_NODE_TYPE
}

export function isEndNodeType(type: string): boolean {
  return normalizeNodeType(type) === END_NODE_TYPE
}

export function isBoundaryNodeType(type: string): boolean {
  return isStartNodeType(type) || isEndNodeType(type)
}

export function boundaryNodeLabel(type: string): string {
  if (isStartNodeType(type)) return 'Start'
  if (isEndNodeType(type)) return 'End'
  return type
}

export const START_NODE_DESCRIPTOR: CatalogNode = {
  id: 'olo-core:START',
  kind: 'NODE',
  name: 'Start',
  description: 'Workflow entry — maps caller input to workflow variables',
  emoji: '▶',
  category: 'control',
  outputs: [{ id: 'out', name: 'out', schema: 'any', ui: { position: 'RIGHT' } }],
  inputs: [],
}

export const END_NODE_DESCRIPTOR: CatalogNode = {
  id: 'olo-core:END',
  kind: 'NODE',
  name: 'End',
  description: 'Workflow exit — maps a workflow variable to the caller result',
  emoji: '⏹',
  category: 'control',
  inputs: [{ id: 'in', name: 'in', schema: 'any', ui: { position: 'LEFT' } }],
  outputs: [],
}

export function boundaryNodeDescriptor(nodeType: string): CatalogNode | null {
  if (isStartNodeType(nodeType)) return START_NODE_DESCRIPTOR
  if (isEndNodeType(nodeType)) return END_NODE_DESCRIPTOR
  return null
}

function legacyNodeId(type: string, id: string): string | null {
  if (isStartNodeType(type) && id === 'input') return 'start'
  if (isEndNodeType(type) && id === 'output') return 'end'
  return null
}

export function readStartInputMappings(node: WorkflowNode): string[] {
  const fromConfig = node.configuration?.inputVariableMappings
  if (Array.isArray(fromConfig)) {
    return fromConfig.filter((v): v is string => typeof v === 'string')
  }
  return (node.reads ?? [])
    .filter((r): r is string => typeof r === 'string' && r.startsWith('input.'))
    .map((r) => r.slice('input.'.length))
}

export function readEndOutputMapping(node: WorkflowNode, workflow: WorkflowDocument): string {
  const fromConfig = node.configuration?.outputVariableMapping
  if (typeof fromConfig === 'string' && fromConfig.trim()) return fromConfig
  const fromMeta = workflow.metadata?.[RETURN_VARIABLE_METADATA_KEY]
  if (typeof fromMeta === 'string' && fromMeta.trim()) return fromMeta
  const fromWrite = (node.writes ?? []).find(
    (w): w is string => typeof w === 'string' && w.startsWith('state.'),
  )
  if (fromWrite) return fromWrite.slice('state.'.length)
  return ''
}

export function applyStartInputMappings(
  workflow: WorkflowDocument,
  nodeId: string,
  variableNames: string[],
): WorkflowDocument {
  const nodes = (workflow.nodes ?? []).map((node) => {
    if (node.id !== nodeId || !isStartNodeType(node.type)) return node
    return {
      ...node,
      type: START_NODE_TYPE,
      reads: variableNames.map((name) => `input.${name}`),
      configuration: {
        ...node.configuration,
        inputVariableMappings: variableNames,
      },
    }
  })
  return { ...workflow, nodes }
}

export function applyEndOutputMapping(
  workflow: WorkflowDocument,
  nodeId: string,
  variableName: string,
): WorkflowDocument {
  const nodes = (workflow.nodes ?? []).map((node) => {
    if (node.id !== nodeId || !isEndNodeType(node.type)) return node
    return {
      ...node,
      type: END_NODE_TYPE,
      writes: variableName ? [`state.${variableName}`] : [],
      configuration: {
        ...node.configuration,
        outputVariableMapping: variableName,
      },
    }
  })
  return {
    ...workflow,
    nodes,
    metadata: {
      ...workflow.metadata,
      ...(variableName ? { [RETURN_VARIABLE_METADATA_KEY]: variableName } : {}),
    },
  }
}

export function createStartNode(
  position: { x: number; y: number },
  existingIds: Iterable<string>,
): WorkflowNode {
  const taken = new Set(existingIds)
  const id = taken.has('start') ? 'start-2' : 'start'
  return {
    id,
    type: START_NODE_TYPE,
    ports: [
      {
        id: 'out',
        name: 'out',
        schema: 'any',
        direction: 'OUTPUT',
        required: false,
        minConnections: 0,
        ui: { position: 'RIGHT' },
      },
    ],
    reads: [],
    writes: [],
    configuration: {
      designer: { position },
      inputVariableMappings: [],
    },
  }
}

export function createEndNode(
  position: { x: number; y: number },
  existingIds: Iterable<string>,
): WorkflowNode {
  const taken = new Set(existingIds)
  const id = taken.has('end') ? 'end-2' : 'end'
  return {
    id,
    type: END_NODE_TYPE,
    ports: [
      {
        id: 'in',
        name: 'in',
        schema: 'any',
        direction: 'INPUT',
        required: false,
        minConnections: 0,
        ui: { position: 'LEFT' },
      },
    ],
    reads: [],
    writes: [],
    configuration: {
      designer: { position },
      outputVariableMapping: '',
    },
  }
}

/** Migrate legacy INPUT/OUTPUT nodes and ids to START/END. */
export function normalizeWorkflowBoundaries(doc: WorkflowDocument): WorkflowDocument {
  const idRemap = new Map<string, string>()

  const nodes = (doc.nodes ?? []).map((node) => {
    const normalizedType = normalizeNodeType(node.type)
    const nextId = legacyNodeId(normalizedType, node.id)
    if (nextId) idRemap.set(node.id, nextId)
    return {
      ...node,
      id: nextId ?? node.id,
      type: normalizedType,
    }
  })

  const edges = (doc.edges ?? []).map((edge) => ({
    ...edge,
    sourceNodeId: edge.sourceNodeId ? idRemap.get(edge.sourceNodeId) ?? edge.sourceNodeId : edge.sourceNodeId,
    targetNodeId: edge.targetNodeId ? idRemap.get(edge.targetNodeId) ?? edge.targetNodeId : edge.targetNodeId,
    source: edge.source ? idRemap.get(edge.source) ?? edge.source : edge.source,
    target: edge.target ? idRemap.get(edge.target) ?? edge.target : edge.target,
    from: edge.from ? idRemap.get(edge.from) ?? edge.from : edge.from,
    to: edge.to ? idRemap.get(edge.to) ?? edge.to : edge.to,
  }))

  return { ...doc, nodes, edges }
}
