import { useState, useEffect, type CSSProperties } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { TopBar } from './components/TopBar'
import { OloLogo } from './components/OloLogo'
import { LeftPanel } from './components/LeftPanel'
import { BuilderSidePanel } from './components/builder/BuilderSidePanel'
import { MainContent } from './components/MainContent'
import { PropertiesPanel } from './components/PropertiesPanel'
import { PanelResizeHandle } from './components/PanelResizeHandle'
import { TenantConfigForm } from './components/TenantConfigForm'
import { WorkflowConfigurationEditor } from './components/WorkflowConfigurationEditor'
import { WorkflowGlobalProperties } from './components/WorkflowGlobalProperties'
import { CanvasNodeProperties } from './components/canvas/CanvasNodeProperties'
import { isCanvasNodePropertiesTarget } from './components/canvas/CanvasNodeProperties'
import { getHealth } from './api/rest'
import type { Tenant } from './types/tenant'
import { useUIStore } from './store/ui'
import { tenantConfigStore } from './store/tenantConfig'
import { workflowConfigurationStore } from './store/workflowConfigurationStore'
import { graphLogStore } from './store/graphLogStore'
import { catalogStore } from './store/catalogStore'
import { presetParametersForWorkflow } from './lib/catalogLookup'
import { downloadWorkflowJson, readWorkflowFile, renameWorkflowPath } from './lib/workflowConfiguration'
import type { AgentsFileActions } from './components/agents/AgentsContextMenu'
import {
  parsePath,
  buildPath,
  buildPathWithQuery,
  buildQuery,
  parseQuery,
  parsedToPanelParams,
  DEFAULT_PATH,
} from './routes'
import { getSubOption } from './types/layout'
import type { SectionId } from './types/layout'
import { isFeatureEnabled } from './config/features'
import type { FeatureId } from './config/features'
import { logEvent } from './lib/observability'
import { getLastTenantId } from './lib/lastTenant'

const BACKEND_POLL_INTERVAL_MS = 2000

