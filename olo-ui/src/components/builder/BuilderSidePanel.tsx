import { useState } from 'react'

import { catalogStore } from '../../store/catalogStore'

import { workflowConfigurationStore } from '../../store/workflowConfigurationStore'

import { catalogComponentGroups } from '../../lib/catalogComponents'

import { writeCatalogDrag } from '../../lib/canvasDrag'

import { workflowHooks } from '../../lib/workflowResources'
import { workflowPaletteNodes } from '../../lib/workflowNodeTemplates'
import { isPlannerAgentEnabled, isPlannerToolEnabled } from '../../lib/plannerContext'

import type { CatalogComponentBase } from '../../types/catalog'

import { ExpandableSection } from './ExpandableSection'

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
  | 'capabilities'
  | 'agents'
  | 'hooks'

const DEFAULT_EXPANDED = new Set<SectionId>([
  'components',
  'workflowVariables',
  'modelProviders',
  'capabilities',
  'agents',
  'hooks',
])



function handleNodeDragStart(event: React.DragEvent, item: CatalogComponentBase) {
  writeCatalogDrag(event.dataTransfer, {
    catalogId: item.id,
    kind: 'NODE',
    name: item.name,
    emoji: item.emoji,
  })
}

function handleToolDragStart(event: React.DragEvent, item: CatalogComponentBase) {
  writeCatalogDrag(event.dataTransfer, {
    catalogId: item.id,
    kind: 'TOOL',
    name: item.name,
    emoji: item.emoji,
  })
}

function handleHookDragStart(event: React.DragEvent, item: CatalogComponentBase) {
  writeCatalogDrag(event.dataTransfer, {
    catalogId: item.id,
    kind: 'HOOK',
    name: item.name,
    emoji: item.emoji,
  })
}

function handleAgentDragStart(event: React.DragEvent, agentId: string, label: string) {
  writeCatalogDrag(event.dataTransfer, {
    catalogId: agentId,
    kind: 'AGENT',
    name: label,
    emoji: '🤖',
  })
}

function BuilderPaletteItem({
  title,
  emoji,
  description,
  disabled,
  active,
  onDragStart,
}: {
  title: string
  emoji?: string
  description?: string
  disabled?: boolean
  active?: boolean
  onDragStart: (event: React.DragEvent) => void
}) {
  return (
    <li
      className={`builder-node-item draggable${active ? ' enabled' : ''}`}
      draggable={!disabled}
      onDragStart={onDragStart}
      title={description}
    >
      <span className="builder-check-emoji" aria-hidden>
        {emoji ?? '▢'}
      </span>
      <span>{title}</span>
    </li>
  )
}



export function BuilderSidePanel({ expanded, onToggle }: BuilderSidePanelProps) {

  const catalog = catalogStore((s) => s.catalog)

  const catalogLoading = catalogStore((s) => s.loading)

  const catalogError = catalogStore((s) => s.error)

  const draft = workflowConfigurationStore((s) => s.draft)

  const workflows = workflowConfigurationStore((s) => s.workflows)



  const nodeGroup = catalogComponentGroups(catalog).find((g) => g.id === 'nodes')
  const boundaryNodes = workflowPaletteNodes(draft)
  const catalogTools = catalog?.tools ?? []
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
                    <BuilderPaletteItem
                      key={item.id}
                      title={item.name ?? item.id}
                      emoji={item.emoji}
                      description={item.description ?? item.id}
                      disabled={disabled}
                      onDragStart={(e) => handleNodeDragStart(e, item)}
                    />
                  ))}
                  {(nodeGroup?.items ?? []).map((item) => (
                    <BuilderPaletteItem
                      key={item.id}
                      title={item.name ?? item.id}
                      emoji={item.emoji}
                      description={item.description ?? item.id}
                      disabled={disabled}
                      onDragStart={(e) => handleNodeDragStart(e, item)}
                    />
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



          <ExpandableSection
            title="Capabilities"
            count={catalogTools.length}
            expanded={expandedSections.has('capabilities')}
            onToggle={() => toggleSection('capabilities')}
            hint="Drag catalog tools onto the canvas to add them to the workflow."
          >
            {catalogTools.length === 0 ? (
              <p className="builder-empty">No catalog tools loaded.</p>
            ) : (
              <ul className="builder-node-list">
                {catalogTools.map((tool) => (
                  <BuilderPaletteItem
                    key={tool.id}
                    title={tool.name ?? tool.id}
                    emoji={tool.emoji ?? '🔧'}
                    description={tool.description ?? tool.id}
                    disabled={disabled}
                    active={draft ? isPlannerToolEnabled(draft, tool.id) : false}
                    onDragStart={(e) => handleToolDragStart(e, tool)}
                  />
                ))}
              </ul>
            )}
          </ExpandableSection>

          <ExpandableSection
            title="Agents"
            count={otherWorkflows.length}
            expanded={expandedSections.has('agents')}
            onToggle={() => toggleSection('agents')}
            hint="Drag agent presets onto the canvas to delegate to other workflows."
          >
            {otherWorkflows.length === 0 ? (
              <p className="builder-empty">No other agent presets available.</p>
            ) : (
              <ul className="builder-node-list">
                {otherWorkflows.map((workflow) => (
                  <BuilderPaletteItem
                    key={workflow.id}
                    title={workflow.label ?? workflowLabel(workflow.id!)}
                    emoji="🤖"
                    description={workflow.description ?? workflow.id ?? undefined}
                    disabled={disabled}
                    active={draft ? isPlannerAgentEnabled(draft, workflow.id!) : false}
                    onDragStart={(e) =>
                      handleAgentDragStart(
                        e,
                        workflow.id!,
                        workflow.label ?? workflowLabel(workflow.id!),
                      )
                    }
                  />
                ))}
              </ul>
            )}
          </ExpandableSection>

          <ExpandableSection

            title="Hooks"

            count={draft ? workflowHooks(draft).length : 0}

            expanded={expandedSections.has('hooks')}

            onToggle={() => toggleSection('hooks')}

            hint="Drag observability hooks onto the canvas. Wire agent definition ports into an Agent node."

          >

            {catalogHooks.length === 0 ? (
              <p className="builder-empty">No catalog hooks loaded.</p>
            ) : (
              <ul className="builder-node-list">
                {catalogHooks.map((hook) => (
                  <BuilderPaletteItem
                    key={hook.id}
                    title={hook.name ?? hook.id}
                    emoji={hook.emoji ?? '🪝'}
                    description={hook.description ?? hook.id}
                    disabled={disabled}
                    onDragStart={(e) => handleHookDragStart(e, hook)}
                  />
                ))}
              </ul>
            )}

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

