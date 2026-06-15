import type { StudioCatalog } from '../types/catalog'
import type { Tenant } from '../types/tenant'
import type { ModelProvider, WorkflowDocument, WorkflowSummary } from '../types/workflow'

export interface ModelProviderTestResult {
  ok: boolean
  message: string
  latencyMs?: number
  model?: string
}

/** Versioned API base. Add /v2 etc. when introducing breaking changes. */
const API_BASE = '/api/v1'

export type { Tenant } from '../types/tenant'

export interface HealthResponse {
  status: string
  service: string
}

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export interface WorkerRefreshResponse {
  key: string
  value: string
}

/** Signal olo-worker to reload configuration and Temporal task queues (via Redis). */
export async function signalWorkerRefresh(): Promise<WorkerRefreshResponse> {
  const res = await fetch(`${API_BASE}/worker/refresh`, { method: 'POST' })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(detail || `HTTP ${res.status}`)
  }
  return res.json()
}

/** Display label: name if non-empty, else id (UUID). Use from lib/tenantDisplay in components. */
export function tenantDisplayName(t: Tenant): string {
  return (t.name != null && t.name.trim() !== '') ? t.name.trim() : t.id
}

/** Tenants from Redis key olo:tenants (JSON array of { id, name }) */
export async function getTenants(): Promise<Tenant[]> {
  const url = `${API_BASE}/tenants`
  console.log('[olo-ui] getTenants: fetching', url)
  const res = await fetch(url)
  console.log('[olo-ui] getTenants: response status=', res.status, res.statusText)
  if (!res.ok) {
    console.error('[olo-ui] getTenants: request failed', res.status, await res.text())
    throw new Error(`HTTP ${res.status}`)
  }
  const data = await res.json()
  console.log('[olo-ui] getTenants: received', Array.isArray(data) ? data.length : 'non-array', data)
  return Array.isArray(data) ? data : []
}

/** Create or update tenant (id, name, description, configVersion). */
export async function saveTenant(tenant: Tenant): Promise<Tenant> {
  const url = `${API_BASE}/tenants`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tenant),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Update existing tenant by id. */
export async function updateTenant(id: string, tenant: Partial<Tenant>): Promise<Tenant> {
  const url = `${API_BASE}/tenants/${encodeURIComponent(id)}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...tenant, id }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Delete tenant by id. */
export async function deleteTenant(id: string): Promise<void> {
  const url = `${API_BASE}/tenants/${encodeURIComponent(id)}`
  const res = await fetch(url, { method: 'DELETE' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

/** Environments for a tenant */
export async function getEnvironments(tenantId: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/tenants/${encodeURIComponent(tenantId)}/environments`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Run IDs for tenant + environment */
export async function getRunIds(tenantId: string, environment: string): Promise<string[]> {
  const res = await fetch(
    `${API_BASE}/tenants/${encodeURIComponent(tenantId)}/environments/${encodeURIComponent(environment)}/runs`
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export interface DropdownDetails {
  tenants: Tenant[]
  environments: string[]
  runIds: string[]
}

export async function getCatalog(): Promise<StudioCatalog> {
  const res = await fetch(`${API_BASE}/catalog`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function listWorkflowConfigurations(): Promise<WorkflowSummary[]> {
  const res = await fetch(`${API_BASE}/configuration/workflows`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function encodeWorkflowPath(fileName: string): string {
  return fileName
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

export async function getWorkflowConfiguration(fileName: string): Promise<WorkflowDocument> {
  const res = await fetch(`${API_BASE}/configuration/workflows/${encodeWorkflowPath(fileName)}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function saveWorkflowConfiguration(
  fileName: string,
  document: WorkflowDocument,
): Promise<WorkflowSummary> {
  const res = await fetch(`${API_BASE}/configuration/workflows/${encodeWorkflowPath(fileName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(document),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function deleteWorkflowConfiguration(fileName: string): Promise<void> {
  const res = await fetch(`${API_BASE}/configuration/workflows/${encodeWorkflowPath(fileName)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function testModelProvider(
  provider: Pick<ModelProvider, 'provider' | 'model' | 'configuration'>,
): Promise<ModelProviderTestResult> {
  const res = await fetch(`${API_BASE}/model-providers/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(provider),
  })
  if (res.status === 404) {
    return {
      ok: false,
      message: 'Test API not found — rebuild and restart olo-be (port 8082).',
    }
  }
  const data = (await res.json()) as ModelProviderTestResult & { message?: string }
  if (!res.ok) {
    return {
      ok: false,
      message: data.message ?? `HTTP ${res.status}`,
    }
  }
  return data
}

export async function getConfigurationRoot(): Promise<string> {
  const res = await fetch(`${API_BASE}/configuration/workflows/meta/root`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as { directory?: string }
  return data.directory ?? ''
}

export async function getDropdownDetails(
  tenantId?: string,
  environment?: string
): Promise<DropdownDetails> {
  const params = new URLSearchParams()
  if (tenantId) params.set('tenantId', tenantId)
  if (environment) params.set('environment', environment)
  const q = params.toString()
  const res = await fetch(`${API_BASE}/dropdown-details${q ? `?${q}` : ''}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
