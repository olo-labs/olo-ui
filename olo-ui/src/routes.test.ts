import { describe, it, expect } from 'vitest'
import {
  parsePath,
  buildPath,
  buildPathWithTenant,
  buildPathWithQuery,
  parseQuery,
  buildQuery,
  parsedToPanelParams,
  getDefaultSubId,
  getRunLevelDefaultSubId,
  DEFAULT_PATH,
  VALID_SECTION_IDS,
} from './routes'

describe('routes', () => {
  describe('parsePath', () => {
    it('returns null for empty path', () => {
      expect(parsePath('')).toBeNull()
      expect(parsePath('/')).toBeNull()
    })

    it('parses section-only path and uses default subId', () => {
      const r = parsePath('/studio')
      expect(r).toEqual({ sectionId: 'studio', subId: 'canvas', runId: null })
    })

    it('parses section + subId (default routing)', () => {
      expect(parsePath('/studio/canvas')).toEqual({
        sectionId: 'studio',
        subId: 'canvas',
        runId: null,
      })
      expect(parsePath('/studio/versions')).toEqual({
        sectionId: 'studio',
        subId: 'versions',
        runId: null,
      })
      expect(parsePath('/configuration/tenant-configuration')).toEqual({
        sectionId: 'configuration',
        subId: 'tenant-configuration',
        runId: null,
      })
    })

    it('parses run-level path (runtime)', () => {
      const r = parsePath('/runtime/run/abc-123/overview')
      expect(r).toEqual({
        sectionId: 'runtime',
        subId: 'overview',
        runId: 'abc-123',
      })
    })

    it('parses run-level path (ledger)', () => {
      const r = parsePath('/ledger/run/run-456/summary')
      expect(r).toEqual({
        sectionId: 'ledger',
        subId: 'summary',
        runId: 'run-456',
      })
    })

    it('returns null for invalid section', () => {
      expect(parsePath('/invalid/canvas')).toBeNull()
      expect(parsePath('/foo')).toBeNull()
    })

    it('handles leading/trailing slashes', () => {
      expect(parsePath('studio/canvas')).toEqual({
        sectionId: 'studio',
        subId: 'canvas',
        runId: null,
      })
      expect(parsePath('/runtime/live-runs/')).toEqual({
        sectionId: 'runtime',
        subId: 'live-runs',
        runId: null,
      })
    })

    it('falls back to default sub-option when sub is invalid', () => {
      const r = parsePath('/studio/unknown-sub')
      expect(r).not.toBeNull()
      expect(r!.sectionId).toBe('studio')
      expect(r!.subId).toBe('canvas')
      expect(r!.runId).toBeNull()
    })

    it('falls back to run-level default sub when run-level tab is invalid', () => {
      const r = parsePath('/runtime/run/123/invalid-tab')
      expect(r).not.toBeNull()
      expect(r!.sectionId).toBe('runtime')
      expect(r!.runId).toBe('123')
      expect(r!.subId).toBe('overview')
    })

    it('falls back to list view when runId is missing (empty segment)', () => {
      const r = parsePath('/runtime/run//overview')
      expect(r).not.toBeNull()
      expect(r!.sectionId).toBe('runtime')
      expect(r!.subId).toBe('live-runs')
      expect(r!.runId).toBeNull()
    })

    it('falls back to list view when run path has only 3 segments (missing runId)', () => {
      const r = parsePath('/runtime/run/overview')
      expect(r).not.toBeNull()
      expect(r!.sectionId).toBe('runtime')
      expect(r!.subId).toBe('live-runs')
      expect(r!.runId).toBeNull()
    })

    it('ledger list fallback when runId missing', () => {
      const r = parsePath('/ledger/run/summary')
      expect(r).not.toBeNull()
      expect(r!.sectionId).toBe('ledger')
      expect(r!.subId).toBe('runs')
      expect(r!.runId).toBeNull()
    })
  })

  describe('buildPath', () => {
    it('builds section + sub path (no run)', () => {
      expect(buildPath('studio', 'canvas')).toBe('/studio/canvas')
      expect(buildPath('configuration', 'tenant-configuration')).toBe(
        '/configuration/tenant-configuration'
      )
    })

    it('builds run-level path for runtime with runId', () => {
      expect(buildPath('runtime', 'overview', 'abc-123')).toBe(
        '/runtime/run/abc-123/overview'
      )
    })

    it('builds run-level path for ledger with runId', () => {
      expect(buildPath('ledger', 'summary', 'run-456')).toBe(
        '/ledger/run/run-456/summary'
      )
    })

    it('builds section path when runId is null for studio', () => {
      expect(buildPath('studio', 'canvas', null)).toBe('/studio/canvas')
    })

    it('encodes runId and subId in run-level path', () => {
      expect(buildPath('runtime', 'tree-view', 'id/with/slash')).toBe(
        '/runtime/run/id%2Fwith%2Fslash/tree-view'
      )
    })
  })

  describe('buildPathWithTenant', () => {
    it('returns pathname when tenantId is empty', () => {
      expect(buildPathWithTenant('/studio/canvas', '')).toBe('/studio/canvas')
    })

    it('appends tenant query when tenantId is set', () => {
      expect(buildPathWithTenant('/studio/canvas', 'tenant-1')).toBe(
        '/studio/canvas?tenant=tenant-1'
      )
    })

    it('encodes tenantId in query', () => {
      expect(buildPathWithTenant('/runtime/live-runs', 'a=b&c')).toBe(
        '/runtime/live-runs?tenant=a%3Db%26c'
      )
    })
  })

  describe('parseQuery', () => {
    it('returns defaults when search is empty', () => {
      expect(parseQuery('')).toEqual({
        tenantId: '',
        menuExpanded: true,
        toolsExpanded: false,
        propsExpanded: false,
      })
    })

    it('parses menu=0 as collapsed', () => {
      expect(parseQuery('?menu=0').menuExpanded).toBe(false)
    })

    it('parses tools=1 and props=1 as expanded', () => {
      const q = parseQuery('?tools=1&props=1')
      expect(q.toolsExpanded).toBe(true)
      expect(q.propsExpanded).toBe(true)
    })

    it('parses tenant from query', () => {
      expect(parseQuery('?tenant=abc').tenantId).toBe('abc')
    })
  })

  describe('buildQuery and buildPathWithQuery', () => {
    it('buildQuery outputs menu, tools, props and tenant when set', () => {
      const q = buildQuery({ tenantId: 'x', menu: 1, tools: 0, props: 0 })
      expect(q).toContain('menu=1')
      expect(q).toContain('tools=0')
      expect(q).toContain('props=0')
      expect(q).toContain('tenant=x')
    })

    it('buildPathWithQuery appends query to pathname', () => {
      const url = buildPathWithQuery('/studio/canvas', {
        tenantId: 't1',
        menu: 0,
        tools: 1,
        props: 0,
      })
      expect(url).toContain('/studio/canvas?')
      expect(url).toContain('tenant=t1')
      expect(url).toContain('menu=0')
      expect(url).toContain('tools=1')
    })
  })

  describe('parsedToPanelParams', () => {
    it('converts ParsedQuery to buildQuery params', () => {
      const q = parseQuery('?tenant=abc&menu=0&tools=1&props=0')
      const params = parsedToPanelParams(q)
      expect(params.tenantId).toBe('abc')
      expect(params.menu).toBe(0)
      expect(params.tools).toBe(1)
      expect(params.props).toBe(0)
    })
  })

  describe('getDefaultSubId', () => {
    it('returns first subOption for section with options', () => {
      expect(getDefaultSubId('studio')).toBe('canvas')
      expect(getDefaultSubId('runtime')).toBe('live-runs')
      expect(getDefaultSubId('configuration')).toBe('tenant-configuration')
    })

    it('returns empty string for section with no subOptions', () => {
      // All current sections have subOptions; if one had none, getDefaultSubId would return ''
      expect(getDefaultSubId('studio')).toBe('canvas')
    })
  })

  describe('getRunLevelDefaultSubId', () => {
    it('returns first runSelectedOption for runtime/ledger', () => {
      expect(getRunLevelDefaultSubId('runtime')).toBe('overview')
      expect(getRunLevelDefaultSubId('ledger')).toBe('summary')
    })

    it('returns overview for studio (no runSelectedOptions, fallback)', () => {
      expect(getRunLevelDefaultSubId('studio')).toBe('overview')
    })
  })

  describe('constants', () => {
    it('DEFAULT_PATH is studio/canvas', () => {
      expect(DEFAULT_PATH).toBe('/studio/canvas')
    })

    it('VALID_SECTION_IDS includes all sections', () => {
      expect(VALID_SECTION_IDS).toContain('studio')
      expect(VALID_SECTION_IDS).toContain('runtime')
      expect(VALID_SECTION_IDS).toContain('ledger')
      expect(VALID_SECTION_IDS).toContain('configuration')
    })
  })
})
