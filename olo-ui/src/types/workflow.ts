/** Subset of olo-definition WorkflowDefinition used by Studio. */



export interface NodeSize {

  width?: number

  height?: number

}

export type InlinePropertyWidget =
  | 'VARIABLE_CHECKLIST'
  | 'VARIABLE_SELECT'
  | 'WORKFLOW_PARAMETERS'
  | 'MODEL_SELECTOR'
  | 'PROVIDER_SELECTOR'

export interface InlinePropertyConfig {

  id: string

  widget: InlinePropertyWidget

  label?: string

  binding?: string

}

export interface NodeTypeDesignerConfig {

  emoji?: string

  typeLabel?: string

  description?: string

  palette?: {

    name?: string

    category?: string

    enabled?: boolean

  }

  inlineProperties?: InlinePropertyConfig[]

}

export interface WorkflowLayoutDesigner {

  originX?: number

  originY?: number

  columnGap?: number

  rowGap?: number

  columns?: number

}

export interface WorkflowCanvasDesigner {

  backgroundColor?: string

  gridGap?: number

  edgeStroke?: string

  selectionBorder?: string

  minimapNodeColor?: string

}

export interface WorkflowDesigner {

  paletteGroup?: string

  searchKeywords?: string[]

  nodeSize?: NodeSize

  resizable?: boolean

  draggable?: boolean

  layout?: WorkflowLayoutDesigner

  canvas?: WorkflowCanvasDesigner

  portColors?: Record<string, string>

  nodeTypes?: Record<string, NodeTypeDesignerConfig>

}

export interface NodeDesignerConfig {

  position?: { x?: number; y?: number }

  x?: number

  y?: number

  emoji?: string

  typeLabel?: string

  description?: string

  inlineProperties?: InlinePropertyConfig[]

}

export interface WorkflowDocument {

  id: string

  enabled?: boolean

  label?: string

  role?: string

  shortDescription?: string

  emoji?: string

  designer?: WorkflowDesigner

  queue?: string

  workflowType?: string

  runAgain?: boolean

  version?: string

  runtime?: Record<string, unknown>

  capability?: Record<string, unknown>

  parameters?: Record<string, WorkflowParameter>

  nodes?: WorkflowNode[]

  edges?: WorkflowEdge[]

  variables?: WorkflowVariable[]

  tools?: WorkflowTool[]

  hooks?: WorkflowHook[]

  childWorkflows?: ChildWorkflowRef[]

  availableAgents?: AgentReference[]

  modelProviders?: ModelProvider[]

  modelRouting?: ModelRouting[]

  prompts?: WorkflowPlannerPrompt[]

  defaultPromptId?: string

  metadata?: Record<string, unknown>

  [key: string]: unknown

}



export interface WorkflowParameter {

  type?: string

  label?: string

  description?: string

  defaultValue?: unknown

  required?: boolean

  validation?: {

    minLength?: number

    maxLength?: number

    minimum?: number

    maximum?: number

    step?: number

  }

  ui?: {

    widget?: string

    group?: string

    help?: string

    placeholder?: string

    order?: number

  }

}



export type VariableScope =
  | 'LOCAL'
  | 'READONLY_EXTERNAL'
  | 'EXTERNAL'
  | 'GLOBAL'
  | 'CREDENTIAL'

export interface WorkflowVariable {

  name: string

  type?: string

  description?: string

  defaultValue?: unknown

  required?: boolean

  scope?: VariableScope

  metadata?: Record<string, unknown>

}



export interface WorkflowTool {

  id: string

  type?: string

  capability?: {

    name?: string

    description?: string

    tags?: string[]

    examples?: string[]

    required_inputs?: string[]

    required_outputs?: string[]

    tool_requirements?: string[]

    required_context?: string[]

  }

  runtimeBinding?: {

    implementationId?: string

  }

  configuration?: Record<string, unknown>

}



export interface WorkflowHook {

  id: string

  pattern: string

  pre?: { implementationId?: string }

  onError?: { implementationId?: string }

  finally?: { implementationId?: string }

}



export interface ChildWorkflowRef {

  workflowId: string

  workflowVersion?: string

}



export interface AgentReference {

  id: string

}



export type WorkflowPlannerPromptParameterType = 'string' | 'number' | 'boolean' | 'object'

export interface WorkflowPlannerPromptParameter {

  name: string

  type?: WorkflowPlannerPromptParameterType

  required?: boolean

}

export interface WorkflowPlannerPrompt {

  id: string

  name: string

  promptTemplate: string

  /** @deprecated Derived from workflow {@code variables[]} at runtime — not persisted on prompts. */
  parameters?: WorkflowPlannerPromptParameter[]

}

export interface ModelProvider {

  id: string

  provider: string

  model?: string

  configuration?: Record<string, unknown>

}



export interface ModelRoutingRule {

  name?: string

  providerId?: string

  match?: Record<string, unknown>

}

export interface ModelRouting {

  id?: string

  defaultProviderId?: string

  rules?: ModelRoutingRule[]

  metadata?: Record<string, unknown>

}



export interface WorkflowNode {

  id: string

  type: string

  label?: string

  configuration?: Record<string, unknown>

  ports?: WorkflowPort[]

  reads?: unknown[]

  writes?: unknown[]

}



export interface WorkflowPort {

  id: string

  label?: string

  name?: string

  schema?: string

  type?: string

  acceptType?: string | string[]

  direction?: string

  shortDescription?: string

  required?: boolean

  minConnections?: number

  maxConnections?: number | null

  ui?: {

    position?: string

    color?: string

  }

}



export interface WorkflowEdge {

  sourceNodeId?: string

  targetNodeId?: string

  sourcePortId?: string

  targetPortId?: string

  from?: string

  to?: string

  source?: string

  target?: string

}



export interface WorkflowSummary {

  fileName: string

  id: string | null

  label: string | null

  description?: string | null

  queue?: string | null

  workflowType?: string | null

}


