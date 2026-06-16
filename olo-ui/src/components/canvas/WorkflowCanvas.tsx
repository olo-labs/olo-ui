import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { catalogStore } from '../../store/catalogStore'
import { workflowConfigurationStore } from '../../store/workflowConfigurationStore'
import { readCatalogDrag } from '../../lib/canvasDrag'
import { edgeTooltipText } from '../../lib/canvasLabels'
import {
  FLOW_EDGE_TYPE,
  FLOW_NODE_TYPE,
  catalogIdToWorkflowType,
  createWorkflowNodeFromCatalog,
  flowToWorkflow,
  resolveNodeDisplayLabel,
  workflowToFlow,
  type CatalogFlowNodeData,
} from '../../lib/workflowGraph'
import { buildQuery, parseQuery, parsedToPanelParams } from '../../routes'
import { CatalogFlowEdge } from './CatalogFlowEdge'
import { CatalogFlowNode } from './CatalogFlowNode'
import { CanvasContextMenu, type CanvasContextMenuState } from './CanvasContextMenu'
import { CanvasToolbar } from './CanvasToolbar'

const nodeTypes = { [FLOW_NODE_TYPE]: CatalogFlowNode }
const edgeTypes = { [FLOW_EDGE_TYPE]: CatalogFlowEdge }

export interface WorkflowCanvasProps {
  readOnly?: boolean
}

