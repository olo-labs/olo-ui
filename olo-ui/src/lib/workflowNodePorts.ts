import type { CatalogComponentBase, StudioCatalog } from '../types/catalog'
import type { WorkflowPort } from '../types/workflow'

export const MESSAGE_WIRE = 'message'
export const CAPABILITIES_WIRE = 'capabilities'
export const AGENT_PLUG_WIRE = 'agent-plug'

export const CAPABILITIES_PORT_ID = 'capabilities'
export const AGENT_PLUG_PORT_ID = 'agentPlug'

export const MESSAGE_PORT_COLOR = '#ef4444'
export const CAPABILITIES_PORT_COLOR = '#22c55e'
export const AGENT_PLUG_PORT_COLOR = '#a855f7'
/** Message ports on plugin nodes — wired by the planner/agent at runtime, not on the canvas. */
export const PLANNER_ROUTED_MESSAGE_PORT_COLOR = '#71717a'

export const MESSAGE_IN_PORT_ID = 'in'
export const MESSAGE_OUT_PORT_ID = 'out'

/** Canonical AGENT host ports — mirrors WorkflowBuilder.agentNode() / agent.json presets. */
export const AGENT_HOST_PORTS: WorkflowPort[] = [
  {
    id: 'in',
    label: 'message in',
    schema: 'message',
    type: 'message',
    acceptType: 'message',
    direction: 'INPUT',
    required: true,
    minConnections: 1,
    maxConnections: 1,
    shortDescription: 'Incoming workflow message',
    ui: { position: 'LEFT', color: MESSAGE_PORT_COLOR },
  },
  {
    id: CAPABILITIES_PORT_ID,
    label: 'available tools',
    schema: CAPABILITIES_WIRE,
    type: CAPABILITIES_WIRE,
    acceptType: CAPABILITIES_WIRE,
    direction: 'INPUT',
    required: false,
    minConnections: 0,
    shortDescription: 'Tools and hooks registered for runtime prompt assembly (0 or more)',
    ui: { position: 'BOTTOM', color: CAPABILITIES_PORT_COLOR },
  },
  {
    id: AGENT_PLUG_PORT_ID,
    label: 'available agents',
    schema: AGENT_PLUG_WIRE,
    type: AGENT_PLUG_WIRE,
    acceptType: AGENT_PLUG_WIRE,
    direction: 'INPUT',
    required: false,
    minConnections: 0,
    shortDescription: 'Child workflows registered for runtime prompt assembly (0 or more)',
    ui: { position: 'BOTTOM', color: AGENT_PLUG_PORT_COLOR },
  },
  {
    id: 'out',
    label: 'message out',
    schema: 'message',
    type: 'message',
    direction: 'OUTPUT',
    required: false,
    minConnections: 0,
    shortDescription: 'Outgoing workflow message',
    ui: { position: 'RIGHT', color: MESSAGE_PORT_COLOR },
  },
]

/** Grayed message in/out on plugin nodes — shown for context, wired by planner at runtime. */
export const PLANNER_ROUTED_MESSAGE_PORTS: WorkflowPort[] = [
  {
    id: MESSAGE_IN_PORT_ID,
    label: 'message in',
    schema: MESSAGE_WIRE,
    type: MESSAGE_WIRE,
    acceptType: MESSAGE_WIRE,
    direction: 'INPUT',
    required: false,
    minConnections: 0,
    shortDescription: 'Incoming message (routed by planner/agent at runtime)',
    ui: { position: 'LEFT', color: PLANNER_ROUTED_MESSAGE_PORT_COLOR },
  },
  {
    id: MESSAGE_OUT_PORT_ID,
    label: 'message out',
    schema: MESSAGE_WIRE,
    type: MESSAGE_WIRE,
    direction: 'OUTPUT',
    required: false,
    minConnections: 0,
    shortDescription: 'Outgoing message (routed by planner/agent at runtime)',
    ui: { position: 'RIGHT', color: PLANNER_ROUTED_MESSAGE_PORT_COLOR },
  },
]

/** Plugin output on tool/hook canvas nodes — top boundary indicator for agent prompt assembly. */
export const CAPABILITY_PLUGIN_PORTS: WorkflowPort[] = [
  {
    id: CAPABILITIES_PORT_ID,
    label: 'available tools',
    schema: CAPABILITIES_WIRE,
    type: CAPABILITIES_WIRE,
    direction: 'OUTPUT',
    required: false,
    minConnections: 0,
    shortDescription: 'Capability indicator for runtime prompt assembly on a connected agent',
    ui: { position: 'TOP', color: CAPABILITIES_PORT_COLOR },
  },
]

/** Plugin output on delegate child-workflow nodes — top boundary indicator for agent prompt assembly. */
export const AGENT_PLUGIN_PORTS: WorkflowPort[] = [
  {
    id: AGENT_PLUG_PORT_ID,
    label: 'available agents',
    schema: AGENT_PLUG_WIRE,
    type: AGENT_PLUG_WIRE,
    direction: 'OUTPUT',
    required: false,
    minConnections: 0,
    shortDescription: 'Child workflow indicator for runtime prompt assembly on a connected agent',
    ui: { position: 'TOP', color: AGENT_PLUG_PORT_COLOR },
  },
]

