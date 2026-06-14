import { describe, expect, it } from 'vitest'
import { edgeTooltipText, nodeTooltipLines } from './canvasLabels'
import type { CatalogFlowNodeData } from './workflowGraph'

describe('canvasLabels', () => {
  it('builds node tooltip lines', () => {
    const data: CatalogFlowNodeData = {
      label: 'Start',
      workflowType: 'START',
    }
    expect(nodeTooltipLines('start', data, { id: 'olo-core:START', description: 'Entry point' })).toEqual([
      'Start',
      'Start · start',
      'Entry point',
    ])
  })

  it('builds edge tooltip text', () => {
    const nodes = [
      {
        id: 'start',
        position: { x: 0, y: 0 },
        data: { label: 'Start', workflowType: 'START' },
      },
      {
        id: 'agent',
        position: { x: 100, y: 0 },
        data: { label: 'Agent', workflowType: 'AGENT' },
      },
    ]
    expect(
      edgeTooltipText(
        { source: 'start', target: 'agent', sourceHandle: 'out', targetHandle: 'in' },
        nodes,
      ),
    ).toBe('Start (out) → Agent (in)')
  })
})
