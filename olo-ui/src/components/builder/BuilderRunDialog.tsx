import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createRuntimeSession,
  fetchRunResponseWithRetry,
  getRuntimeRun,
  listRuntimeMessages,
  sendRuntimeMessage,
  streamRuntimeRunEvents,
  type RunEventDto,
} from '../../api/oloRuntime'
import {
  fallbackResponseMessage,
  normalizeResponseText,
  pickResponseFromEvents,
} from '../../lib/assistantResponse'
import { formatRunEventLogLine } from '../../lib/runEventLog'
import {
  BUILDER_RUN_PROMPT_PRESETS,
  DEFAULT_BUILDER_RUN_PROMPT,
} from '../../lib/builderRunPrompts'
import {
  catalogQueues,
  catalogWorkflowTypes,
  findCatalogQueue,
  resolveInitialRunSelection,
  workflowsForQueue,
} from '../../lib/temporalCatalog'
import { catalogStore } from '../../store/catalogStore'
import { workflowConfigurationStore } from '../../store/workflowConfigurationStore'

export interface BuilderRunDialogProps {
  open: boolean
  initialWorkflowLabel?: string
  initialWorkflowId?: string
  initialTaskQueue?: string
  tenantId: string
  onClose: () => void
}

async function resolveWorkflowReturnText(
  runId: string,
  sessionId: string,
  events: RunEventDto[],
): Promise<string | null> {
  const fromEvents = normalizeResponseText(pickResponseFromEvents(events))
  if (fromEvents) return fromEvents

  const fromApi = normalizeResponseText(await fetchRunResponseWithRetry(runId))
  if (fromApi) return fromApi

  try {
    const messages = await listRuntimeMessages(sessionId)
    const assistant = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant' && m.runId === runId && m.content?.trim())
    const fromHistory = normalizeResponseText(assistant?.content)
    if (fromHistory) return fromHistory
  } catch {
    // optional fallback
  }

  return null
}

