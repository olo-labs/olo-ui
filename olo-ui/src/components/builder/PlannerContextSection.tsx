import { useState } from 'react'

import { catalogStore } from '../../store/catalogStore'

import { workflowConfigurationStore } from '../../store/workflowConfigurationStore'

import {

  isPlannerAgentEnabled,

  isPlannerToolEnabled,

  readPlannerContext,

  togglePlannerAgent,

  togglePlannerTool,

  updatePlannerContext,

} from '../../lib/plannerContext'

import { ExpandableSection } from './ExpandableSection'



type SubSectionId = 'capabilities' | 'agents'



const DEFAULT_SUB_EXPANDED = new Set<SubSectionId>(['capabilities', 'agents'])



function ChecklistItem({

  title,

  description,

  checked,

  disabled,

  onChange,

}: {

  title: string

  description?: string

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

        <span className="builder-check-text">

          <span className="builder-check-name">{title}</span>

          {description ? <span className="builder-check-desc">{description}</span> : null}

        </span>

      </label>

    </li>

  )

}



export interface PlannerContextSectionProps {

  disabled?: boolean

  otherWorkflows: { id: string; label?: string | null; description?: string | null }[]

  workflowLabel: (id: string) => string

}



export function PlannerContextSection({

  disabled,

  otherWorkflows,

  workflowLabel,

}: PlannerContextSectionProps) {

  const catalog = catalogStore((s) => s.catalog)

  const draft = workflowConfigurationStore((s) => s.draft)

  const updateDraft = workflowConfigurationStore((s) => s.updateDraft)

  const catalogTools = catalog?.tools ?? []



  const [expandedSubs, setExpandedSubs] = useState<Set<SubSectionId>>(

    () => new Set(DEFAULT_SUB_EXPANDED),

  )



  const selection = draft ? readPlannerContext(draft) : null



  if (!draft || !selection) {

    return <p className="builder-empty">Open a workflow to configure planner context.</p>

  }



  const toggleSub = (id: SubSectionId) => {

    setExpandedSubs((prev) => {

      const next = new Set(prev)

      if (next.has(id)) next.delete(id)

      else next.add(id)

      return next

    })

  }



  const patchContext = (patch: Parameters<typeof updatePlannerContext>[1]) => {

    updateDraft(updatePlannerContext(draft, patch, catalogTools))

  }



  return (

    <div className="planner-context">

      <ExpandableSection

        title="Capabilities"

        count={selection.selectedTools.length}

        expanded={expandedSubs.has('capabilities')}

        onToggle={() => toggleSub('capabilities')}

        hint="Catalog tools exposed to the planner when capability injection is enabled."

      >

        <ul className="builder-check-list">

          <ChecklistItem

            title="Include capability definitions in prompt"

            description="Expands {CAPABILITIES} with selected tool names and descriptions."

            checked={selection.injectCapabilities}

            disabled={disabled}

            onChange={(injectCapabilities) => patchContext({ injectCapabilities })}

          />

        </ul>

        <p className="builder-subsection-label">Selected capabilities</p>

        {catalogTools.length === 0 ? (

          <p className="builder-empty">No catalog tools loaded.</p>

        ) : (

          <ul className="builder-check-list">

            {catalogTools.map((tool) => (

              <ChecklistItem

                key={tool.id}

                title={tool.name ?? tool.id}

                description={tool.description}

                checked={isPlannerToolEnabled(draft, tool.id)}

                disabled={disabled}

                onChange={(enabled) => {

                  updateDraft(togglePlannerTool(draft, tool.id, enabled, catalogTools))

                }}

              />

            ))}

          </ul>

        )}

      </ExpandableSection>



      <ExpandableSection

        title="Available agents"

        count={selection.selectedAgents.length}

        expanded={expandedSubs.has('agents')}

        onToggle={() => toggleSub('agents')}

        hint="Agents included when the prompt uses {agents}. Selected agents are expanded at run time."

      >

        <p className="builder-subsection-label">Selected agents</p>

        {otherWorkflows.length === 0 ? (

          <p className="builder-empty">No other agent presets available.</p>

        ) : (

          <ul className="builder-check-list">

            {otherWorkflows.map((workflow) => (

              <ChecklistItem

                key={workflow.id}

                title={workflow.label ?? workflowLabel(workflow.id)}

                description={workflow.description ?? workflow.id}

                checked={isPlannerAgentEnabled(draft, workflow.id)}

                disabled={disabled}

                onChange={(enabled) => {

                  updateDraft(togglePlannerAgent(draft, workflow.id, enabled, catalogTools))

                }}

              />

            ))}

          </ul>

        )}

      </ExpandableSection>

    </div>

  )

}


