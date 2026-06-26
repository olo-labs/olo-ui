import { useState } from 'react'

import { catalogStore } from '../../store/catalogStore'

import { workflowConfigurationStore } from '../../store/workflowConfigurationStore'

import { catalogComponentGroups } from '../../lib/catalogComponents'

import { writeCatalogDrag } from '../../lib/canvasDrag'

import {
  isCatalogHookEnabled,
  toggleCatalogHook,
  workflowHooks,
} from '../../lib/workflowResources'
import { workflowPaletteNodes } from '../../lib/workflowNodeTemplates'
import { plannerContextSummary, readPlannerContext } from '../../lib/plannerContext'

import type { CatalogComponentBase } from '../../types/catalog'

import { ExpandableSection } from './ExpandableSection'

import { PlannerContextSection } from './PlannerContextSection'

import { ModelProvidersSection } from './ModelProvidersSection'
import { VariablesSection } from './VariablesSection'
import { workflowModelProviders } from '../../lib/workflowModelProviders'



export interface BuilderSidePanelProps {

  expanded: boolean

  onToggle: () => void

}



type SectionId =

  | 'components'

  | 'workflowVariables'

  | 'modelProviders'

  | 'plannerContext'

  | 'hooks'



const DEFAULT_EXPANDED = new Set<SectionId>(['components', 'workflowVariables', 'modelProviders', 'hooks'])



function handleNodeDragStart(event: React.DragEvent, item: CatalogComponentBase) {

  writeCatalogDrag(event.dataTransfer, {

    catalogId: item.id,

    kind: 'NODE',

    name: item.name,

    emoji: item.emoji,

  })

}



function CatalogCheckItem({

  item,

  checked,

  disabled,

  onChange,

}: {

  item: CatalogComponentBase

  checked: boolean

  disabled?: boolean

  onChange: (checked: boolean) => void

}) {

  return (

    <li className="builder-check-item">

      <label className="builder-check-label">

        <input

          type="checkbox"

          checked={checked}

          disabled={disabled}

          onChange={(e) => onChange(e.target.checked)}

        />

        <span className="builder-check-emoji" aria-hidden>{item.emoji ?? '▢'}</span>

        <span className="builder-check-text">

          <span className="builder-check-name">{item.name ?? item.id}</span>

        </span>

      </label>

    </li>

  )

}



