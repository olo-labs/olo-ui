import { useState } from 'react'
import { workflowConfigurationStore } from '../../store/workflowConfigurationStore'

function SaveIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  )
}

function workflowOptionLabel(
  label: string | null,
  id: string | null,
  fileName: string,
): string {
  if (label) return label
  if (id) return id
  return fileName.replace(/\.json$/i, '')
}

export interface CanvasToolbarProps {
  readOnly?: boolean
}

export function CanvasToolbar({ readOnly = false }: CanvasToolbarProps) {
  const workflows = workflowConfigurationStore((s) => s.workflows)
  const workflowsLoading = workflowConfigurationStore((s) => s.loading)
  const selectedFileName = workflowConfigurationStore((s) => s.selectedFileName)
  const draft = workflowConfigurationStore((s) => s.draft)
  const dirty = workflowConfigurationStore((s) => s.dirty)
  const error = workflowConfigurationStore((s) => s.error)
  const selectWorkflow = workflowConfigurationStore((s) => s.selectWorkflow)
  const saveDraft = workflowConfigurationStore((s) => s.saveDraft)

  const [saving, setSaving] = useState(false)

  const handleWorkflowChange = async (fileName: string) => {
    if (!fileName || fileName === selectedFileName) return
    if (dirty) {
      const discard = window.confirm(
        'You have unsaved changes. Discard them and switch workflow?',
      )
      if (!discard) return
    }
    await selectWorkflow(fileName)
  }

  const handleSave = async () => {
    if (!draft || !selectedFileName || readOnly || saving) return
    setSaving(true)
    try {
      await saveDraft()
    } catch {
      // error surfaced via store
    } finally {
      setSaving(false)
    }
  }

  const saveDisabled = readOnly || !draft || !selectedFileName || saving || !dirty
  const saveTitle = saving
    ? 'Saving…'
    : dirty
      ? 'Save workflow'
      : 'No unsaved changes'

  return (
    <div className="workflow-canvas-toolbar">
      <div className="workflow-canvas-toolbar-left">
        <label className="workflow-canvas-select-wrap">
          <span className="visually-hidden">Workflow</span>
          <select
            className="workflow-canvas-select"
            value={selectedFileName ?? ''}
            disabled={workflowsLoading || workflows.length === 0}
            onChange={(e) => void handleWorkflowChange(e.target.value)}
            aria-label="Select workflow"
          >
            <option value="" disabled>
              {workflowsLoading ? 'Loading workflows…' : 'Select workflow…'}
            </option>
            {workflows.map((workflow) => (
              <option key={workflow.fileName} value={workflow.fileName}>
                {workflowOptionLabel(workflow.label, workflow.id, workflow.fileName)}
              </option>
            ))}
          </select>
        </label>
        {draft?.emoji ? (
          <span className="workflow-canvas-toolbar-emoji" aria-hidden>
            {draft.emoji}
          </span>
        ) : null}
      </div>

      {!readOnly ? (
        <div className="workflow-canvas-toolbar-right">
          {error ? (
            <span className="workflow-canvas-toolbar-error" title={error}>
              Save failed
            </span>
          ) : null}
          <button
            type="button"
            className={`workflow-canvas-save-btn${dirty ? ' dirty' : ''}`}
            onClick={() => void handleSave()}
            disabled={saveDisabled}
            title={saveTitle}
            aria-label={saveTitle}
          >
            <SaveIcon />
            {dirty ? <span className="workflow-canvas-save-dot" aria-hidden /> : null}
          </button>
        </div>
      ) : null}
    </div>
  )
}
