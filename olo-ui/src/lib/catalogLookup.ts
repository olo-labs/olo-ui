import type { CatalogNode, CatalogParameter, StudioCatalog } from '../types/catalog'

import type { WorkflowDocument } from '../types/workflow'

import { normalizeNodeType } from './boundaryNodes'

import { findWorkflowNodeTemplate } from './workflowDesigner'

import { workflowNodeToCatalogNode } from './workflowNodeTemplates'



export function findWorkflowPreset(catalog: StudioCatalog | null, presetId: string) {

  return catalog?.workflowPresets?.find((preset) => preset.id === presetId) ?? null

}



export function findCatalogNode(

  catalog: StudioCatalog | null,

  nodeType: string,

  workflow?: WorkflowDocument | null,

): CatalogNode | null {

  const normalized = normalizeNodeType(nodeType)



  if (workflow) {

    const template = findWorkflowNodeTemplate(workflow, normalized)

    if (template) return workflowNodeToCatalogNode(workflow, template)

  }



  if (!catalog?.nodes?.length) return null

  const upper = normalized.toUpperCase()

  return (

    catalog.nodes.find((node) => node.id === nodeType || node.id === normalized)

    ?? catalog.nodes.find((node) => node.id.endsWith(`:${upper}`))

    ?? catalog.nodes.find((node) => node.id.toUpperCase().endsWith(`:${upper}`))

    ?? null

  )

}



/** Catalog preset parameters when workflow id matches a workflowPresets entry. */

export function presetParametersForWorkflow(

  catalog: StudioCatalog | null,

  workflow: WorkflowDocument,

): CatalogParameter[] {

  const preset = findWorkflowPreset(catalog, workflow.id)

  return preset?.parameters ?? []

}

