import { SECTIONS, type SectionId } from '../types/layout'
import { TenantConfigurationList } from './TenantConfigurationList'
import type { Tenant } from '../types/tenant'

export interface MainContentProps {
  sectionId: SectionId | null
  subId: string
  runSelected: boolean
  runId: string
  onRunIdChange: (id: string) => void
  /** When Configuration → Tenant configuration */
  tenants?: Tenant[]
  tenantsLoading?: boolean
  configSelectedTenant?: Tenant | null
  onSelectTenant?: (tenant: Tenant) => void
  onAddNewTenant?: () => void
  onDeleteTenant?: (id: string) => void
}

export function MainContent({
  sectionId,
  subId,
  runSelected,
  runId,
  onRunIdChange,
  tenants = [],
  tenantsLoading = false,
  configSelectedTenant = null,
  onSelectTenant,
  onAddNewTenant,
  onDeleteTenant,
}: MainContentProps) {
  const section = sectionId ? SECTIONS.find((s) => s.id === sectionId) : null

  if (!section) {
    return (
      <main className="main-content">
        <div className="main-content-placeholder">
          <p>Select a category and option from the left panel.</p>
        </div>
      </main>
    )
  }

  const showRunSelector =
    (section.id === 'runtime' && subId === 'live-runs') ||
    (section.id === 'ledger' && subId === 'runs')
  const options = runSelected && section.runSelectedOptions?.length
    ? section.runSelectedOptions
    : section.subOptions
  const currentLabel = options.find((o) => o.id === subId)?.label ?? (subId || section.label)

  return (
    <main className="main-content">
      <div className="main-content-header">
        <h1 className="main-content-title">
          {section.label}
          <span className="main-content-subtitle"> → {currentLabel}</span>
        </h1>
        {showRunSelector && (
          <div className="main-content-run-select">
            <label className="main-content-run-label">Run</label>
            <select
              className="main-content-run-select-el"
              value={runId}
              onChange={(e) => onRunIdChange(e.target.value)}
            >
              <option value="">Select run</option>
              <option value="run-1">run-1</option>
              <option value="run-2">run-2</option>
            </select>
          </div>
        )}
      </div>
      <div className="main-content-body">
        {section.id === 'configuration' && subId === 'tenant-configuration' ? (
          <TenantConfigurationList
            tenants={tenants}
            loading={tenantsLoading}
            selectedTenantId={configSelectedTenant?.id ?? null}
            onSelectTenant={onSelectTenant ?? (() => {})}
            onAddNew={onAddNewTenant ?? (() => {})}
            onDeleteTenant={onDeleteTenant ?? (() => {})}
          />
        ) : (
          <div className="main-content-placeholder-inner">
            {section.subOptions.length === 0 && !section.runSelectedOptions?.length ? (
              <>Content for this section (placeholder).</>
            ) : (
              <>Content for <strong>{currentLabel}</strong> (placeholder).</>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