function App() {
  const [backendReady, setBackendReady] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const {
    leftPanelExpanded,
    toolsPanelExpanded,
    propertiesPanelExpanded,
    panelWidthLeft,
    panelWidthTools,
    panelWidthProperties,
    sectionId,
    subId,
    runId,
    setRunId,
    setTenantId,
    setSectionSub,
  } = useUIStore()

  const isTenantAdmin = sectionId === 'administration' && subId === 'tenants'
  const isWorkflowAgents = sectionId === 'workflows' && subId === 'agents'
  const isWorkflowBuilder = sectionId === 'workflows' && subId === 'builder'
  const isWorkflowLog = sectionId === 'workflows' && subId === 'log'
  const showComponentsPanel = isWorkflowBuilder
  const needsCatalog = isWorkflowBuilder || isWorkflowAgents || isWorkflowLog
  const needsWorkflows = sectionId === 'workflows'

  useEffect(() => {
    const pathname = location.pathname || '/'
    if (pathname === '/' || pathname === '') {
      navigate(DEFAULT_PATH, { replace: true })
      return
    }
    const parsed = parsePath(pathname)
    if (!parsed) {
      navigate(DEFAULT_PATH, { replace: true })
      return
    }
    if (!isFeatureEnabled(parsed.sectionId as FeatureId)) {
      navigate(DEFAULT_PATH, { replace: true })
      return
    }
    setSectionSub(parsed.sectionId, parsed.subId)
    setRunId(parsed.runId ?? '')
    const q = parseQuery(location.search)
    setTenantId(q.tenantId)
    useUIStore.getState().setPanelStateFromUrl(q.menuExpanded, q.toolsExpanded, q.propsExpanded)
    if (parsed.sectionId !== 'administration' || parsed.subId !== 'tenants') {
      tenantConfigStore.getState().clearSelection()
    }
    if (parsed.sectionId !== 'workflows') {
      workflowConfigurationStore.getState().clearSelection()
      graphLogStore.getState().clearSelection()
    } else if (parsed.subId === 'log') {
      workflowConfigurationStore.getState().clearSelection()
    } else {
      graphLogStore.getState().clearSelection()
    }
  }, [location.pathname, location.search, location.key, navigate, setSectionSub, setRunId, setTenantId])

  useEffect(() => {
    let cancelled = false
    const check = () => {
      getHealth()
        .then(() => { if (!cancelled) setBackendReady(true) })
        .catch(() => {})
    }
    check()
    const id = setInterval(check, BACKEND_POLL_INTERVAL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  useEffect(() => {
    tenantConfigStore.getState().loadTenants()
  }, [])

  useEffect(() => {
    if (isTenantAdmin) {
      tenantConfigStore.getState().loadTenants()
    }
  }, [isTenantAdmin])

  useEffect(() => {
    if (needsCatalog && !catalogStore.getState().catalog && !catalogStore.getState().loading) {
      catalogStore.getState().loadCatalog()
    }
  }, [needsCatalog])

  useEffect(() => {
    if (needsWorkflows) {
      workflowConfigurationStore.getState().loadWorkflows()
    }
    if (isWorkflowLog) {
      graphLogStore.getState().loadLogs()
    }
    if (needsWorkflows && !catalogStore.getState().catalog && !catalogStore.getState().loading) {
      catalogStore.getState().loadCatalog()
    }
  }, [needsWorkflows, isWorkflowLog])

  useEffect(() => {
    if (sectionId != null) {
      logEvent('navigation', { section: sectionId, sub: subId, runId: runId || undefined })
    }
  }, [sectionId, subId, runId])

  const tenants = tenantConfigStore((s) => s.tenants)
  useEffect(() => {
    const q = parseQuery(location.search)
    if (q.tenantId !== '') return
    if (tenants.length === 0) return
    const last = getLastTenantId()
    const defaultId = tenants.some((t) => t.id === last) ? last : tenants[0].id
    const params = parsedToPanelParams(q)
    navigate(location.pathname + '?' + buildQuery({ ...params, tenantId: defaultId }), {
      replace: true,
    })
  }, [location.pathname, location.search, tenants, navigate])

  const q = parseQuery(location.search)

  const updatePanelQuery = (updates: { menu?: 0 | 1; tools?: 0 | 1; props?: 0 | 1 }) => {
    const params = parsedToPanelParams(q)
    const next = { ...params, ...updates }
    navigate(location.pathname + '?' + buildQuery(next), { replace: true })
  }

  const handleSectionSubSelect = (sid: SectionId, sub: string) => {
    const params = parsedToPanelParams(q)
    const subOption = getSubOption(sid, sub)
    const openProps = (sid === 'administration' && sub === 'tenants') || sub === 'agents'
    navigate(
      buildPathWithQuery(buildPath(sid, sub), {
        ...params,
        props: openProps ? params.props : 0,
        tools: subOption?.componentsPanel ? 1 : 0,
      }),
    )
  }

  const handleSelectTenant = (t: Tenant) => {
    tenantConfigStore.getState().selectTenant(t)
    updatePanelQuery({ props: 1 })
  }

  const handleAddNewTenant = () => {
    tenantConfigStore.getState().startAddNew()
    updatePanelQuery({ props: 1 })
  }

  const handleSelectWorkflow = (fileName: string) => {
    workflowConfigurationStore.getState().selectWorkflow(fileName)
    updatePanelQuery({ props: 1 })
  }

  const handleImportWorkflowFile = async (file: File) => {
    const document = await readWorkflowFile(file)
    await workflowConfigurationStore.getState().importWorkflow(document, file.name)
    updatePanelQuery({ props: 1 })
  }

  const handleOpenWorkflow = (fileName: string) => {
    void workflowConfigurationStore.getState().selectWorkflow(fileName)
    updatePanelQuery({ props: 1 })
  }

  const handleEditWorkflowInBuilder = async (fileName: string) => {
    await workflowConfigurationStore.getState().selectWorkflow(fileName)
    handleSectionSubSelect('workflows', 'builder')
  }

  const handleDebugWorkflow = async (fileName: string) => {
    await workflowConfigurationStore.getState().selectWorkflow(fileName)
    handleSectionSubSelect('workflows', 'debugger')
  }

  const handleCopyWorkflowPath = (path: string) => {
    void navigator.clipboard.writeText(path)
  }

  const handleDuplicateWorkflow = async (fileName: string) => {
    await workflowConfigurationStore.getState().copyWorkflow(fileName)
    updatePanelQuery({ props: 1 })
  }

  const handleRenameWorkflow = async (fileName: string) => {
    const base = fileName.replace(/\\/g, '/').split('/').pop() ?? fileName
    const next = window.prompt('Rename workflow file', base)
    if (!next?.trim()) return
    try {
      const newPath = renameWorkflowPath(fileName, next)
      await workflowConfigurationStore.getState().renameWorkflow(fileName, newPath)
      updatePanelQuery({ props: 1 })
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Rename failed')
    }
  }

  const handleDeleteWorkflowFile = async (fileName: string) => {
    if (!window.confirm(`Delete ${fileName}?`)) return
    await workflowConfigurationStore.getState().deleteWorkflow(fileName)
  }

  const handleExportWorkflowFile = async (fileName: string) => {
    const doc = await workflowConfigurationStore.getState().exportWorkflow(fileName)
    downloadWorkflowJson(doc, fileName)
  }

  const agentsFileActions: AgentsFileActions = {
    onOpen: handleOpenWorkflow,
    onEditInBuilder: (fileName) => { void handleEditWorkflowInBuilder(fileName) },
    onDebug: (fileName) => { void handleDebugWorkflow(fileName) },
    onCopy: handleDuplicateWorkflow,
    onRename: handleRenameWorkflow,
    onDelete: handleDeleteWorkflowFile,
    onExport: handleExportWorkflowFile,
    onCopyPath: handleCopyWorkflowPath,
  }

  const handleToggleLeftPanel = () => updatePanelQuery({ menu: q.menuExpanded ? 0 : 1 })
  const handleToggleComponentsPanel = () => updatePanelQuery({ tools: q.toolsExpanded ? 0 : 1 })
  const handleTogglePropertiesPanel = () => updatePanelQuery({ props: q.propsExpanded ? 0 : 1 })

  const tenantsLoading = tenantConfigStore((s) => s.tenantsLoading)
  const configSelectedTenant = tenantConfigStore((s) => s.configSelectedTenant)
  const configIsAddingNew = tenantConfigStore((s) => s.configIsAddingNew)

  const workflows = workflowConfigurationStore((s) => s.workflows)
  const workflowsLoading = workflowConfigurationStore((s) => s.loading)
  const workflowsError = workflowConfigurationStore((s) => s.error)
  const configurationRoot = workflowConfigurationStore((s) => s.configurationRoot)
  const selectedWorkflowFile = workflowConfigurationStore((s) => s.selectedFileName)
  const workflowDraft = workflowConfigurationStore((s) => s.draft)
  const workflowDirty = workflowConfigurationStore((s) => s.dirty)
  const selectedCanvasNodeId = workflowConfigurationStore((s) => s.selectedCanvasNodeId)
  const selectedCanvasNode =
    workflowDraft?.nodes?.find((n) => n.id === selectedCanvasNodeId) ?? null
  const showCanvasNodeProperties =
    isWorkflowBuilder
    && selectedCanvasNode != null
    && isCanvasNodePropertiesTarget(selectedCanvasNode)
  const showWorkflowGlobalProperties =
    isWorkflowBuilder && workflowDraft != null && selectedCanvasNode == null
  const catalog = catalogStore((s) => s.catalog)
  const workflowCatalogParameters = workflowDraft
    ? presetParametersForWorkflow(catalog, workflowDraft)
    : []

  const showWorkflowProperties = (isWorkflowAgents || isWorkflowBuilder) && !isWorkflowLog

  if (!backendReady) {
    return (
      <div className="app app-waiting-backend" style={{ cursor: 'wait' }}>
        <div className="app-backend-loading">
          <OloLogo variant="full" size={32} className="app-backend-loading-logo" />
          <div className="app-backend-loading-spinner" />
          <p className="app-backend-loading-text">Waiting for backend…</p>
          <p className="app-backend-loading-hint">Ensure olo-be is running on port 8082.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <TopBar />
      <div
        className="app-body"
        style={
          {
            '--panel-width-left': `${panelWidthLeft}px`,
            '--panel-width-tools': `${panelWidthTools}px`,
            '--panel-width-properties': `${panelWidthProperties}px`,
          } as CSSProperties
        }
      >
        <LeftPanel
          expanded={leftPanelExpanded}
          onToggle={handleToggleLeftPanel}
          sectionId={sectionId}
          subId={subId}
          onSectionSubSelect={handleSectionSubSelect}
        />
        <PanelResizeHandle
          panel="left"
          visible={leftPanelExpanded}
          onResize={(delta) => useUIStore.getState().setPanelWidthLeft(useUIStore.getState().panelWidthLeft + delta)}
        />
        {showComponentsPanel && (
          <>
            <BuilderSidePanel
              expanded={toolsPanelExpanded}
              onToggle={handleToggleComponentsPanel}
            />
            <PanelResizeHandle
              panel="components"
              visible={toolsPanelExpanded}
              onResize={(delta) => useUIStore.getState().setPanelWidthTools(useUIStore.getState().panelWidthTools + delta)}
            />
          </>
        )}
        <MainContent
          sectionId={sectionId}
          subId={subId}
          tenants={tenants}
          tenantsLoading={tenantsLoading}
          configSelectedTenant={configSelectedTenant}
          onSelectTenant={handleSelectTenant}
          onAddNewTenant={handleAddNewTenant}
          onDeleteTenant={(id) => tenantConfigStore.getState().deleteTenant(id)}
          workflows={workflows}
          workflowsLoading={workflowsLoading}
          workflowsError={workflowsError}
          configurationRoot={configurationRoot}
          selectedWorkflowFile={selectedWorkflowFile}
          onSelectWorkflow={handleSelectWorkflow}
          onImportWorkflowFile={handleImportWorkflowFile}
          onReloadWorkflows={() => workflowConfigurationStore.getState().reloadFromDisk()}
          agentsFileActions={agentsFileActions}
          agentsCanvasActions={{
            onReload: () => workflowConfigurationStore.getState().reloadFromDisk(),
            onImport: () => {},
          }}
          workflowExportDisabled={!workflowDraft}
        />
        <PanelResizeHandle
          panel="properties"
          visible={propertiesPanelExpanded}
          onResize={(delta) => useUIStore.getState().setPanelWidthProperties(useUIStore.getState().panelWidthProperties + delta)}
        />
        <PropertiesPanel
          expanded={propertiesPanelExpanded}
          onToggle={handleTogglePropertiesPanel}
        >
          {isTenantAdmin ? (
            <TenantConfigForm
              tenant={configSelectedTenant}
              isAddingNew={configIsAddingNew}
              onSave={(tenant) => tenantConfigStore.getState().saveTenant(tenant)}
            />
          ) : showCanvasNodeProperties && selectedCanvasNode ? (
            <CanvasNodeProperties
              workflow={workflowDraft!}
              node={selectedCanvasNode}
              dirty={workflowDirty}
              onChange={(doc) => workflowConfigurationStore.getState().updateDraft(doc)}
            />
          ) : showWorkflowGlobalProperties ? (
            <div className="tenant-config-form-inner workflow-config-editor">
              <h2 className="tenant-config-form-title">{workflowDraft.label ?? workflowDraft.id}</h2>
              <WorkflowGlobalProperties
                workflow={workflowDraft}
                onChange={(doc) => workflowConfigurationStore.getState().updateDraft(doc)}
              />
              <div className="tenant-config-form-actions tenant-config-form-actions-bottom">
                <button
                  type="button"
                  className="tenant-config-btn danger"
                  onClick={() => workflowConfigurationStore.getState().deleteSelected()}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="tenant-config-btn primary"
                  onClick={() => workflowConfigurationStore.getState().saveDraft()}
                  disabled={!workflowDirty}
                >
                  {workflowDirty ? 'Save changes' : 'Saved'}
                </button>
              </div>
            </div>
          ) : showWorkflowProperties ? (
            <WorkflowConfigurationEditor
              workflow={workflowDraft}
              catalogParameters={workflowCatalogParameters}
              dirty={workflowDirty}
              onChange={(doc) => workflowConfigurationStore.getState().updateDraft(doc)}
              onSave={() => workflowConfigurationStore.getState().saveDraft()}
              onDelete={() => workflowConfigurationStore.getState().deleteSelected()}
            />
          ) : undefined}
        </PropertiesPanel>
      </div>
    </div>
  )
}

export default App
