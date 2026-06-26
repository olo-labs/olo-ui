import { create } from 'zustand'
import * as api from '../api/rest'
import { normalizeWorkflowBoundaries } from '../lib/boundaryNodes'
import { ensureWorkflowModelInfrastructure } from '../lib/workflowModelProviders'
import {
  copyWorkflowPath,
  duplicateWorkflowDocument,
  workflowFileName,
} from '../lib/workflowConfiguration'
import { normalizeWorkflowDocumentEmoji } from '../lib/workflowEmoji'
import { getLastWorkflowFileName, setLastWorkflowFileName } from '../lib/lastWorkflow'
import {
  isWorkflowDraftDirty,
  normalizeWorkflowDraft,
  workflowDraftSnapshot,
} from '../lib/workflowDraftSnapshot'
import type { WorkflowDocument, WorkflowSummary } from '../types/workflow'

export interface WorkflowConfigurationState {
  workflows: WorkflowSummary[]
  configurationRoot: string
  loading: boolean
  error: string | null
  selectedFileName: string | null
  draft: WorkflowDocument | null
  dirty: boolean
  savedSnapshot: string | null
  selectedCanvasNodeId: string | null

  loadWorkflows: () => Promise<void>
  reloadFromDisk: () => Promise<void>
  selectWorkflow: (fileName: string) => Promise<void>
  importWorkflow: (document: WorkflowDocument, fileName?: string) => Promise<void>
  updateDraft: (document: WorkflowDocument) => void
  setSelectedCanvasNodeId: (nodeId: string | null) => void
  saveDraft: () => Promise<void>
  exportSelected: () => WorkflowDocument | null
  deleteSelected: () => Promise<void>
  deleteWorkflow: (fileName: string) => Promise<void>
  copyWorkflow: (fileName: string) => Promise<void>
  renameWorkflow: (fileName: string, newFileName: string) => Promise<void>
  exportWorkflow: (fileName: string) => Promise<WorkflowDocument>
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
  savedSnapshot: null,
  selectedCanvasNodeId: null,

  loadWorkflows: async () => {
    set({ loading: true, error: null })
    try {
      const [workflows, configurationRoot] = await Promise.all([
        api.listWorkflowConfigurations(),
        api.getConfigurationRoot(),
      ])
      set({ workflows, configurationRoot, loading: false })
      const { selectedFileName } = get()
      if (!selectedFileName) {
        const lastFileName = getLastWorkflowFileName()
        if (lastFileName && workflows.some((workflow) => workflow.fileName === lastFileName)) {
          await get().selectWorkflow(lastFileName)
        }
      }
    } catch (e) {
      set({
        workflows: [],
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load workflows',
      })
    }
  },

  reloadFromDisk: async () => {
    const { selectedFileName } = get()
    await get().loadWorkflows()
    if (selectedFileName) {
      await get().selectWorkflow(selectedFileName)
    }
  },

  selectWorkflow: async (fileName) => {
    set({ loading: true, error: null })
    try {
      const document = normalizeWorkflowDraft(await api.getWorkflowConfiguration(fileName))
      const savedSnapshot = workflowDraftSnapshot(document)
      set({
        selectedFileName: fileName,
        draft: document,
        dirty: false,
        savedSnapshot,
        loading: false,
      })
      setLastWorkflowFileName(fileName)
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

  updateDraft: (document) => {
    const { savedSnapshot } = get()
    set({
      draft: document,
      dirty: isWorkflowDraftDirty(document, savedSnapshot),
    })
  },

  setSelectedCanvasNodeId: (nodeId) => set({ selectedCanvasNodeId: nodeId }),

  saveDraft: async () => {
    const { draft, selectedFileName } = get()
    if (!draft || !selectedFileName) return
    set({ loading: true, error: null })
    try {
      const normalized = normalizeWorkflowDraft(draft)
      const savedSnapshot = workflowDraftSnapshot(normalized)
      await api.saveWorkflowConfiguration(selectedFileName, normalized)
      set({ draft: normalized, dirty: false, savedSnapshot, loading: false })
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
    await get().deleteWorkflow(selectedFileName)
  },

  deleteWorkflow: async (fileName) => {
    set({ loading: true, error: null })
    try {
      await api.deleteWorkflowConfiguration(fileName)
      const { selectedFileName } = get()
      if (selectedFileName === fileName) {
        set({ selectedFileName: null, draft: null, dirty: false, savedSnapshot: null })
        setLastWorkflowFileName('')
      } else if (getLastWorkflowFileName() === fileName) {
        setLastWorkflowFileName('')
      }
      set({ loading: false })
      await get().loadWorkflows()
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to delete workflow',
      })
      throw e
    }
  },

  copyWorkflow: async (fileName) => {
    set({ loading: true, error: null })
    try {
      const document = normalizeWorkflowBoundaries(await api.getWorkflowConfiguration(fileName))
      const { workflows } = get()
      const target = copyWorkflowPath(
        fileName,
        workflows.map((workflow) => workflow.fileName),
      )
      const cloned = duplicateWorkflowDocument(document, target)
      await api.saveWorkflowConfiguration(
        target,
        normalizeWorkflowDocumentEmoji(
          ensureWorkflowModelInfrastructure(normalizeWorkflowBoundaries(cloned)),
        ),
      )
      await get().loadWorkflows()
      await get().selectWorkflow(target)
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to duplicate workflow',
      })
      throw e
    }
  },

  renameWorkflow: async (fileName, newFileName) => {
    if (fileName === newFileName) return
    set({ loading: true, error: null })
    try {
      const document = await api.getWorkflowConfiguration(fileName)
      await api.saveWorkflowConfiguration(newFileName, document)
      await api.deleteWorkflowConfiguration(fileName)
      await get().loadWorkflows()
      await get().selectWorkflow(newFileName)
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to rename workflow',
      })
      throw e
    }
  },

  exportWorkflow: async (fileName) => {
    const { selectedFileName, draft } = get()
    if (selectedFileName === fileName && draft) {
      return draft
    }
    return ensureWorkflowModelInfrastructure(
      normalizeWorkflowBoundaries(await api.getWorkflowConfiguration(fileName)),
    )
  },

  clearSelection: () =>
    set({ selectedFileName: null, draft: null, dirty: false, savedSnapshot: null, selectedCanvasNodeId: null }),
}))