export function BuilderSidePanel({ expanded, onToggle }: BuilderSidePanelProps) {

  const catalog = catalogStore((s) => s.catalog)

  const catalogLoading = catalogStore((s) => s.loading)

  const catalogError = catalogStore((s) => s.error)

  const draft = workflowConfigurationStore((s) => s.draft)

  const workflows = workflowConfigurationStore((s) => s.workflows)

  const updateDraft = workflowConfigurationStore((s) => s.updateDraft)



  const nodeGroup = catalogComponentGroups(catalog).find((g) => g.id === 'nodes')
  const boundaryNodes = workflowPaletteNodes(draft)

  const catalogHooks = catalog?.hooks ?? []



  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(

    () => new Set(DEFAULT_EXPANDED),

  )

  const [expandedNodeGroups, setExpandedNodeGroups] = useState(true)



  const toggleSection = (id: SectionId) => {

    setExpandedSections((prev) => {

      const next = new Set(prev)

      if (next.has(id)) next.delete(id)

      else next.add(id)

      return next

    })

  }



  const otherWorkflows = workflows.filter((w) => w.id && w.id !== draft?.id)

  const disabled = !draft



  const workflowLabel = (id: string) =>

    workflows.find((w) => w.id === id)?.label ?? id



  const plannerSelection = draft ? readPlannerContext(draft) : null
  const plannerSummaryText =
    draft && plannerSelection ? plannerContextSummary(draft, plannerSelection) : ''



  return (

    <aside

      className={`builder-side-panel tools-panel side-panel ${expanded ? 'expanded' : 'collapsed'}`}

    >

      {expanded && (

        <div className="side-panel-inner">

          <div className="side-panel-title">Builder</div>

          {disabled ? (

            <p className="builder-panel-message">Open a workflow under Agents first.</p>

          ) : null}

          {catalogLoading ? <p className="builder-panel-message">Loading catalog…</p> : null}

          {catalogError ? <p className="builder-panel-error">{catalogError}</p> : null}



          <ExpandableSection

            title="Components"

            count={(nodeGroup?.items.length ?? 0) + boundaryNodes.length}

            expanded={expandedSections.has('components')}

            onToggle={() => toggleSection('components')}

            hint="Drag nodes onto the canvas."

          >

            <section className={`builder-nodes-group ${expandedNodeGroups ? 'expanded' : 'collapsed'}`}>

              <button

                type="button"

                className="builder-nodes-header"

                onClick={() => setExpandedNodeGroups((v) => !v)}

              >

                <span className="builder-section-chevron">{expandedNodeGroups ? '▼' : '▶'}</span>

                <span>Nodes</span>

              </button>

              {expandedNodeGroups ? (

                <ul className="builder-node-list">
                  {boundaryNodes.map((item) => (
                    <li
                      key={item.id}
                      className="builder-node-item draggable"
                      draggable={!disabled}
                      onDragStart={(e) => handleNodeDragStart(e, item)}
                      title={item.description ?? item.id}
                    >
                      <span className="builder-check-emoji">{item.emoji ?? '▢'}</span>
                      <span>{item.name ?? item.id}</span>
                    </li>
                  ))}
                  {(nodeGroup?.items ?? []).map((item) => (

                    <li

                      key={item.id}

                      className="builder-node-item draggable"

                      draggable={!disabled}

                      onDragStart={(e) => handleNodeDragStart(e, item)}

                      title={item.description ?? item.id}

                    >

                      <span className="builder-check-emoji">{item.emoji ?? '▢'}</span>

                      <span>{item.name ?? item.id}</span>

                    </li>

                  ))}

                </ul>

              ) : null}

            </section>

          </ExpandableSection>



          <ExpandableSection

            title="Workflow variables"

            count={draft?.variables?.length ?? 0}

            expanded={expandedSections.has('workflowVariables')}

            onToggle={() => toggleSection('workflowVariables')}

            hint="Define workflow-scoped variables with type and scope."

          >

            <VariablesSection />

          </ExpandableSection>



          <ExpandableSection

            title="Model providers"

            count={draft ? workflowModelProviders(draft).length : 0}

            expanded={expandedSections.has('modelProviders')}

            onToggle={() => toggleSection('modelProviders')}

            hint="LLM endpoints (local, URL, OpenAI). Assign to Agent and Model nodes on the canvas."

          >

            <ModelProvidersSection />

          </ExpandableSection>



          <section

            className={`builder-section planner-context-section ${

              expandedSections.has('plannerContext') ? 'expanded' : 'collapsed'

            }`}

          >

            <button

              type="button"

              className="builder-section-header"

              onClick={() => toggleSection('plannerContext')}

              aria-expanded={expandedSections.has('plannerContext')}

            >

              <span className="builder-section-chevron" aria-hidden>

                {expandedSections.has('plannerContext') ? '▼' : '▶'}

              </span>

              <span className="builder-section-title">Planner context</span>

            </button>

            {!expandedSections.has('plannerContext') && plannerSelection ? (

              <p className="planner-context-collapsed-summary">{plannerSummaryText}</p>

            ) : null}

            {expandedSections.has('plannerContext') ? (

              <>

                <p className="builder-section-hint">

                  Capabilities and delegate agents for planner context. Prompts are configured on Agent nodes.

                </p>

                <div className="builder-section-body">

                  <PlannerContextSection

                    disabled={disabled}

                    otherWorkflows={otherWorkflows.map((w) => ({

                      id: w.id!,

                      label: w.label,

                      description: w.description,

                    }))}

                    workflowLabel={workflowLabel}

                  />

                </div>

              </>

            ) : null}

          </section>



          <ExpandableSection

            title="Hooks"

            count={draft ? workflowHooks(draft).length : 0}

            expanded={expandedSections.has('hooks')}

            onToggle={() => toggleSection('hooks')}

            hint="Observability hooks applied by node pattern (** = all)."

          >

            <ul className="builder-check-list">

              {catalogHooks.map((item) => (

                <CatalogCheckItem

                  key={item.id}

                  item={item}

                  checked={draft ? isCatalogHookEnabled(draft, item.id) : false}

                  disabled={disabled}

                  onChange={(enabled) => {

                    if (!draft) return

                    updateDraft(toggleCatalogHook(draft, item, enabled))

                  }}

                />

              ))}

            </ul>

          </ExpandableSection>

        </div>

      )}

      <button

        type="button"

        className="side-panel-toggle"

        onClick={onToggle}

        title={expanded ? 'Collapse' : 'Expand'}

        aria-label={expanded ? 'Collapse builder panel' : 'Expand builder panel'}

      >

        {expanded ? (

          '<'

        ) : (

          <span className="side-panel-collapsed-label">Builder</span>

        )}

      </button>

    </aside>

  )

}

