import { create } from 'zustand'
import * as api from '../api/rest'
import { normalizeWorkflowBoundaries } from '../lib/boundaryNodes'
import { ensureWorkflowModelInfrastructure } from '../lib/workflowModelProviders'
import { workflowFileName } from '../lib/workflowConfiguration'
import { normalizeWorkflowDocumentEmoji } from '../lib/workflowEmoji'
import type { WorkflowDocument, WorkflowSummary } from '../types/workflow'

export interface WorkflowConfigurationState {
  workflows: WorkflowSummary[]
  configurationRoot: string
  loading: boolean
  error: string | null
  selectedFileName: string | null
  draft: WorkflowDocument | null
  dirty: boolean
  selectedCanvasNodeId: string | null

  loadWorkflows: () => Promise<void>
  selectWorkflow: (fileName: string) => Promise<void>
  importWorkflow: (document: WorkflowDocument, fileName?: string) => Promise<void>
  updateDraft: (document: WorkflowDocument) => void
  setSelectedCanvasNodeId: (nodeId: string | null) => void
  saveDraft: () => Promise<void>
  exportSelected: () => WorkflowDocument | null
  deleteSelected: () => Promise<void>
  clearSelection: () => void
}

export const workflowConfigurationStore = create<WorkflowConfigurationState>((set, get) => ({
  workflows: [],
  configurationRoot: '',
  loading: false,
  error: null,
  selectedFileName: null,
  draft: null,
  dirty: false,
  selectedCanvasNodeId: null,

  loadWorkflows: async () => {
    set({ loading: true, error: null })
    try {
      const [workflows, configurationRoot] = await Promise.all([
        api.listWorkflowConfigurations(),
        api.getConfigurationRoot(),
      ])
      set({ workflows, configurationRoot, loading: false })
    } catch (e) {
      set({
        workflows: [],
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load workflows',
      })
    }
  },

  selectWorkflow: async (fileName) => {
    set({ loading: true, error: null })
    try {
      const document = ensureWorkflowModelInfrastructure(
        normalizeWorkflowBoundaries(await api.getWorkflowConfiguration(fileName)),
      )
      set({
        selectedFileName: fileName,
        draft: document,
        dirty: false,
        loading: false,
      })
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to open workflow',
      })
    }
  },

  importWorkflow: async (document, fileName) => {
    const target = fileName ?? workflowFileName(document)
    set({ loading: true, error: null })
    try {
      await api.saveWorkflowConfiguration(
        target,
        normalizeWorkflowDocumentEmoji(
          ensureWorkflowModelInfrastructure(normalizeWorkflowBoundaries(document)),
        ),
      )
      await get().loadWorkflows()
      await get().selectWorkflow(target)
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to import workflow',
      })
      throw e
    }
  },

  updateDraft: (document) => set({ draft: document, dirty: true }),

  setSelectedCanvasNodeId: (nodeId) => set({ selectedCanvasNodeId: nodeId }),

  saveDraft: async () => {
    const { draft, selectedFileName } = get()
    if (!draft || !selectedFileName) return
    set({ loading: true, error: null })
    try {
      await api.saveWorkflowConfiguration(
        selectedFileName,
        normalizeWorkflowDocumentEmoji(
          ensureWorkflowModelInfrastructure(normalizeWorkflowBoundaries(draft)),
        ),
      )
      set({ dirty: false, loading: false })
      await get().loadWorkflows()
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to save workflow',
      })
      throw e
    }
  },

  exportSelected: () => get().draft,

  deleteSelected: async () => {
    const { selectedFileName } = get()
    if (!selectedFileName) return
    set({ loading: true, error: null })
    try {
      await api.deleteWorkflowConfiguration(selectedFileName)
      set({ selectedFileName: null, draft: null, dirty: false, loading: false })
      await get().loadWorkflows()
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to delete workflow',
      })
    }
  },

  clearSelection: () =>
    set({ selectedFileName: null, draft: null, dirty: false, selectedCanvasNodeId: null }),
}))
