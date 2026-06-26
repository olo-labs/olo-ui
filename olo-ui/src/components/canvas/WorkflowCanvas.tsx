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
  MarkerType,
  type Connection,
  type Edge,
  type Node,
  type OnConnectStartParams,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { catalogStore } from '../../store/catalogStore'
import { workflowConfigurationStore } from '../../store/workflowConfigurationStore'
import { readCatalogDrag } from '../../lib/canvasDrag'
import {
  applyCatalogFlowEdgePresentation,
  defaultEdgeStroke,
  resolveConnectionLineColor,
} from '../../lib/canvasLabels'
import { arePortsCompatible } from '../../lib/portConnection'
import { resolveNodePort } from '../../lib/portResolve'
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
import {
  mergeWorkflowCanvasView,
  readWorkflowCanvasView,
  roundCanvasViewport,
  type WorkflowCanvasSize,
} from '../../lib/workflowCanvasView'
import { workflowDraftSnapshot } from '../../lib/workflowDraftSnapshot'
import { CatalogFlowEdge } from './CatalogFlowEdge'
import { CatalogFlowNode } from './CatalogFlowNode'
import { CanvasContextMenu, type CanvasContextMenuState } from './CanvasContextMenu'
import { CanvasToolbar } from './CanvasToolbar'
import { CanvasViewportController } from './CanvasViewportController'
import {
  isWorkflowTemplateCatalogId,
  workflowPaletteNodes,
  workflowTypeFromTemplateCatalogId,
} from '../../lib/workflowNodeTemplates'
import { resolveNodePresentation } from '../../lib/nodePresentation'
import { resolveCanvasTheme } from '../../lib/workflowDesigner'
import { buildQuery, parseQuery, parsedToPanelParams } from '../../routes'

const nodeTypes = { [FLOW_NODE_TYPE]: CatalogFlowNode }
const edgeTypes = { [FLOW_EDGE_TYPE]: CatalogFlowEdge }
const defaultFlowEdgeOptions = {
  type: FLOW_EDGE_TYPE,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
  },
} as const

export interface WorkflowCanvasProps {
  readOnly?: boolean
}