export type CanvasPortProfileName = 'CAPABILITY_PLUGIN' | 'AGENT_PLUGIN' | 'PLANNER_HOST'

/** Map catalog port descriptors to workflow ports (annotation export only — no UI fallbacks). */
export function catalogComponentToPorts(item: CatalogComponentBase): WorkflowPort[] {
  const ports: WorkflowPort[] = []
  for (const input of item.inputs ?? []) {
    ports.push(mapCatalogPort(input, 'INPUT'))
  }
  for (const output of item.outputs ?? []) {
    ports.push(mapCatalogPort(output, 'OUTPUT'))
  }
  return ports
}

/** Merge catalog ports missing from persisted workflow JSON (annotation is source of truth). */
export function mergeMissingCatalogPorts(
  workflowPorts: WorkflowPort[] | undefined,
  catalogPorts: WorkflowPort[],
): WorkflowPort[] {
  const ports = [...(workflowPorts ?? [])]
  const portIds = new Set(ports.map((port) => `${port.direction}:${port.id}`))
  for (const catalogPort of catalogPorts) {
    const key = `${catalogPort.direction}:${catalogPort.id}`
    if (!portIds.has(key)) {
      ports.push(catalogPort)
      portIds.add(key)
    }
  }
  return ports
}

/** Ensure AGENT nodes expose annotation-defined plugin inputs when workflow JSON is stale. */
export function resolveAgentHostPorts(
  workflowType: string,
  workflowPorts: WorkflowPort[] | undefined,
  catalogPorts: WorkflowPort[],
): WorkflowPort[] {
  if (workflowType.toUpperCase() !== 'AGENT') {
    return workflowPorts ?? []
  }
  const merged = mergeMissingCatalogPorts(workflowPorts, catalogPorts)
  const withDefaults = mergeMissingCatalogPorts(merged, AGENT_HOST_PORTS)
  return syncAgentHostPortLayout(withDefaults)
}

function syncCanonicalPortLayout(
  ports: WorkflowPort[],
  canonicalPorts: WorkflowPort[],
): WorkflowPort[] {
  const canonical = new Map(
    canonicalPorts.map((port) => [`${port.direction}:${port.id}`, port]),
  )
  return ports.map((port) => {
    const reference = canonical.get(`${port.direction}:${port.id}`)
    if (!reference) return port
    return {
      ...port,
      label: reference.label,
      schema: reference.schema,
      type: reference.type,
      acceptType: reference.acceptType,
      required: reference.required,
      minConnections: reference.minConnections,
      maxConnections: reference.maxConnections,
      shortDescription: reference.shortDescription ?? port.shortDescription,
      ui: {
        ...port.ui,
        position: reference.ui?.position,
        color: reference.ui?.color ?? port.ui?.color,
      },
    }
  })
}

function syncAgentHostPortLayout(ports: WorkflowPort[]): WorkflowPort[] {
  return syncCanonicalPortLayout(ports, AGENT_HOST_PORTS)
}

export function isDelegateAgentNode(configuration?: Record<string, unknown> | null): boolean {
  return typeof configuration?.delegateAgentId === 'string' && configuration.delegateAgentId.length > 0
}

/** Tool, hook, and delegate child-workflow nodes route message flow through the planner/agent. */
export function usesPlannerRoutedMessagePorts(
  workflowType: string,
  configuration?: Record<string, unknown> | null,
): boolean {
  const normalized = workflowType.toUpperCase()
  if (normalized === 'TOOL' || normalized === 'HOOK') return true
  if (normalized === 'AGENT' && isDelegateAgentNode(configuration)) return true
  return false
}

export function isMessagePortId(portId?: string | null): boolean {
  return portId === MESSAGE_IN_PORT_ID || portId === MESSAGE_OUT_PORT_ID
}

export function isPlannerRoutedMessagePort(
  workflowType: string,
  portId: string | null | undefined,
  configuration?: Record<string, unknown> | null,
): boolean {
  return usesPlannerRoutedMessagePorts(workflowType, configuration) && isMessagePortId(portId)
}

/** Ensure TOOL/HOOK nodes expose grayed message in/out plus top-aligned plugin output. */
export function resolveCapabilityPluginPorts(
  workflowType: string,
  workflowPorts: WorkflowPort[] | undefined,
  catalogPorts: WorkflowPort[],
): WorkflowPort[] {
  const normalized = workflowType.toUpperCase()
  if (normalized !== 'TOOL' && normalized !== 'HOOK') {
    return workflowPorts ?? []
  }
  const merged = mergeMissingCatalogPorts(workflowPorts, catalogPorts)
  const withMessages = mergeMissingCatalogPorts(merged, PLANNER_ROUTED_MESSAGE_PORTS)
  const withDefaults = mergeMissingCatalogPorts(withMessages, CAPABILITY_PLUGIN_PORTS)
  const syncedMessages = syncCanonicalPortLayout(withDefaults, PLANNER_ROUTED_MESSAGE_PORTS)
  return syncCanonicalPortLayout(syncedMessages, CAPABILITY_PLUGIN_PORTS)
}

