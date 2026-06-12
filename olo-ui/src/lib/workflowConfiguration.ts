import type { WorkflowDocument } from '../types/workflow'

export function parseWorkflowJson(text: string): WorkflowDocument {
  const parsed = JSON.parse(text) as unknown
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Workflow JSON must be an object')
  }
  const doc = parsed as WorkflowDocument
  if (!doc.id || typeof doc.id !== 'string') {
    throw new Error('Workflow JSON must include string "id"')
  }
  return doc
}

export function workflowFileName(doc: WorkflowDocument): string {
  return `${doc.id}.json`
}

export function downloadWorkflowJson(doc: WorkflowDocument, fileName?: string): void {
  const name = fileName ?? workflowFileName(doc)
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function readWorkflowFile(file: File): Promise<WorkflowDocument> {
  const text = await file.text()
  return parseWorkflowJson(text)
}
