import { useState, useEffect, type CSSProperties } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { TopBar } from './components/TopBar'
import { OloLogo } from './components/OloLogo'
import { LeftPanel } from './components/LeftPanel'
import { ToolsPanel } from './components/ToolsPanel'
import { MainContent } from './components/MainContent'
import { PropertiesPanel } from './components/PropertiesPanel'
import { PanelResizeHandle } from './components/PanelResizeHandle'
import { TenantConfigForm } from './components/TenantConfigForm'
import { getHealth } from './api/rest'
import type { Tenant } from './types/tenant'
import { useUIStore } from './store/ui'
import { tenantConfigStore } from './store/tenantConfig'
import {
  parsePath,
  buildPath,
  buildPathWithQuery,
  buildQuery,
  parseQuery,
  parsedToPanelParams,
  DEFAULT_PATH,
  getRunLevelDefaultSubId,
} from './routes'
import type { SectionId } from './types/layout'
import { isFeatureEnabled } from './config/features'
import type { FeatureId } from './config/features'
import { logEvent } from './lib/observability'
import { getLastTenantId, setLastTenantId } from './lib/lastTenant'

const BACKEND_POLL_INTERVAL_MS = 2000

function App() {
  const [backendReady, setBackendReady] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const [, setSearchParams] = useSearchParams()

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
    tenantId,
    setRunId,
    setTenantId,
    setSectionSub,
  } = useUIStore()

  const runSelected = !!runId && (sectionId === 'runtime' || sectionId === 'ledger')
  const isTenantConfig = sectionId === 'configuration' && subId === 'tenant-configuration'

  // URL → store sync: path, tenant, and panel query (enables deep links, back/forward, bookmarking)
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
    // Disabled section deep link: redirect to safe default
    if (!isFeatureEnabled(parsed.sectionId as FeatureId)) {
      navigate(DEFAULT_PATH, { replace: true })
      return
    }
    setSectionSub(parsed.sectionId, parsed.subId)
    setRunId(parsed.runId ?? '')
    const q = parseQuery(location.search)
    setTenantId(q.tenantId)
    useUIStore.getState().setPanelStateFromUrl(q.menuExpanded, q.toolsExpanded, q.propsExpanded)
    if (parsed.sectionId !== 'configuration' || parsed.subId !== 'tenant-configuration') {
      tenantConfigStore.getState().clearSelection()
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
    if (isTenantConfig) {
      tenantConfigStore.getState().loadTenants()
    }
  }, [sectionId, subId])

  useEffect(() => {
    if (sectionId != null) {
      logEvent('navigation', { section: sectionId, sub: subId, runId: runId || undefined })
    }
  }, [sectionId, subId, runId])

  // Default tenant when URL has none: use last from session (localStorage) or first in list
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
    navigate(buildPathWithQuery(buildPath(sid, sub), { ...params, props: 0 }))
  }

  const handleTenantChange = (id: string) => {
    setLastTenantId(id)
    const params = parsedToPanelParams(q)
    setSearchParams(
      new URLSearchParams(buildQuery({ ...params, tenantId: id })),
      { replace: true }
    )
  }

  const handleRunIdChange = (id: string) => {
    if (!sectionId) return
    const params = parsedToPanelParams(q)
    if (id) {
      const sub = runId ? subId : getRunLevelDefaultSubId(sectionId)
      navigate(buildPathWithQuery(buildPath(sectionId, sub, id), params))
    } else {
      const listSub = sectionId === 'runtime' ? 'live-runs' : 'runs'
      navigate(buildPathWithQuery(buildPath(sectionId, listSub), params))
    }
  }

  const handleSelectTenant = (t: Tenant) => {
    tenantConfigStore.getState().selectTenant(t)
    updatePanelQuery({ props: 1 })
  }

  const handleAddNewTenant = () => {
    tenantConfigStore.getState().startAddNew()
    updatePanelQuery({ props: 1 })
  }

  const handleToggleLeftPanel = () => updatePanelQuery({ menu: q.menuExpanded ? 0 : 1 })
  const handleToggleToolsPanel = () => updatePanelQuery({ tools: q.toolsExpanded ? 0 : 1 })
  const handleTogglePropertiesPanel = () => updatePanelQuery({ props: q.propsExpanded ? 0 : 1 })

  const tenantsLoading = tenantConfigStore((s) => s.tenantsLoading)
  const configSelectedTenant = tenantConfigStore((s) => s.configSelectedTenant)
  const configIsAddingNew = tenantConfigStore((s) => s.configIsAddingNew)

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
          tenantId={tenantId}
          onTenantChange={handleTenantChange}
          tenants={tenants}
          sectionId={sectionId}
          subId={subId}
          runSelected={runSelected}
          onSectionSubSelect={handleSectionSubSelect}
        />
        <PanelResizeHandle
          panel="left"
          visible={leftPanelExpanded}
          onResize={(delta) => useUIStore.getState().setPanelWidthLeft(useUIStore.getState().panelWidthLeft + delta)}
        />
        {!isTenantConfig && (
          <>
            <ToolsPanel
              expanded={toolsPanelExpanded}
              onToggle={handleToggleToolsPanel}
              sectionId={sectionId}
              subId={subId}
              runSelected={runSelected}
              storeContext={
                sectionId === 'configuration'
                  ? { tenants, configSelectedTenant, tenantsLoading }
                  : sectionId === 'runtime' || sectionId === 'ledger'
                    ? { runId }
                    : {}
              }
            />
            <PanelResizeHandle
              panel="tools"
              visible={toolsPanelExpanded}
              onResize={(delta) => useUIStore.getState().setPanelWidthTools(useUIStore.getState().panelWidthTools + delta)}
            />
          </>
        )}
        <MainContent
          sectionId={sectionId}
          subId={subId}
          runSelected={runSelected}
          runId={runId}
          onRunIdChange={handleRunIdChange}
          tenants={tenants}
          tenantsLoading={tenantsLoading}
          configSelectedTenant={configSelectedTenant}
          onSelectTenant={handleSelectTenant}
          onAddNewTenant={handleAddNewTenant}
          onDeleteTenant={(id) => tenantConfigStore.getState().deleteTenant(id)}
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
          {isTenantConfig ? (
            <TenantConfigForm
              tenant={configSelectedTenant}
              isAddingNew={configIsAddingNew}
              onSave={(tenant) => tenantConfigStore.getState().saveTenant(tenant)}
            />
          ) : undefined}
        </PropertiesPanel>
      </div>
    </div>
  )
}

export default App
