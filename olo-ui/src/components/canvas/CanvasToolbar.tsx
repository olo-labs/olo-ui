import { useState } from 'react'
import { checkOloRuntimeHealth } from '../../api/oloRuntime'
import { signalWorkerRefresh } from '../../api/rest'
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
  const [refreshing, setRefreshing] = useState(false)
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
    if (refreshing) return
    setRefreshing(true)
    const workerWarnings: string[] = []
    try {
      try {
        await signalWorkerRefresh()
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Worker refresh signal failed'
        workerWarnings.push(message)
      }
      await checkOloRuntimeHealth()
      await Promise.all([
        catalogStore.getState().loadCatalog(),
        workflowConfigurationStore.getState().reloadFromDisk(),
      ])
      if (workerWarnings.length > 0) {
        window.alert(
          `Studio data reloaded, but worker refresh could not be signaled:\n\n${workerWarnings.join('\n')}\n\nEnsure olo-be can reach Redis and olo-worker has cache.enabled=true.`,
        )
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Refresh failed'
      window.alert(`Refresh server failed: ${message}\n\nEnsure olo is running on port 7080.`)
    } finally {
      setRefreshing(false)
    }
  }

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
              disabled={refreshing}
              title="Refresh studio data and signal worker queue reload"
              aria-label="Refresh studio data and signal worker queue reload"
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

      <BuilderRunDialog
        open={runOpen}
        workflowLabel={draft?.label ?? draft?.id ?? 'Workflow'}
        taskQueue={taskQueue}
        tenantId={tenantId}
        onClose={() => setRunOpen(false)}
      />
    </>
  )
}

