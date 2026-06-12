import {

  SECTIONS,

  getSubOption,

  sectionIsComingSoon,

  subOptionIsComingSoon,

  type SectionId,

} from '../types/layout'

import { ComingSoon } from './ComingSoon'

import { TenantConfigurationList } from './TenantConfigurationList'

import { WorkflowConfigurationList } from './WorkflowConfigurationList'

import { StudioCanvas } from './StudioCanvas'

import type { Tenant } from '../types/tenant'

import type { WorkflowSummary } from '../types/workflow'



export interface MainContentProps {

  sectionId: SectionId | null

  subId: string

  tenants?: Tenant[]

  tenantsLoading?: boolean

  configSelectedTenant?: Tenant | null

  onSelectTenant?: (tenant: Tenant) => void

  onAddNewTenant?: () => void

  onDeleteTenant?: (id: string) => void

  workflows?: WorkflowSummary[]

  workflowsLoading?: boolean

  workflowsError?: string | null

  configurationRoot?: string

  selectedWorkflowFile?: string | null

  onSelectWorkflow?: (fileName: string) => void

  onImportWorkflowFile?: (file: File) => Promise<void>

  onExportWorkflow?: () => void

  workflowExportDisabled?: boolean

}



export function MainContent({

  sectionId,

  subId,

  tenants = [],

  tenantsLoading = false,

  configSelectedTenant = null,

  onSelectTenant,

  onAddNewTenant,

  onDeleteTenant,

  workflows = [],

  workflowsLoading = false,

  workflowsError = null,

  configurationRoot = '',

  selectedWorkflowFile = null,

  onSelectWorkflow,

  onImportWorkflowFile,

  onExportWorkflow,

  workflowExportDisabled = true,

}: MainContentProps) {

  const section = sectionId ? SECTIONS.find((s) => s.id === sectionId) : null



  if (!section) {

    return (

      <main className="main-content">

        <div className="main-content-placeholder">

          <p>Select a section from the navigation.</p>

        </div>

      </main>

    )

  }



  const sub = subId ? getSubOption(section.id, subId) : undefined

  const options = section.subOptions

  const currentLabel = sub?.label ?? (subId || section.label)



  const renderBody = () => {

    if (sectionIsComingSoon(section)) {

      return <ComingSoon title={section.label} />

    }



    if (sub && subOptionIsComingSoon(sub)) {

      return <ComingSoon title={sub.label} description={`${sub.label} will be available in a future release.`} />

    }



    if (section.id === 'administration' && subId === 'tenants') {

      return (

        <TenantConfigurationList

          tenants={tenants}

          loading={tenantsLoading}

          selectedTenantId={configSelectedTenant?.id ?? null}

          onSelectTenant={onSelectTenant ?? (() => {})}

          onAddNew={onAddNewTenant ?? (() => {})}

          onDeleteTenant={onDeleteTenant ?? (() => {})}

        />

      )

    }



    if (section.id === 'workflows' && subId === 'import-export') {

      return (

        <WorkflowConfigurationList

          workflows={workflows}

          configurationRoot={configurationRoot}

          loading={workflowsLoading}

          error={workflowsError}

          selectedFileName={selectedWorkflowFile}

          onSelect={onSelectWorkflow ?? (() => {})}

          onImportFile={onImportWorkflowFile ?? (async () => {})}

          onExportSelected={onExportWorkflow ?? (() => {})}

          exportDisabled={workflowExportDisabled}

        />

      )

    }



    if (section.id === 'workflows' && subId === 'builder') {

      return <StudioCanvas />

    }



    if (options.length === 0) {

      return <ComingSoon title={section.label} />

    }



    return (

      <div className="main-content-placeholder-inner">

        Content for <strong>{currentLabel}</strong> (placeholder).

      </div>

    )

  }



  return (

    <main className="main-content">

      <div className="main-content-header">

        <h1 className="main-content-title">

          <span className="main-content-section-emoji" aria-hidden>{section.emoji}</span>

          {section.label}

          {subId ? <span className="main-content-subtitle"> → {currentLabel}</span> : null}

        </h1>

      </div>

      <div className="main-content-body">{renderBody()}</div>

    </main>

  )

}


