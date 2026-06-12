import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PROMPT_ID,
  DEFAULT_PROMPT_TEMPLATE,
  PLANNER_MACRO_CAPABILITIES,
  addPlannerPrompt,
  applyAgentPromptRef,
  applyPlannerContext,
  extractPromptPlaceholders,
  generatePlannerPrompt,
  plannerParametersFromVariables,
  readAgentPromptRef,
  readPlannerContext,
  removePlannerPrompt,
  togglePlannerAgent,
  togglePlannerTool,
  togglePlannerVariable,
  updatePlannerContext,
  validatePromptTemplate,
} from './plannerContext'
import type { WorkflowDocument } from '../types/workflow'

const catalogTools = [
  {
    id: 'olo-core:web-search',
    kind: 'TOOL',
    name: 'Web Search',
    description: 'Search public information',
  },
  {
    id: 'olo-core:http-tool',
    kind: 'TOOL',
    name: 'HTTP',
    description: 'Call external APIs',
  },
  {
    id: 'olo-core:calculator',
    kind: 'TOOL',
    name: 'Calculator',
    description: 'Basic arithmetic',
  },
]

const baseDoc: WorkflowDocument = {
  id: 'agent',
  variables: [],
  tools: [],
  availableAgents: [],
  capability: { required_context: [] },
  metadata: {},
}

const emptyContextDoc: WorkflowDocument = {
  ...baseDoc,
  variables: [
    { name: 'message', type: 'string', scope: 'EXTERNAL', required: true },
    { name: 'ReturnValue', type: 'string', scope: 'LOCAL' },
  ],
  prompts: [
    {
      id: DEFAULT_PROMPT_ID,
      name: 'Default planner prompt',
      promptTemplate: 'Investigate {message}',
    },
  ],
  defaultPromptId: DEFAULT_PROMPT_ID,
  metadata: {
    plannerContext: {
      selectedTools: [],
      selectedAgents: [],
      injectCapabilities: true,
      injectAgents: true,
    },
  },
}

