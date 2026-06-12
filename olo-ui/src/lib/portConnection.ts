/**
 * Studio drag-and-drop port wiring rules — mirrors org.olo.spi.port.PortSchemaCompatibility.
 */

export const PORT_WILDCARDS = ['any', '*'] as const

export const PORT_PRIMITIVES = [
  'string',
  'number',
  'integer',
  'boolean',
  'object',
  'array',
] as const

const PRIMITIVE_ALIASES: Record<string, string> = {
  string: 'string',
  str: 'string',
  number: 'number',
  double: 'number',
  float: 'number',
  decimal: 'number',
  integer: 'integer',
  int: 'integer',
  long: 'integer',
  boolean: 'boolean',
  bool: 'boolean',
  object: 'object',
  json: 'object',
  map: 'object',
  array: 'array',
  list: 'array',
}

function acceptsAny(schema: string): boolean {
  const trimmed = schema.trim()
  return trimmed.toLowerCase() === 'any' || trimmed === '*'
}

function primitiveAlias(raw: string): string | null {
  const key = raw.trim().toLowerCase()
  return PRIMITIVE_ALIASES[key] ?? null
}

function canonicalizeElement(element: string): string {
  return primitiveAlias(element) ?? element
}

/** Canonical form used for comparisons. */
export function canonicalizePortSchema(schema: string): string {
  const trimmed = schema.trim()
  if (!trimmed) return trimmed
  if (acceptsAny(trimmed)) return 'any'
  if (trimmed.endsWith('[]')) {
    const element = trimmed.slice(0, -2).trim()
    return `${canonicalizeElement(element)}[]`
  }
  return canonicalizeElement(trimmed)
}

/** Whether an output port may connect to an input port while editing. */
export function arePortSchemasCompatible(
  outputSchema: string,
  inputSchema: string,
): boolean {
  if (!outputSchema?.trim() || !inputSchema?.trim()) return false
  const output = canonicalizePortSchema(outputSchema)
  const input = canonicalizePortSchema(inputSchema)
  if (acceptsAny(input) || acceptsAny(output)) return true
  return output === input
}