function WorkflowCanvasInner({ readOnly = false }: WorkflowCanvasProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const draft = workflowConfigurationStore((s) => s.draft)
  const selectedFileName = workflowConfigurationStore((s) => s.selectedFileName)
  const catalog = catalogStore((s) => s.catalog)
  const updateDraft = workflowConfigurationStore((s) => s.updateDraft)
  const setSelectedCanvasNodeId = workflowConfigurationStore((s) => s.setSelectedCanvasNodeId)
  const [contextMenu, setContextMenu] = useState<CanvasContextMenuState | null>(null)
  const [connectionLineColor, setConnectionLineColor] = useState(() => defaultEdgeStroke(draft))
  const canvasTheme = useMemo(() => resolveCanvasTheme(draft), [draft])

  const initial = useMemo(
    () => (draft ? workflowToFlow(draft, catalog, { readOnly }) : { nodes: [], edges: [] }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when workflow file changes
    [draft?.id, workflowConfigurationStore.getState().selectedFileName, readOnly],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CatalogFlowNodeData>>(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)
  const { screenToFlowPosition, getViewport } = useReactFlow()
  const syncingRef = useRef(false)
  const canvasHydratingRef = useRef(true)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const canvasSizeRef = useRef<WorkflowCanvasSize | null>(null)
  const canvasViewPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const graphSyncKey = useMemo(() => {
    if (!draft) return ''
    return JSON.stringify({ id: draft.id, nodes: draft.nodes, edges: draft.edges })
  }, [draft])

  const savedCanvasView = useMemo(
    () => (draft ? readWorkflowCanvasView(draft) : null),
    [draft?.id, draft?.metadata],
  )

  const workflowCanvasKey = `${draft?.id ?? ''}:${selectedFileName ?? ''}`

  useEffect(() => {
    canvasHydratingRef.current = true
    canvasSizeRef.current = savedCanvasView?.size ?? null
  }, [savedCanvasView?.size, workflowCanvasKey])

  const finishCanvasHydration = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        canvasHydratingRef.current = false
      })
    })
  }, [])

  useEffect(() => {
    if (!draft) {
      setNodes([])
      setEdges([])
      return
    }
    syncingRef.current = true
    const next = workflowToFlow(draft, catalog, { readOnly })
    setNodes(next.nodes)
    setEdges(next.edges)
    queueMicrotask(() => {
      syncingRef.current = false
    })
  }, [catalog, graphSyncKey, readOnly, setEdges, setNodes])

  const persistCanvasView = useCallback(() => {
    if (!draft || readOnly || syncingRef.current || canvasHydratingRef.current) return
    const viewport = roundCanvasViewport(getViewport())
    const size = canvasSizeRef.current
    const merged = mergeWorkflowCanvasView(draft, {
      viewport,
      ...(size ? { size } : {}),
    })
    if (workflowConfigurationStore.getState().savedSnapshot === workflowDraftSnapshot(merged)) {
      return
    }
    updateDraft(merged)
  }, [draft, getViewport, readOnly, updateDraft])

  const schedulePersistCanvasView = useCallback(() => {
    if (canvasViewPersistTimerRef.current) clearTimeout(canvasViewPersistTimerRef.current)
    canvasViewPersistTimerRef.current = setTimeout(() => {
      persistCanvasView()
    }, 250)
  }, [persistCanvasView])

  useEffect(() => {
    const element = canvasContainerRef.current
    if (!element || readOnly) return undefined

    const updateSize = () => {
      const width = Math.round(element.clientWidth)
      const height = Math.round(element.clientHeight)
      if (width <= 0 || height <= 0) return
      const previous = canvasSizeRef.current
      if (previous?.width === width && previous?.height === height) return
      canvasSizeRef.current = { width, height }
      schedulePersistCanvasView()
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)
    return () => {
      observer.disconnect()
      if (canvasViewPersistTimerRef.current) clearTimeout(canvasViewPersistTimerRef.current)
    }
  }, [readOnly, schedulePersistCanvasView, workflowCanvasKey])

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
        const newEdge = applyCatalogFlowEdgePresentation(
          {
            id: `edge-${connection.source}-${connection.sourceHandle ?? 'out'}-${connection.target}-${connection.targetHandle ?? 'in'}`,
            type: FLOW_EDGE_TYPE,
            source: connection.source,
            target: connection.target,
            sourceHandle: connection.sourceHandle,
            targetHandle: connection.targetHandle,
          },
          nodes,
          catalog,
          draft,
        )
        const next = [...eds, newEdge]
        persistGraph(nodes, next)
        return next
      })
    },
    [catalog, draft, nodes, persistGraph, readOnly, setEdges],
  )

  const onConnectStart = useCallback(
    (_event: MouseEvent | TouchEvent, params: OnConnectStartParams) => {
      if (readOnly || params.handleType !== 'source') {
        setConnectionLineColor(defaultEdgeStroke(draft))
        return
      }
      setConnectionLineColor(
        resolveConnectionLineColor(params.nodeId, params.handleId, nodes, catalog, draft),
      )
    },
    [catalog, draft, nodes, readOnly],
  )

  const onConnectEnd = useCallback(() => {
    setConnectionLineColor(defaultEdgeStroke(draft))
  }, [draft])

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      if (readOnly || !connection.source || !connection.target) return false
      const sourceNode = nodes.find((node) => node.id === connection.source)
      const targetNode = nodes.find((node) => node.id === connection.target)
      if (!sourceNode || !targetNode) return false
      const outputPort = resolveNodePort(sourceNode, connection.sourceHandle, 'OUTPUT', catalog, draft)
      const inputPort = resolveNodePort(targetNode, connection.targetHandle, 'INPUT', catalog, draft)
      if (!outputPort || !inputPort) return true
      return arePortsCompatible(outputPort, inputPort)
    },
    [catalog, draft, nodes, readOnly],
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

  const onCanvasMoveEnd = useCallback(() => {
    schedulePersistCanvasView()
  }, [schedulePersistCanvasView])

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
      const paletteNodes = workflowPaletteNodes(draft)
      const catalogItem =
        catalog?.nodes?.find((n) => n.id === payload.catalogId)
        ?? paletteNodes.find((n) => n.id === payload.catalogId)
      if (!catalogItem) return

      const workflowNode = createWorkflowNodeFromCatalog(
        catalogItem,
        position,
        existingIds,
        catalog,
        draft,
      )
      const workflowType = isWorkflowTemplateCatalogId(catalogItem.id)
        ? workflowTypeFromTemplateCatalogId(catalogItem.id)
        : catalogIdToWorkflowType(catalogItem.id)
      const presentation = resolveNodePresentation(draft, workflowNode, catalog)

      const flowNode: Node<CatalogFlowNodeData> = {
        id: workflowNode.id,
        type: FLOW_NODE_TYPE,
        position,
        data: {
          label: resolveNodeDisplayLabel(workflowNode, catalog),
          emoji: presentation.emoji ?? catalogItem.emoji ?? payload.emoji,
          workflowType,
          catalogId: catalogItem.id,
          workflowPorts: workflowNode.ports,
          presentation,
          readOnly,
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
    <div className="workflow-canvas" ref={canvasContainerRef}>
      <CanvasToolbar readOnly={readOnly} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        defaultViewport={savedCanvasView?.viewport}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={onConnect}
        onConnectStart={readOnly ? undefined : onConnectStart}
        onConnectEnd={readOnly ? undefined : onConnectEnd}
        onMoveEnd={readOnly ? undefined : onCanvasMoveEnd}
        connectionLineStyle={{ stroke: connectionLineColor, strokeWidth: 1.5 }}
        defaultEdgeOptions={defaultFlowEdgeOptions}
        defaultMarkerColor={connectionLineColor}
        isValidConnection={readOnly ? undefined : isValidConnection}
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
        deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
      >
        <CanvasViewportController
          workflowKey={workflowCanvasKey}
          savedView={savedCanvasView}
          nodeCount={nodes.length}
          onViewApplied={readOnly ? undefined : finishCanvasHydration}
        />
        <Background gap={canvasTheme.gridGap} size={1} color={canvasTheme.backgroundColor} />
        <Controls showInteractive={!readOnly} />
        <MiniMap
          nodeColor={canvasTheme.minimapNodeColor}
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