describe('plannerContext', () => {
  it('reads prompts without embedded parameters', () => {
    const doc: WorkflowDocument = {
      ...baseDoc,
      prompts: [
        {
          id: 'research',
          name: 'Research prompt',
          promptTemplate: 'Investigate {message}',
        },
      ],
      defaultPromptId: 'research',
      variables: [{ name: 'message', type: 'string', required: true }],
      metadata: {
        plannerContext: {
          selectedTools: ['olo-core:http-tool'],
          selectedAgents: ['planner'],
          injectCapabilities: true,
          injectAgents: false,
        },
      },
    }
    expect(readPlannerContext(doc).prompts[0]).toEqual({
      id: 'research',
      name: 'Research prompt',
      promptTemplate: 'Investigate {message}',
    })
  })

  it('derives prompt parameters from workflow variables', () => {
    expect(plannerParametersFromVariables(emptyContextDoc)).toEqual([
      { name: 'message', type: 'string', required: true },
      { name: 'ReturnValue', type: 'string', required: false },
    ])
  })

  it('validates placeholders against workflow variables', () => {
    const issues = validatePromptTemplate('Investigate {message} for {customerId}', emptyContextDoc)
    expect(issues.some((issue) => issue.code === 'dangling-placeholder')).toBe(true)

    const missing = validatePromptTemplate('Do work', emptyContextDoc)
    expect(missing.some((issue) => issue.code === 'missing-in-prompt')).toBe(true)

    const ok = validatePromptTemplate('Investigate {message}', emptyContextDoc)
    expect(ok).toHaveLength(0)
  })

  it('expands capability and agent macros in generated prompt', () => {
    const prompt = {
      id: 'p1',
      name: 'Prompt',
      promptTemplate: `Task:\nInvestigate {message}\n\n{${PLANNER_MACRO_CAPABILITIES}}\n\n{AGENTS}`,
    }
    const context = {
      selectedTools: ['olo-core:http-tool'],
      selectedAgents: ['planner'],
      injectCapabilities: true,
      injectAgents: true,
    }
    const text = generatePlannerPrompt(prompt, context, catalogTools, [
      { id: 'planner', label: 'Research Agent', description: 'Researches topics' },
    ])
    expect(text).toContain('HTTP')
    expect(text).toContain('Research Agent')
    expect(extractPromptPlaceholders(prompt.promptTemplate)).toContain('message')
  })

  it('adds and removes planner prompts', () => {
    let doc = addPlannerPrompt(emptyContextDoc, catalogTools)
    expect(readPlannerContext(doc).prompts).toHaveLength(2)
    const added = readPlannerContext(doc).prompts[1]
    doc = removePlannerPrompt(doc, added.id, catalogTools)
    expect(readPlannerContext(doc).prompts).toHaveLength(1)
  })

  it('does not persist parameters on prompts when saving', () => {
    const doc = applyPlannerContext(
      {
        ...emptyContextDoc,
        prompts: [
          {
            id: DEFAULT_PROMPT_ID,
            name: 'Default',
            promptTemplate: DEFAULT_PROMPT_TEMPLATE,
            parameters: [{ name: 'legacy', type: 'string', required: true }],
          },
        ],
      },
      readPlannerContext(emptyContextDoc),
      catalogTools,
    )
    expect(doc.prompts?.[0]).toEqual({
      id: DEFAULT_PROMPT_ID,
      name: 'Default planner prompt',
      promptTemplate: 'Investigate {message}',
    })
    expect(doc.prompts?.[0]).not.toHaveProperty('parameters')
  })

  it('enables catalog tools when a capability is selected', () => {
    const doc = togglePlannerTool(emptyContextDoc, 'olo-core:calculator', true, catalogTools)
    expect(readPlannerContext(doc).selectedTools).toEqual(['olo-core:calculator'])
    expect(doc.tools).toHaveLength(1)
  })

  it('syncs selected workflow variables to required_context', () => {
    const doc = togglePlannerVariable(emptyContextDoc, 'message', true, catalogTools)
    expect(readPlannerContext(doc).selectedVariables).toEqual(['message'])
    expect(doc.capability?.required_context).toEqual(['message'])
  })

  it('stores and reads agent promptRef on nodes', () => {
    const doc: WorkflowDocument = {
      ...emptyContextDoc,
      nodes: [{ id: 'agent-1', type: 'AGENT', configuration: {} }],
    }
    const withRef = applyAgentPromptRef(doc, 'agent-1', DEFAULT_PROMPT_ID)
    expect(withRef.nodes?.[0].configuration?.promptRef).toBe(DEFAULT_PROMPT_ID)
    expect(readAgentPromptRef(withRef.nodes![0], withRef)).toBe(DEFAULT_PROMPT_ID)
  })

  it('applyPlannerContext writes metadata and agents', () => {
    const doc = applyPlannerContext(
      baseDoc,
      {
        prompts: [
          {
            id: DEFAULT_PROMPT_ID,
            name: 'Default',
            promptTemplate: DEFAULT_PROMPT_TEMPLATE,
          },
        ],
        defaultPromptId: DEFAULT_PROMPT_ID,
        selectedVariables: ['message'],
        selectedTools: ['olo-core:calculator'],
        selectedAgents: ['reviewer'],
        injectCapabilities: true,
        injectAgents: true,
      },
      catalogTools,
    )
    expect(doc.prompts?.[0]?.id).toBe(DEFAULT_PROMPT_ID)
    expect(doc.defaultPromptId).toBe(DEFAULT_PROMPT_ID)
    expect(doc.metadata?.plannerContext).toMatchObject({
      selectedVariables: ['message'],
      selectedAgents: ['reviewer'],
      selectedTools: ['olo-core:calculator'],
    })
    expect(doc.availableAgents).toEqual([{ id: 'reviewer' }])
    expect(doc.tools).toHaveLength(1)
  })

  it('toggles planner agents', () => {
    const doc = togglePlannerAgent(emptyContextDoc, 'planner', true, catalogTools)
    expect(readPlannerContext(doc).selectedAgents).toEqual(['planner'])
    expect(doc.availableAgents).toEqual([{ id: 'planner' }])
  })
})
