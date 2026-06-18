import { useState } from 'react'
import { refreshOloStack } from '../../api/rest'
import { catalogStore } from '../../store/catalogStore'
import { workflowConfigurationStore } from '../../store/workflowConfigurationStore'
import { useUIStore } from '../../store/ui'
import { BuilderRunDialog } from '../builder/BuilderRunDialog'

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

function DiscardIcon() {
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
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

function RefreshIcon() {
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
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10M1 14l5.36 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

function RunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 5v14l11-7z" />
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
  const tenantId = useUIStore((s) => s.tenantId)

  const [saving, setSaving] = useState(false)
  const [signalingWorker, setSignalingWorker] = useState(false)
  const [reloadingUi, setReloadingUi] = useState(false)
  const [runOpen, setRunOpen] = useState(false)

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

  const handleRefreshServer = async () => {
    if (signalingWorker) return
    if (dirty) {
      const proceed = window.confirm(
        'You have unsaved changes. Refresh reloads configuration from disk and may overwrite the canvas. Continue?',
      )
      if (!proceed) return
    }
    setSignalingWorker(true)
    try {
      const result = await refreshOloStack()
      await Promise.all([
        catalogStore.getState().loadCatalog(),
        workflowConfigurationStore.getState().reloadFromDisk(),
      ])
      if (!result.ok) {
        window.alert(
          `Stack refresh incomplete:\n\n${result.steps.join('\n')}\n\n`
            + 'Ensure Redis is reachable, olo-worker has cache.enabled=true, and olo backend is on port 7080.',
        )
        return
      }
      if (!result.runtimeReloaded) {
        window.alert(
          `Worker reloaded. Olo runtime was not refreshed:\n\n${result.runtimeMessage ?? 'unknown error'}\n\n`
            + 'Start olo backend (port 7080) so chat pipeline context updates.',
        )
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Stack refresh failed'
      window.alert(
        `Could not refresh OLO stack:\n\n${message}\n\n`
          + 'Restart olo-be (port 8082) after pulling latest code, then try again.',
      )
    } finally {
      setSignalingWorker(false)
    }
  }

  const handleDiscardChanges = async () => {
    if (reloadingUi) return
    if (dirty) {
      const discard = window.confirm('Discard unsaved changes and reload from disk?')
      if (!discard) return
    }
    setReloadingUi(true)
    try {
      await Promise.all([
        catalogStore.getState().loadCatalog(),
        workflowConfigurationStore.getState().reloadFromDisk(),
      ])
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Reload failed'
      window.alert(`Reload from disk failed: ${message}`)
    } finally {
      setReloadingUi(false)
    }
  }

  const discardDisabled = readOnly || reloadingUi || workflowsLoading
  const discardTitle = reloadingUi
    ? 'Reloading…'
    : dirty
      ? 'Discard changes and reload from disk'
      : 'Reload from disk'
  const saveDisabled = readOnly || !draft || !selectedFileName || saving || !dirty
  const saveTitle = saving
    ? 'Saving…'
    : dirty
      ? 'Save workflow'
      : 'No unsaved changes'
  const taskQueue = draft?.queue?.trim() || draft?.id?.trim() || ''
  const runDisabled = !draft || !taskQueue

  return (
    <>
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
              className="workflow-canvas-icon-btn"
              onClick={() => void handleRefreshServer()}
              disabled={signalingWorker}
              title="Refresh OLO stack (worker, runtime, studio)"
              aria-label="Refresh OLO stack (worker, runtime, studio)"
            >
              <RefreshIcon />
            </button>
            <button
              type="button"
              className="workflow-canvas-run-btn"
              onClick={() => setRunOpen(true)}
              disabled={runDisabled}
              title={runDisabled ? 'Select a workflow with a queue' : 'Run workflow'}
            >
              <RunIcon />
              <span>Run</span>
            </button>
            <div className="workflow-canvas-edit-actions">
              <button
                type="button"
                className={`workflow-canvas-discard-btn${dirty ? ' dirty' : ''}`}
                onClick={() => void handleDiscardChanges()}
                disabled={discardDisabled}
                title={discardTitle}
                aria-label={discardTitle}
              >
                <DiscardIcon />
              </button>
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
          </div>
        ) : null}
      </div>

      <BuilderRunDialog
        open={runOpen}
        workflowLabel={draft?.label ?? draft?.id ?? 'Workflow'}
        workflowId={draft?.id?.trim() ?? ''}
        taskQueue={taskQueue}
        tenantId={tenantId}
        onClose={() => setRunOpen(false)}
      />
    </>
  )
}
