import { useMemo } from 'react'
import type { CatalogParameter } from '../types/catalog'
import type { WorkflowDocument } from '../types/workflow'
import { WorkflowGlobalProperties } from './WorkflowGlobalProperties'

export interface WorkflowConfigurationEditorProps {
  workflow: WorkflowDocument | null
  catalogParameters: CatalogParameter[]
  dirty: boolean
  onChange: (workflow: WorkflowDocument) => void
  onSave: () => void
  onDelete: () => void
}

function updateParameterValue(
  workflow: WorkflowDocument,
  paramId: string,
  value: unknown,
): WorkflowDocument {
  const existing = workflow.parameters?.[paramId] ?? { type: 'string' }
  return {
    ...workflow,
    parameters: {
      ...workflow.parameters,
      [paramId]: {
        ...existing,
        defaultValue: value,
      },
    },
  }
}

function ParameterField({
  descriptor,
  value,
  onChange,
}: {
  descriptor: CatalogParameter
  value: unknown
  onChange: (value: unknown) => void
}) {
  const widget = descriptor.ui?.widget ?? 'STRING'
  const label = descriptor.label ?? descriptor.id

  if (widget === 'BOOLEAN') {
    return (
      <label className="tenant-config-form-row workflow-param-row">
        <span className="tenant-config-label">{label}</span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    )
  }

  if (widget === 'SLIDER' || widget === 'NUMBER' || descriptor.type === 'number' || descriptor.type === 'integer') {
    const min = descriptor.validation?.minimum
    const max = descriptor.validation?.maximum
    const step = descriptor.validation?.step ?? (descriptor.type === 'integer' ? 1 : 0.1)
    return (
      <label className="tenant-config-form-row workflow-param-row">
        <span className="tenant-config-label">{label}</span>
        <input
          className="tenant-config-input"
          type="number"
          value={value === undefined || value === null ? '' : String(value)}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') {
              onChange(null)
              return
            }
            onChange(descriptor.type === 'integer' ? parseInt(raw, 10) : parseFloat(raw))
          }}
        />
      </label>
    )
  }

  if (widget === 'TEXTAREA') {
    return (
      <label className="tenant-config-form-row workflow-param-row">
        <span className="tenant-config-label">{label}</span>
        <textarea
          className="tenant-config-input workflow-param-textarea"
          value={value == null ? '' : String(value)}
          placeholder={descriptor.ui?.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    )
  }

  return (
    <label className="tenant-config-form-row workflow-param-row">
      <span className="tenant-config-label">{label}</span>
      <input
        className="tenant-config-input"
        type="text"
        value={value == null ? '' : String(value)}
        placeholder={descriptor.ui?.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function WorkflowConfigurationEditor({
  workflow,
  catalogParameters,
  dirty,
  onChange,
  onSave,
  onDelete,
}: WorkflowConfigurationEditorProps) {
  const sortedParameters = useMemo(
    () =>
      [...catalogParameters].sort(
        (a, b) => (a.ui?.order ?? 0) - (b.ui?.order ?? 0),
      ),
    [catalogParameters],
  )

  if (!workflow) {
    return <p className="tenant-config-form-empty">Select a workflow preset to edit.</p>
  }

  return (
    <div className="tenant-config-form-inner workflow-config-editor">
      <h2 className="tenant-config-form-title">{workflow.label ?? workflow.id}</h2>

      <WorkflowGlobalProperties workflow={workflow} onChange={onChange} />

      {sortedParameters.length > 0 ? (
        <section className="workflow-config-section">
          <h3 className="workflow-config-section-title">Parameters (catalog)</h3>
          {sortedParameters.map((descriptor) => (
            <div key={descriptor.id}>
              <ParameterField
                descriptor={descriptor}
                value={workflow.parameters?.[descriptor.id]?.defaultValue}
                onChange={(value) => onChange(updateParameterValue(workflow, descriptor.id, value))}
              />
              {descriptor.ui?.help || descriptor.description ? (
                <p className="workflow-param-help">{descriptor.ui?.help ?? descriptor.description}</p>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      <section className="workflow-config-section">
        <h3 className="workflow-config-section-title">Graph</h3>
        <p className="workflow-config-graph-summary">
          {workflow.nodes?.length ?? 0} nodes · {workflow.edges?.length ?? 0} edges
        </p>
        <ul className="workflow-config-node-list">
          {(workflow.nodes ?? []).map((node) => (
            <li key={node.id}>
              <code>{node.id}</code> <span className="workflow-config-node-type">{node.type}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="workflow-config-section">
        <h3 className="workflow-config-section-title">JSON</h3>
        <textarea
          className="tenant-config-input workflow-config-json"
          value={JSON.stringify(workflow, null, 2)}
          readOnly
        />
        <p className="workflow-param-help">Use Agents for full JSON round-trip outside the catalog fields.</p>
      </section>

      <div className="tenant-config-form-actions tenant-config-form-actions-bottom">
        <button type="button" className="tenant-config-btn danger" onClick={onDelete}>
          Delete
        </button>
        <button
          type="button"
          className="tenant-config-btn primary"
          onClick={onSave}
          disabled={!dirty}
        >
          {dirty ? 'Save changes' : 'Saved'}
        </button>
      </div>
    </div>
  )
}
