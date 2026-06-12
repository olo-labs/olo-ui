import { describe, expect, it } from 'vitest'
import { parseWorkflowJson, workflowFileName } from './workflowConfiguration'

describe('parseWorkflowJson', () => {
  it('parses a minimal workflow document', () => {
    const doc = parseWorkflowJson('{"id":"agent","enabled":true,"label":"Agent"}')
    expect(doc.id).toBe('agent')
    expect(doc.enabled).toBe(true)
    expect(doc.label).toBe('Agent')
  })

  it('rejects non-object JSON', () => {
    expect(() => parseWorkflowJson('[]')).toThrow(/object/)
  })

  it('requires string id', () => {
    expect(() => parseWorkflowJson('{"label":"x"}')).toThrow(/id/)
  })
})

describe('workflowFileName', () => {
  it('derives file name from workflow id', () => {
    expect(workflowFileName({ id: 'agent' })).toBe('agent.json')
  })
})
