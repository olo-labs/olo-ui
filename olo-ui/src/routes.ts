import type { SectionId } from './types/layout'
import { SECTIONS } from './types/layout'

export const VALID_SECTION_IDS: SectionId[] = [
  'studio',
  'runtime',
  'ledger',
  'configuration',
]

function isSectionId(s: string): s is SectionId {
  return VALID_SECTION_IDS.includes(s as SectionId)
}

/** Default subId when only section is in path (e.g. /studio -> canvas) */
export function getDefaultSubId(sectionId: SectionId): string {
  const section = SECTIONS.find((s) => s.id === sectionId)
  const options = section?.subOptions ?? []
  return options[0]?.id ?? ''
}

/** Return list-view subId for runtime/ledger when run path is missing or invalid. */
function getListSubId(sectionId: SectionId): string {
  return sectionId === 'runtime' ? 'live-runs' : sectionId === 'ledger' ? 'runs' : getDefaultSubId(sectionId)
}

function isValidSubId(sectionId: SectionId, subId: string, forRunLevel: boolean): boolean {
  const section = SECTIONS.find((s) => s.id === sectionId)
  if (!section) return false
  const options = forRunLevel ? (section.runSelectedOptions ?? []) : (section.subOptions ?? [])
  return options.some((o) => o.id === subId)
}

export interface ParsedPath {
  sectionId: SectionId
  subId: string
  runId: string | null
}

/**
 * Parse pathname to navigation state.
 * - Invalid sub-option falls back to default (or run-level default).
 * - Run path with missing/empty runId falls back to list view (e.g. /runtime/live-runs).
 */
export function parsePath(pathname: string): ParsedPath | null {
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
  if (segments.length === 0) return null

  const sectionId = segments[0]
  if (!isSectionId(sectionId)) return null

  // /:sectionId/run/:runId/:subId — run-level route
  if (segments[1] === 'run') {
    const runIdRaw = segments[2]
    const subIdRaw = segments[3]
    // Missing runId: /runtime/run//overview or /runtime/run/overview (only 3 segments) -> list view
    if (segments.length < 4 || !runIdRaw || runIdRaw.trim() === '') {
      return {
        sectionId,
        subId: getListSubId(sectionId),
        runId: null,
      }
    }
    const runLevelDefault = getRunLevelDefaultSubId(sectionId)
    const subId = isValidSubId(sectionId, subIdRaw ?? '', true) ? (subIdRaw ?? runLevelDefault) : runLevelDefault
    return { sectionId, subId, runId: runIdRaw }
  }

  // /:sectionId/:subId?
  const subIdRaw = segments[1] ?? getDefaultSubId(sectionId)
  const defaultSub = getDefaultSubId(sectionId)
  const subId = isValidSubId(sectionId, subIdRaw, false) ? subIdRaw : defaultSub
  return { sectionId, subId, runId: null }
}

/**
 * Build path for navigation. Use for deep links and browser history.
 * For run-level views (runtime/ledger with runId), use runId; otherwise pass null.
 */
export function buildPath(
  sectionId: SectionId,
  subId: string,
  runId: string | null = null
): string {
  if (runId && (sectionId === 'runtime' || sectionId === 'ledger')) {
    return `/${sectionId}/run/${encodeURIComponent(runId)}/${encodeURIComponent(subId)}`
  }
  return `/${sectionId}/${encodeURIComponent(subId)}`
}

/** Default run-level subId when opening a run (e.g. Overview for runtime, Summary for ledger). */
export function getRunLevelDefaultSubId(sectionId: SectionId): string {
  const section = SECTIONS.find((s) => s.id === sectionId)
  const options = section?.runSelectedOptions ?? []
  return options[0]?.id ?? 'overview'
}

/** Root path for app; redirect here when path is invalid or "/" */
export const DEFAULT_PATH = '/studio/canvas'

/** Panel state in query: menu=0 collapsed, menu=1 expanded; same for tools, props. */
export type PanelQuery = { menu?: 0 | 1; tools?: 0 | 1; props?: 0 | 1 }

export interface ParsedQuery {
  tenantId: string
  menuExpanded: boolean
  toolsExpanded: boolean
  propsExpanded: boolean
}

/**
 * Parse search string to panel + tenant state.
 * Defaults: menu expanded (true), tools and props collapsed (false).
 */
export function parseQuery(search: string): ParsedQuery {
  const params = new URLSearchParams(search)
  return {
    tenantId: params.get('tenant') ?? '',
    menuExpanded: params.get('menu') !== '0',
    toolsExpanded: params.get('tools') === '1',
    propsExpanded: params.get('props') === '1',
  }
}

/**
 * Build query string for panel state and tenant.
 * Always outputs menu, tools, props (readable). Tenant only when set.
 */
export function buildQuery(params: {
  tenantId?: string
  menu: 0 | 1
  tools: 0 | 1
  props: 0 | 1
}): string {
  const p = new URLSearchParams()
  if (params.tenantId) p.set('tenant', params.tenantId)
  p.set('menu', String(params.menu))
  p.set('tools', String(params.tools))
  p.set('props', String(params.props))
  return p.toString()
}

/** Current panel state from ParsedQuery for buildQuery. */
export function parsedToPanelParams(q: ParsedQuery): { tenantId: string; menu: 0 | 1; tools: 0 | 1; props: 0 | 1 } {
  return {
    tenantId: q.tenantId,
    menu: q.menuExpanded ? 1 : 0,
    tools: q.toolsExpanded ? 1 : 0,
    props: q.propsExpanded ? 1 : 0,
  }
}

/**
 * Build pathname + query for navigation. Preserves tenant and panel state in URL.
 */
export function buildPathWithQuery(
  pathname: string,
  params: { tenantId?: string; menu: 0 | 1; tools: 0 | 1; props: 0 | 1 }
): string {
  const q = buildQuery(params)
  return pathname + (q ? '?' + q : '')
}

/**
 * Build pathname + tenant query only (legacy). Prefer buildPathWithQuery with full panel state.
 */
export function buildPathWithTenant(
  pathname: string,
  tenantId: string
): string {
  const search = tenantId ? `?tenant=${encodeURIComponent(tenantId)}` : ''
  return pathname + search
}