/** Ensure delegate child-workflow AGENT nodes expose grayed message in/out plus top agentPlug output. */
export function resolveAgentPluginPorts(
  workflowPorts: WorkflowPort[] | undefined,
  catalogPorts: WorkflowPort[],
): WorkflowPort[] {
  const merged = mergeMissingCatalogPorts(workflowPorts, catalogPorts)
  const withMessages = mergeMissingCatalogPorts(merged, PLANNER_ROUTED_MESSAGE_PORTS)
  const withDefaults = mergeMissingCatalogPorts(withMessages, AGENT_PLUGIN_PORTS)
  const syncedMessages = syncCanonicalPortLayout(withDefaults, PLANNER_ROUTED_MESSAGE_PORTS)
  return syncCanonicalPortLayout(syncedMessages, AGENT_PLUGIN_PORTS)
}

export function resolveNodePorts(
  workflowType: string,
  workflowPorts: WorkflowPort[] | undefined,
  catalogPorts: WorkflowPort[],
  configuration?: Record<string, unknown> | null,
): WorkflowPort[] {
  const normalized = workflowType.toUpperCase()
  if (normalized === 'AGENT') {
    if (isDelegateAgentNode(configuration)) {
      return resolveAgentPluginPorts(workflowPorts, catalogPorts)
    }
    return resolveAgentHostPorts(normalized, workflowPorts, catalogPorts)
  }
  if (normalized === 'TOOL' || normalized === 'HOOK') {
    return resolveCapabilityPluginPorts(normalized, workflowPorts, catalogPorts)
  }
  return workflowPorts ?? []
}

function mapCatalogPort(
  port: NonNullable<CatalogComponentBase['inputs']>[number],
  direction: 'INPUT' | 'OUTPUT',
): WorkflowPort {
  const wireType = port.type ?? port.schema ?? 'any'
  const wireColor = portColorForWire(wireType)
  return {
    id: port.id,
    label: port.label ?? port.name ?? port.id,
    name: port.name ?? port.id,
    shortDescription: port.shortDescription ?? port.description,
    schema: port.schema ?? 'any',
    type: wireType,
    acceptType: port.acceptType ?? (direction === 'INPUT' ? port.type ?? port.schema : undefined),
    direction,
    required: port.required,
    minConnections: port.minConnections,
    maxConnections: port.maxConnections,
    ui: {
      position: port.ui?.position ?? (direction === 'INPUT' ? 'LEFT' : 'RIGHT'),
      color: port.ui?.color ?? wireColor,
    },
  }
}

function portColorForWire(wireType: string): string | undefined {
  switch (wireType.trim().toLowerCase()) {
    case MESSAGE_WIRE:
      return MESSAGE_PORT_COLOR
    case CAPABILITIES_WIRE:
      return CAPABILITIES_PORT_COLOR
    case AGENT_PLUG_WIRE:
      return AGENT_PLUG_PORT_COLOR
    default:
      return undefined
  }
}

export type PortSide = 'LEFT' | 'RIGHT' | 'TOP' | 'BOTTOM'

export function resolvePortSide(port: WorkflowPort): PortSide {
  const position = port.ui?.position?.toUpperCase()
  if (position === 'TOP' || position === 'BOTTOM' || position === 'LEFT' || position === 'RIGHT') {
    return position
  }
  return port.direction === 'INPUT' ? 'LEFT' : 'RIGHT'
}

export function groupPortsBySide(ports: WorkflowPort[]): Record<PortSide, WorkflowPort[]> {
  const groups: Record<PortSide, WorkflowPort[]> = {
    LEFT: [],
    RIGHT: [],
    TOP: [],
    BOTTOM: [],
  }
  for (const port of ports) {
    groups[resolvePortSide(port)].push(port)
  }
  return groups
}

export function findWorkflowPresetPorts(
  catalog: StudioCatalog | null,
  presetId: string,
): WorkflowPort[] {
  const preset = catalog?.workflowPresets?.find((entry) => entry.id === presetId)
  if (!preset) return resolveAgentPluginPorts([], AGENT_PLUGIN_PORTS)
  return resolveAgentPluginPorts([], catalogComponentToPorts(preset))
}

export function isCapabilitiesPort(portId?: string | null): boolean {
  return portId === CAPABILITIES_PORT_ID
}

export function isAgentPlugPort(portId?: string | null): boolean {
  return portId === AGENT_PLUG_PORT_ID
}

export function isPluginPort(portId?: string | null): boolean {
  return isCapabilitiesPort(portId) || isAgentPlugPort(portId)
}
