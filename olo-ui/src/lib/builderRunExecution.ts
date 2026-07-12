/*
 * Copyright (c) 2026 Olo Labs
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  cancelRuntimeRun,
  createRuntimeSession,
  getRuntimeRun,
  sendRuntimeMessage,
  streamRuntimeRunEvents,
  type RunEventDto,
} from '../api/oloRuntime'
import { fallbackResponseMessage, normalizeResponseText, pickResponseFromEvents } from './assistantResponse'
import { formatRunEventLogLine } from './runEventLog'
import { resolveWorkflowReturnText } from './builderRunResponse'

export interface BuilderRunExecutionRefs {
  abortRef: React.MutableRefObject<(() => void) | null>
  pollRef: React.MutableRefObject<number | null>
  eventsRef: React.MutableRefObject<RunEventDto[]>
  activeRunIdRef: React.MutableRefObject<string | null>
}

export interface BuilderRunExecutionCallbacks {
  appendLog: (line: string) => void
  setRunning: (running: boolean) => void
  setCancelling: (cancelling: boolean) => void
  setError: (error: string | null) => void
  setFinalResponse: (response: string) => void
  setLogLines: (lines: string[]) => void
  stopRun: () => void
}

function isTerminalRunStatus(status: string | undefined): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled'
}

export async function executeBuilderRun(
  {
    content,
    taskQueue,
    workflowId,
    workflowLabel,
    workflowType,
    tenantId,
  }: {
    content: string
    taskQueue: string
    workflowId: string
    workflowLabel: string
    workflowType: string
    tenantId: string
  },
  refs: BuilderRunExecutionRefs,
  callbacks: BuilderRunExecutionCallbacks,
): Promise<void> {
  const { abortRef, pollRef, eventsRef, activeRunIdRef } = refs
  const { appendLog, setRunning, setCancelling, setError, setFinalResponse, setLogLines, stopRun } = callbacks

  stopRun()
  activeRunIdRef.current = null
  setCancelling(false)
  setRunning(true)
  setError(null)
  setLogLines([])
  setFinalResponse('')
  eventsRef.current = []
  appendLog(`Starting workflow "${workflowLabel}" (queue: ${taskQueue}, type: ${workflowType})…`)

  try {
    const tenant = tenantId.trim() || 'default'
    const { sessionId } = await createRuntimeSession({
      tenantId: tenant,
      queueName: taskQueue,
      pipelineId: workflowId,
    })
    appendLog(`Session ${sessionId.slice(0, 8)}… created`)

    const { runId } = await sendRuntimeMessage(sessionId, content, { taskQueue })
    activeRunIdRef.current = runId
    appendLog(`Run ${runId} started`)

    abortRef.current = streamRuntimeRunEvents(
      runId,
      (event) => {
        eventsRef.current = [...eventsRef.current, event]
        appendLog(formatRunEventLogLine(event))
        const preview = normalizeResponseText(pickResponseFromEvents(eventsRef.current))
        if (preview) setFinalResponse(preview)
      },
      (err) => {
        const message = err instanceof Error ? err.message : 'Event stream error'
        setError(message)
        appendLog(`ERROR: ${message}`)
      },
    )

    pollRef.current = window.setInterval(() => {
      void (async () => {
        const run = await getRuntimeRun(runId)
        if (!run || !isTerminalRunStatus(run.status)) return
        if (pollRef.current != null) {
          window.clearInterval(pollRef.current)
          pollRef.current = null
        }
        await new Promise((resolve) => window.setTimeout(resolve, 800))
        stopRun()
        activeRunIdRef.current = null
        setCancelling(false)
        if (run.status === 'cancelled') {
          setFinalResponse('Run cancelled.')
          appendLog('Run cancelled')
          setRunning(false)
          return
        }
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
    activeRunIdRef.current = null
    setCancelling(false)
    setRunning(false)
  }
}

export async function cancelBuilderRun(
  runId: string,
  refs: BuilderRunExecutionRefs,
  callbacks: Pick<
    BuilderRunExecutionCallbacks,
    'appendLog' | 'setCancelling' | 'setError' | 'setFinalResponse' | 'setRunning' | 'stopRun'
  >,
): Promise<void> {
  const { activeRunIdRef } = refs
  const { appendLog, setCancelling, setError, setFinalResponse, setRunning, stopRun } = callbacks
  if (!runId.trim()) return

  setCancelling(true)
  appendLog('Cancelling run…')
  try {
    await cancelRuntimeRun(runId)
    appendLog('Cancel requested')
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Cancel failed'
    if (message.includes('no longer in progress')) {
      appendLog('Run already finished')
      finishBuilderRun(refs, callbacks, { response: 'Run cancelled.', logLine: 'Run cancelled' })
      return
    }
    setError(message)
    appendLog(`ERROR: ${message}`)
    setCancelling(false)
    return
  }

  finishBuilderRun(refs, callbacks, { response: 'Run cancelled.', logLine: 'Run cancelled' })
}

function finishBuilderRun(
  refs: BuilderRunExecutionRefs,
  callbacks: Pick<
    BuilderRunExecutionCallbacks,
    'appendLog' | 'setCancelling' | 'setFinalResponse' | 'setRunning' | 'stopRun'
  >,
  options?: { response?: string; logLine?: string },
): void {
  const { activeRunIdRef } = refs
  const { appendLog, setCancelling, setFinalResponse, setRunning, stopRun } = callbacks
  stopRun()
  activeRunIdRef.current = null
  setCancelling(false)
  setRunning(false)
  if (options?.response) setFinalResponse(options.response)
  if (options?.logLine) appendLog(options.logLine)
}
