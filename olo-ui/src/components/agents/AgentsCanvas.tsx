import { useCallback, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import {
  CONFIG_FILE_NODE,
  CONFIG_FOLDER_NODE,
  workflowsToDirectoryGraph,
  type ConfigFileNodeData,
} from '../../lib/configurationTree'
import {
  AgentsContextMenu,
  agentsContextTargetFromNode,
  type AgentsCanvasActions,
  type AgentsContextMenuState,
  type AgentsFileActions,
} from './AgentsContextMenu'
import { ConfigurationFileNode } from './ConfigurationFileNode'
import { ConfigurationFolderNode } from './ConfigurationFolderNode'
import type { WorkflowSummary } from '../../types/workflow'

const nodeTypes = {
  [CONFIG_FOLDER_NODE]: ConfigurationFolderNode,
  [CONFIG_FILE_NODE]: ConfigurationFileNode,
}

export interface AgentsCanvasProps {
  workflows: WorkflowSummary[]
  configurationRoot: string
  loading: boolean
  error: string | null
  selectedFileName: string | null
  fileActions: AgentsFileActions
  canvasActions: AgentsCanvasActions
  onImportFile: (file: File) => Promise<void>
  exportDisabled: boolean
}

function AgentsCanvasInner({
  workflows,
  configurationRoot,
  loading,
  error,
  selectedFileName,
  fileActions,
  canvasActions,
  onImportFile,
  exportDisabled,
}: AgentsCanvasProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [contextMenu, setContextMenu] = useState<AgentsContextMenuState | null>(null)

  const graph = useMemo(
    () => workflowsToDirectoryGraph(workflows, configurationRoot),
    [workflows, configurationRoot],
  )

  const nodes = useMemo(
    () =>
      graph.nodes.map((node) => ({
        ...node,
        selected: node.type === CONFIG_FILE_NODE
          && (node.data as unknown as ConfigFileNodeData).fileName === selectedFileName,
      })),
    [graph.nodes, selectedFileName],
  )

  const openImportDialog = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    await onImportFile(file)
  }

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type !== CONFIG_FILE_NODE) return
      const data = node.data as unknown as ConfigFileNodeData
      fileActions.onOpen(data.fileName)
    },
    [fileActions],
  )

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault()
      const target = agentsContextTargetFromNode(node.type, node.data)
      if (!target) return
      if (target.kind === 'file') {
        fileActions.onOpen(target.fileName)
      }
      setContextMenu({ x: event.clientX, y: event.clientY, target })
    },
    [fileActions],
  )

  const handlePaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY, target: { kind: 'canvas' } })
  }, [])

  const menuCanvasActions = useMemo(
    (): AgentsCanvasActions => ({
      onReload: canvasActions.onReload,
      onImport: openImportDialog,
    }),
    [canvasActions, openImportDialog],
  )

  return (
    <div className="agents-canvas">
      <div className="agents-canvas-toolbar">
        <div className="agents-canvas-toolbar-left">
          <span className="agents-canvas-title">Agent presets</span>
          {configurationRoot ? (
            <span className="agents-canvas-root" title={configurationRoot}>
              {configurationRoot}
            </span>
          ) : null}
        </div>
        <div className="agents-canvas-actions">
          <button
            type="button"
            className="tenant-config-btn small"
            onClick={() => void menuCanvasActions.onReload()}
            disabled={loading}
            title="Reload all files from configuration folders"
          >
            Reload
          </button>
          <button
            type="button"
            className="tenant-config-btn small"
            onClick={openImportDialog}
            title="Import JSON from disk"
          >
            Import
          </button>
          <button
            type="button"
            className="tenant-config-btn small"
            onClick={() => {
              if (selectedFileName) void fileActions.onExport(selectedFileName)
            }}
            disabled={exportDisabled && !selectedFileName}
            title="Export selected workflow JSON"
          >
            Export
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="workflow-config-file-input"
            onChange={handleFileChange}
          />
        </div>
      </div>

      <p className="agents-canvas-hint">
        Mount or sync a git-controlled folder as your configuration directory and manage agent
        presets with your usual git workflow until integrated versioning rolls out in the UI
        (SCHEDULED-V6).
      </p>

      {error ? <p className="agents-canvas-error">{error}</p> : null}

      <div className="agents-canvas-flow">
        {loading && workflows.length === 0 ? (
          <p className="agents-canvas-message">Loading directory…</p>
        ) : workflows.length === 0 ? (
          <p className="agents-canvas-message">No workflows. Import a JSON preset to begin.</p>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={graph.edges}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            onNodeContextMenu={handleNodeContextMenu}
            onPaneContextMenu={handlePaneContextMenu}
            onPaneClick={closeContextMenu}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={(node) => (node.type === CONFIG_FILE_NODE ? '#3b82f6' : '#52525b')}
              maskColor="rgba(9, 9, 11, 0.75)"
            />
          </ReactFlow>
        )}
      </div>

      {contextMenu ? (
        <AgentsContextMenu
          menu={contextMenu}
          fileActions={fileActions}
          canvasActions={menuCanvasActions}
          onClose={closeContextMenu}
        />
      ) : null}
    </div>
  )
}

export function AgentsCanvas(props: AgentsCanvasProps) {
  return (
    <ReactFlowProvider>
      <AgentsCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
