import { describe, expect, it } from 'vitest'
import { arePortSchemasCompatible, canonicalizePortSchema } from './portConnection'

describe('portConnection', () => {
  it('accepts matching primitives regardless of case', () => {
    expect(arePortSchemasCompatible('string', 'string')).toBe(true)
    expect(arePortSchemasCompatible('String', 'string')).toBe(true)
    expect(canonicalizePortSchema('String')).toBe('string')
  })

  it('rejects primitive mismatches without coercion', () => {
    expect(arePortSchemasCompatible('string', 'number')).toBe(false)
    expect(arePortSchemasCompatible('number', 'string')).toBe(false)
  })

  it('accepts wildcard ports', () => {
    expect(arePortSchemasCompatible('string', 'any')).toBe(true)
    expect(arePortSchemasCompatible('any', 'number')).toBe(true)
  })

  it('preserves domain type casing', () => {
    expect(arePortSchemasCompatible('Stock[]', 'Stock[]')).toBe(true)
    expect(arePortSchemasCompatible('Stock[]', 'stock[]')).toBe(false)
  })
})
