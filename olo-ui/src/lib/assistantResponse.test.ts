/*
 * Copyright (c) 2026 Olo Labs
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest'
import {
  EMPTY_RESPONSE_MESSAGE,
  extractAssistantText,
  fallbackResponseMessage,
  normalizeResponseText,
  pickResponseFromEvents,
} from './assistantResponse'
import type { RunEventDto } from '../api/oloRuntime'

describe('extractAssistantText', () => {
  it('reads workflow response and returnValue', () => {
    expect(extractAssistantText({ response: 'hello' })).toBe('hello')
    expect(extractAssistantText({ returnValue: 42 })).toBe('42')
  })

  it('ignores metadata-only temporal output', () => {
    expect(extractAssistantText({ source: 'temporal' })).toBeNull()
  })
})

describe('pickResponseFromEvents', () => {
  it('prefers WORKFLOW_RESULT over later empty temporal SYSTEM event', () => {
    const events: RunEventDto[] = [
      {
        runId: 'r1',
        nodeId: 'kernel',
        nodeType: 'SYSTEM',
        status: 'COMPLETED',
        timestamp: 1,
        output: { status: 'WORKFLOW_RESULT', response: 'workflow answer' },
        metadata: { phase: 'kernel-result' },
      },
      {
        runId: 'r1',
        nodeId: 'root',
        nodeType: 'SYSTEM',
        status: 'COMPLETED',
        timestamp: 2,
        output: { source: 'temporal' },
      },
    ]
    expect(pickResponseFromEvents(events)).toBe('workflow answer')
  })
})

describe('normalizeResponseText', () => {
  it('returns null for empty text', () => {
    expect(normalizeResponseText('')).toBeNull()
    expect(normalizeResponseText('  answer  ')).toBe('answer')
  })
})

describe('fallbackResponseMessage', () => {
  it('uses different copy for failed runs', () => {
    expect(fallbackResponseMessage('completed')).toBe(EMPTY_RESPONSE_MESSAGE)
    expect(fallbackResponseMessage('failed')).toContain('failed')
  })
})
