import { useCallback, useEffect, useRef, useState } from 'react'
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

export interface BuilderRunDialogProps {
  open: boolean
  workflowLabel: string
  workflowId: string
  taskQueue: string
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
  workflowLabel,
  workflowId,
  taskQueue,
  tenantId,
  onClose,
}: BuilderRunDialogProps) {
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
      setPrompt('')
      setLogLines([])
      setFinalResponse('')
      setError(null)
      eventsRef.current = []
      sessionIdRef.current = ''
      return
    }
    setPrompt(DEFAULT_BUILDER_RUN_PROMPT)
    return () => stopRun()
  }, [open, stopRun])

  const handleRun = async (messageOverride?: string) => {
    const content = (messageOverride ?? prompt).trim()
    if (!content || running) return

    stopRun()
    setRunning(true)
    setError(null)
    setLogLines([])
    setFinalResponse('')
    eventsRef.current = []
    appendLog(`Starting workflow "${workflowLabel}" (queue: ${taskQueue})…`)

    try {
      const tenant = tenantId.trim() || 'default'
      const { sessionId } = await createRuntimeSession({
        tenantId: tenant,
        queueName: taskQueue,
        pipelineId: workflowId.trim() || taskQueue,
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

        <p className="builder-run-meta">
          {workflowLabel} · queue <code>{taskQueue}</code>
        </p>

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
            disabled={running || !prompt.trim()}
          >
            {running ? 'Running…' : 'Run'}
          </button>
          <button
            type="button"
            className="tenant-config-btn builder-run-quick-run"
            onClick={() => void handleRun(DEFAULT_BUILDER_RUN_PROMPT)}
            disabled={running}
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