export function BuilderRunDialog({
  open,
  initialWorkflowLabel = '',
  initialWorkflowId = '',
  initialTaskQueue = '',
  tenantId,
  onClose,
}: BuilderRunDialogProps) {
  const catalog = catalogStore((s) => s.catalog)
  const catalogLoading = catalogStore((s) => s.loading)
  const catalogError = catalogStore((s) => s.error)
  const workflows = workflowConfigurationStore((s) => s.workflows)
  const workflowsLoading = workflowConfigurationStore((s) => s.loading)
  const workflowsError = workflowConfigurationStore((s) => s.error)

  const [selectedQueue, setSelectedQueue] = useState('')
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('')
  const [prompt, setPrompt] = useState('')
  const [running, setRunning] = useState(false)
  const [logLines, setLogLines] = useState<string[]>([])
  const [finalResponse, setFinalResponse] = useState('')
  const [error, setError] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<(() => void) | null>(null)
  const pollRef = useRef<number | null>(null)
  const eventsRef = useRef<RunEventDto[]>([])
  const sessionIdRef = useRef('')
  const selectionInitializedRef = useRef(false)

  const queueDefinition = useMemo(
    () => findCatalogQueue(catalog, selectedQueue),
    [catalog, selectedQueue],
  )

  const queueWorkflows = useMemo(
    () => workflowsForQueue(workflows, selectedQueue),
    [workflows, selectedQueue],
  )

  const selectedWorkflow = useMemo(
    () => queueWorkflows.find((workflow) => workflow.id === selectedWorkflowId),
    [queueWorkflows, selectedWorkflowId],
  )

  const workflowLabel = selectedWorkflow?.label ?? initialWorkflowLabel ?? selectedWorkflowId
  const taskQueue = selectedQueue.trim()
  const workflowId = selectedWorkflowId.trim()
  const workflowType = queueDefinition?.workflowType ?? catalogWorkflowTypes(catalog)[0]?.id ?? 'olo'

  const stopRun = useCallback(() => {
    abortRef.current?.()
    abortRef.current = null
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const appendLog = useCallback((line: string) => {
    setLogLines((prev) => [...prev, line])
  }, [])

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logLines])

  useEffect(() => {
    if (!open) {
      stopRun()
      setRunning(false)
      selectionInitializedRef.current = false
      setSelectedQueue('')
      setSelectedWorkflowId('')
      setPrompt('')
      setLogLines([])
      setFinalResponse('')
      setError(null)
      eventsRef.current = []
      sessionIdRef.current = ''
      return
    }

    void catalogStore.getState().loadCatalog()
    void workflowConfigurationStore.getState().loadWorkflows()
    return () => stopRun()
  }, [open, stopRun])

  useEffect(() => {
    if (!open || catalogLoading || workflowsLoading || !catalog) {
      return
    }

    const queues = catalogQueues(catalog)
    if (queues.length === 0) {
      return
    }

    const initial = resolveInitialRunSelection(
      catalog,
      workflows,
      initialTaskQueue,
      initialWorkflowId,
    )
    if (initial) {
      setSelectedQueue(initial.queueName)
      setSelectedWorkflowId(initial.workflowId)
    } else if (!selectedQueue) {
      const queueName = queues[0].name
      setSelectedQueue(queueName)
      const firstForQueue = workflowsForQueue(workflows, queueName)[0] ?? workflows[0]
      if (firstForQueue?.id) {
        setSelectedWorkflowId(firstForQueue.id)
      }
    } else if (!selectedWorkflowId && workflows.length > 0) {
      const firstForQueue = workflowsForQueue(workflows, selectedQueue)[0] ?? workflows[0]
      if (firstForQueue?.id) {
        setSelectedWorkflowId(firstForQueue.id)
      }
    }

    if (!selectionInitializedRef.current) {
      setPrompt((current) => current || DEFAULT_BUILDER_RUN_PROMPT)
      selectionInitializedRef.current = true
    }
  }, [
    open,
    catalog,
    catalogLoading,
    workflowsLoading,
    workflows,
    initialTaskQueue,
    initialWorkflowId,
    selectedQueue,
    selectedWorkflowId,
  ])

  const handleQueueChange = (queueName: string) => {
    setSelectedQueue(queueName)
    const nextWorkflow = workflowsForQueue(workflows, queueName)[0]
    setSelectedWorkflowId(nextWorkflow?.id ?? '')
  }

  const handleRun = async (messageOverride?: string) => {
    const content = (messageOverride ?? prompt).trim()
    if (!content || running || !taskQueue || !workflowId) return

    stopRun()
    setRunning(true)
    setError(null)
    setLogLines([])
    setFinalResponse('')
    eventsRef.current = []
    appendLog(
      `Starting workflow "${workflowLabel}" (queue: ${taskQueue}, type: ${workflowType})…`,
    )

    try {
      const tenant = tenantId.trim() || 'default'
      const { sessionId } = await createRuntimeSession({
        tenantId: tenant,
        queueName: taskQueue,
        pipelineId: workflowId,
      })
      sessionIdRef.current = sessionId
      appendLog(`Session ${sessionId.slice(0, 8)}… created`)

      const { runId } = await sendRuntimeMessage(sessionId, content, { taskQueue })
      appendLog(`Run ${runId} started`)

      const onEvent = (event: RunEventDto) => {
        eventsRef.current = [...eventsRef.current, event]
        appendLog(formatRunEventLogLine(event))
        const preview = normalizeResponseText(pickResponseFromEvents(eventsRef.current))
        if (preview) setFinalResponse(preview)
      }

      abortRef.current = streamRuntimeRunEvents(
        runId,
        onEvent,
        (err) => {
          const message = err instanceof Error ? err.message : 'Event stream error'
          setError(message)
          appendLog(`ERROR: ${message}`)
        },
      )

      pollRef.current = window.setInterval(() => {
        void (async () => {
          const run = await getRuntimeRun(runId)
          if (!run) return
          if (run.status !== 'completed' && run.status !== 'failed') return

          if (pollRef.current != null) {
            window.clearInterval(pollRef.current)
            pollRef.current = null
          }

          await new Promise((resolve) => window.setTimeout(resolve, 800))
          stopRun()

          const workflowText = await resolveWorkflowReturnText(runId, sessionId, eventsRef.current)
          setFinalResponse(workflowText ?? fallbackResponseMessage(run.status))
          appendLog(`Run ${run.status}`)
          setRunning(false)
        })()
      }, 1500)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Run failed'
      setError(message)
      appendLog(`ERROR: ${message}`)
      setRunning(false)
    }
  }

  if (!open) return null

  const queues = catalogQueues(catalog)
  const workflowTypes = catalogWorkflowTypes(catalog)
  const runDisabled =
    running ||
    catalogLoading ||
    workflowsLoading ||
    !catalog ||
    queues.length === 0 ||
    !taskQueue ||
    !workflowId ||
    !prompt.trim()

  return (
    <>
      <div className="builder-run-backdrop" onClick={running ? undefined : onClose} aria-hidden />
      <div className="builder-run-dialog" role="dialog" aria-labelledby="builder-run-title">
        <div className="builder-run-header">
          <h2 id="builder-run-title" className="builder-run-title">
            Run workflow
          </h2>
          <button
            type="button"
            className="builder-run-close"
            onClick={onClose}
            disabled={running}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {catalogError ? (
          <p className="builder-run-error">{catalogError}</p>
        ) : workflowsError ? (
          <p className="builder-run-error">{workflowsError}</p>
        ) : catalogLoading && !catalog ? (
          <p className="builder-run-meta">Loading queues and workflow types…</p>
        ) : workflowsLoading ? (
          <p className="builder-run-meta">Loading workflow presets…</p>
        ) : catalog ? (
          <div className="builder-run-target">
            <label className="builder-run-field">
              <span className="builder-run-label">Queue</span>
              <select
                className="builder-run-select tenant-config-input"
                value={selectedQueue}
                onChange={(e) => handleQueueChange(e.target.value)}
                disabled={running || queues.length === 0}
              >
                {queues.length === 0 ? (
                  <option value="">No queues in catalog</option>
                ) : (
                  <>
                    {!selectedQueue ? <option value="">Select queue…</option> : null}
                    {queues.map((queue) => (
                      <option key={queue.name} value={queue.name}>
                        {queue.label} ({queue.name})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </label>

            <label className="builder-run-field">
              <span className="builder-run-label">Workflow</span>
              <select
                className="builder-run-select tenant-config-input"
                value={selectedWorkflowId}
                onChange={(e) => setSelectedWorkflowId(e.target.value)}
                disabled={running || queueWorkflows.length === 0}
              >
                {queueWorkflows.length === 0 ? (
                  <option value="">
                    {workflows.length === 0 ? 'No workflow presets loaded' : 'No workflows for this queue'}
                  </option>
                ) : (
                  <>
                    {!selectedWorkflowId ? <option value="">Select workflow…</option> : null}
                    {queueWorkflows.map((workflow) => (
                      <option key={workflow.fileName} value={workflow.id ?? workflow.fileName}>
                        {workflow.label ?? workflow.id ?? workflow.fileName}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </label>

            <label className="builder-run-field">
              <span className="builder-run-label">Workflow type</span>
              <select
                className="builder-run-select tenant-config-input"
                value={workflowType}
                disabled
                aria-readonly
              >
                {(workflowTypes.length > 0
                  ? workflowTypes
                  : [{ id: workflowType, label: workflowType }]
                ).map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        <label className="builder-run-label" htmlFor="builder-run-prompt">
          Input
        </label>
        <div className="builder-run-quick-prompts" role="group" aria-label="Quick test messages">
          {BUILDER_RUN_PROMPT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`builder-run-quick-btn${prompt === preset.message ? ' active' : ''}`}
              onClick={() => setPrompt(preset.message)}
              disabled={running}
              title={preset.message}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <textarea
          id="builder-run-prompt"
          className="builder-run-input"
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a message or task for the workflow…"
          disabled={running}
        />

        <div className="builder-run-actions">
          <button
            type="button"
            className="tenant-config-btn primary builder-run-submit"
            onClick={() => void handleRun()}
            disabled={runDisabled}
          >
            {running ? 'Running…' : 'Run'}
          </button>
          <button
            type="button"
            className="tenant-config-btn builder-run-quick-run"
            onClick={() => void handleRun(DEFAULT_BUILDER_RUN_PROMPT)}
            disabled={runDisabled}
            title={`Run with "${DEFAULT_BUILDER_RUN_PROMPT}"`}
          >
            Quick test
          </button>
        </div>

        {error ? <p className="builder-run-error">{error}</p> : null}

        <div className="builder-run-log-wrap">
          <div className="builder-run-log-label">Progress</div>
          <div ref={logRef} className="builder-run-log">
            {logLines.length === 0 ? (
              <span className="builder-run-log-empty">Run output will appear here.</span>
            ) : (
              logLines.map((line, index) => (
                <div key={`${index}-${line}`} className="builder-run-log-line">
                  {line}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="builder-run-response-wrap">
          <div className="builder-run-log-label">Final response</div>
          <div className="builder-run-response">
            {finalResponse || (running ? 'Waiting for completion…' : '—')}
          </div>
        </div>
      </div>
    </>
  )
}
