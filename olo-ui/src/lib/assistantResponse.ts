/*
 * Copyright (c) 2026 Olo Labs
 * SPDX-License-Identifier: Apache-2.0
 */
import type { RunEventDto } from '../api/oloRuntime'

/** Shown only after a completed/failed run when no workflow return text could be resolved. */
export const EMPTY_RESPONSE_MESSAGE =
  "We couldn't generate a response for this run. Check the progress log and olo-worker logs."

function isWorkflowResultEvent(event: RunEventDto): boolean {
  const output = event.output as Record<string, unknown> | undefined
  const metadata = event.metadata as Record<string, unknown> | undefined
  return output?.status === 'WORKFLOW_RESULT' || metadata?.phase === 'kernel-result'
}

function isMetadataOnlyOutput(o: Record<string, unknown>): boolean {
  const keys = Object.keys(o)
  if (keys.length === 0) return true
  const metadataKeys = new Set([
    'source',
    'status',
    'phase',
    'queue',
    'graphReady',
    'variables',
    'usedAdminFallback',
    'returnVariable',
  ])
  return keys.every((k) => metadataKeys.has(k))
}

/** Extract workflow return / assistant text from node output. */
export function extractAssistantText(output: unknown): string | null {
  if (output == null) return null
  if (typeof output === 'string') return output.trim() || null
  if (typeof output !== 'object') return null
  const o = output as Record<string, unknown>

  for (const key of ['response', 'content', 'text', 'result', 'message'] as const) {
    const value = o[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  const nestedMessage = o.message
  if (nestedMessage != null && typeof nestedMessage === 'object') {
    const mc = (nestedMessage as Record<string, unknown>).content
    if (typeof mc === 'string' && mc.trim()) return mc.trim()
  }

  const returnValue = o.returnValue
  if (returnValue != null) {
    const asText = String(returnValue).trim()
    if (asText && asText !== 'null' && asText !== 'undefined') return asText
  }

  const choices = o.choices
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0] as Record<string, unknown> | undefined
    const msg = first?.message as Record<string, unknown> | undefined
    const c = msg?.content
    if (typeof c === 'string' && c.trim()) return c.trim()
  }

  return null
}

/** Resolve workflow return text from run events (kernel WORKFLOW_RESULT first). */
export function pickResponseFromEvents(events: RunEventDto[]): string | null {
  const withOutput = events.filter((e) => e.output && Object.keys(e.output).length > 0)
  const reversed = [...withOutput].reverse()

  for (const event of reversed) {
    if (!isWorkflowResultEvent(event)) continue
    const text = extractAssistantText(event.output)
    if (text) return text
  }

  for (const type of ['MODEL', 'AGENT'] as const) {
    for (const event of reversed) {
      if (event.nodeType?.toUpperCase() !== type) continue
      if (event.status?.toUpperCase() === 'FAILED') continue
      const text = extractAssistantText(event.output)
      if (text) return text
    }
  }

  for (const event of reversed) {
    if (event.nodeType?.toUpperCase() !== 'SYSTEM') continue
    if (event.status?.toUpperCase() === 'FAILED') continue
    const output = event.output as Record<string, unknown>
    if (isMetadataOnlyOutput(output)) continue
    const text = extractAssistantText(output)
    if (text) return text
  }

  return null
}

/** True when the run has a final workflow result or terminal failure (not CONTEXT_READY alone). */
export function isWorkflowFinished(events: RunEventDto[]): boolean {
  if (
    events.some(
      (e) => e.nodeType?.toUpperCase() === 'SYSTEM' && e.status?.toUpperCase() === 'FAILED',
    )
  ) {
    return true
  }
  return events.some((e) => {
    if (e.nodeType?.toUpperCase() !== 'SYSTEM' || e.status?.toUpperCase() !== 'COMPLETED') {
      return false
    }
    const output = e.output as Record<string, unknown> | undefined
    const metadata = e.metadata as Record<string, unknown> | undefined
    return (
      output?.status === 'WORKFLOW_RESULT' ||
      metadata?.phase === 'kernel-result' ||
      output?.source === 'temporal'
    )
  })
}

/** Normalize display text; returns null when there is no user-facing message. */
export function normalizeResponseText(text: string | null | undefined): string | null {
  const trimmed = text?.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const o = JSON.parse(trimmed) as Record<string, unknown>
      if (isMetadataOnlyOutput(o)) return null
      const nested = extractAssistantText(o)
      if (nested) return nested
    } catch {
      // show raw text
    }
  }
  return trimmed
}

export function fallbackResponseMessage(runStatus: string | undefined): string {
  if (runStatus === 'cancelled') {
    return 'Run cancelled.'
  }
  if (runStatus === 'failed') {
    return 'The workflow failed before a response could be generated. Check the progress log and olo-worker logs.'
  }
  return EMPTY_RESPONSE_MESSAGE
}