function WorkflowCanvasInner({ readOnly = false }: WorkflowCanvasProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const draft = workflowConfigurationStore((s) => s.draft)
  const catalog = catalogStore((s) => s.catalog)
  const updateDraft = workflowConfigurationStore((s) => s.updateDraft)
  const setSelectedCanvasNodeId = workflowConfigurationStore((s) => s.setSelectedCanvasNodeId)
  const [contextMenu, setContextMenu] = useState<CanvasContextMenuState | null>(null)

  const initial = useMemo(
    () => (draft ? workflowToFlow(draft, catalog) : { nodes: [], edges: [] }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when workflow file changes
    [draft?.id, workflowConfigurationStore.getState().selectedFileName],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CatalogFlowNodeData>>(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)
  const { screenToFlowPosition } = useReactFlow()
  const syncingRef = useRef(false)

  useEffect(() => {
    if (!draft) {
      setNodes([])
      setEdges([])
      return
    }
    syncingRef.current = true
    const next = workflowToFlow(draft, catalog)
    setNodes(next.nodes)
    setEdges(next.edges)
    queueMicrotask(() => {
      syncingRef.current = false
    })
  }, [draft, catalog, setNodes, setEdges])

  const persistGraph = useCallback(
    (nextNodes: Node<CatalogFlowNodeData>[], nextEdges: Edge[]) => {
      if (!draft || syncingRef.current || readOnly) return
      updateDraft(flowToWorkflow(nextNodes, nextEdges, draft))
    },
    [draft, readOnly, updateDraft],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly || !connection.source || !connection.target) return
      setEdges((eds) => {
        const exists = eds.some(
          (e) =>
            e.source === connection.source
            && e.target === connection.target
            && e.sourceHandle === connection.sourceHandle
            && e.targetHandle === connection.targetHandle,
        )
        if (exists) return eds
        const newEdge: Edge = {
          id: `edge-${connection.source}-${connection.sourceHandle ?? 'out'}-${connection.target}-${connection.targetHandle ?? 'in'}`,
          type: FLOW_EDGE_TYPE,
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
        }
        newEdge.data = { tooltip: edgeTooltipText(newEdge, nodes) }
        const next = [...eds, newEdge]
        persistGraph(nodes, next)
        return next
      })
    },
    [nodes, persistGraph, readOnly, setEdges],
  )

  const onNodesDelete = useCallback(
    (deleted: Node<CatalogFlowNodeData>[]) => {
      if (readOnly) return
      const deletedIds = new Set(deleted.map((n) => n.id))
      setNodes((nds) => {
        const remaining = nds.filter((n) => !deletedIds.has(n.id))
        setEdges((eds) => {
          const nextEdges = eds.filter((e) => !deletedIds.has(e.source) && !deletedIds.has(e.target))
          persistGraph(remaining, nextEdges)
          return nextEdges
        })
        return remaining
      })
    },
    [persistGraph, readOnly, setEdges, setNodes],
  )

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      if (readOnly) return
      const deletedIds = new Set(deleted.map((e) => e.id))
      setEdges((eds) => {
        const next = eds.filter((e) => !deletedIds.has(e.id))
        persistGraph(nodes, next)
        return next
      })
    },
    [nodes, persistGraph, readOnly, setEdges],
  )

  const onNodeDragStop = useCallback(() => {
    persistGraph(nodes, edges)
  }, [edges, nodes, persistGraph])

  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: Node<CatalogFlowNodeData>[] }) => {
      if (syncingRef.current) return
      const nextId = selected[0]?.id ?? null
      if (nextId === workflowConfigurationStore.getState().selectedCanvasNodeId) return
      setSelectedCanvasNodeId(nextId)
    },
    [setSelectedCanvasNodeId],
  )

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  const openNodeProperties = useCallback(
    (nodeId: string) => {
      setSelectedCanvasNodeId(nodeId)
      const q = parseQuery(location.search)
      const params = parsedToPanelParams(q)
      navigate(`${location.pathname}?${buildQuery({ ...params, props: 1 })}`, { replace: true })
    },
    [location.pathname, location.search, navigate, setSelectedCanvasNodeId],
  )

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node<CatalogFlowNodeData>) => {
      event.preventDefault()
      setContextMenu({ x: event.clientX, y: event.clientY, target: { kind: 'node', nodeId: node.id } })
    },
    [],
  )

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault()
      setContextMenu({ x: event.clientX, y: event.clientY, target: { kind: 'edge', edgeId: edge.id } })
    },
    [],
  )

  const deleteNodeById = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId)
      if (node) onNodesDelete([node])
    },
    [nodes, onNodesDelete],
  )

  const deleteEdgeById = useCallback(
    (edgeId: string) => {
      const edge = edges.find((e) => e.id === edgeId)
      if (edge) onEdgesDelete([edge])
    },
    [edges, onEdgesDelete],
  )

  const onPaneClick = useCallback(() => {
    closeContextMenu()
  }, [closeContextMenu])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      if (readOnly || !draft) return

      const payload = readCatalogDrag(event.dataTransfer)
      if (!payload || payload.kind !== 'NODE') return

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      const existingIds = (draft.nodes ?? []).map((n) => n.id)
      const catalogItem = catalog?.nodes?.find((n) => n.id === payload.catalogId)
      if (!catalogItem) return

      const workflowNode = createWorkflowNodeFromCatalog(
        catalogItem,
        position,
        existingIds,
        catalog,
      )
      const workflowType = catalogIdToWorkflowType(catalogItem.id)

      const flowNode: Node<CatalogFlowNodeData> = {
        id: workflowNode.id,
        type: FLOW_NODE_TYPE,
        position,
        data: {
          label: resolveNodeDisplayLabel(workflowNode, catalog),
          emoji: catalogItem.emoji ?? payload.emoji,
          workflowType,
          catalogId: catalogItem.id,
        },
      }

      setNodes((nds) => {
        const next = [...nds, flowNode]
        const updatedWorkflow = flowToWorkflow(next, edges, {
          ...draft,
          nodes: [...(draft.nodes ?? []), workflowNode],
        })
        updateDraft(updatedWorkflow)
        return next
      })
    },
    [catalog, draft, edges, readOnly, screenToFlowPosition, setNodes, updateDraft],
  )

  if (!draft) {
    return (
      <div className="workflow-canvas">
        <CanvasToolbar readOnly={readOnly} />
        <div className="workflow-canvas-empty">
          <p>Select a workflow from the menu above, or import one under <strong>Agents</strong>.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="workflow-canvas">
      <CanvasToolbar readOnly={readOnly} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={onConnect}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onNodeDragStop={onNodeDragStop}
        onSelectionChange={onSelectionChange}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} color="#3f3f46" />
        <Controls showInteractive={!readOnly} />
        <MiniMap
          nodeColor="#52525b"
          maskColor="rgba(9, 9, 11, 0.75)"
          className="workflow-canvas-minimap"
        />
      </ReactFlow>
      {contextMenu ? (
        <CanvasContextMenu
          menu={contextMenu}
          readOnly={readOnly}
          onClose={closeContextMenu}
          onOpenProperties={openNodeProperties}
          onDeleteNode={deleteNodeById}
          onDeleteEdge={deleteEdgeById}
        />
      ) : null}
    </div>
  )
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
