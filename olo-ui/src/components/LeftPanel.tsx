import { useState } from 'react'
import { tenantDisplayName } from '../lib/tenantDisplay'
import type { Tenant } from '../types/tenant'
import { type SectionConfig, type SectionId } from '../types/layout'
import { useVisibleSections } from '../hooks/useFeature'
import { isFeatureEnabled } from '../config/features'

export interface LeftPanelProps {
  expanded: boolean
  onToggle: () => void
  tenantId: string
  onTenantChange: (id: string) => void
  /** Tenants for dropdown; supplied by App from store (no API calls in components). */
  tenants: Tenant[]
  sectionId: SectionId | null
  subId: string
  runSelected: boolean
  onSectionSubSelect: (sectionId: SectionId, subId: string) => void
}

type MenuContextMenu = { x: number; y: number; targetSectionId: SectionId | null }

export function LeftPanel({
  expanded,
  onToggle,
  tenantId,
  onTenantChange,
  tenants,
  sectionId,
  subId,
  runSelected,
  onSectionSubSelect,
}: LeftPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<SectionId>>(new Set())
  const [menuContext, setMenuContext] = useState<MenuContextMenu | null>(null)
  const sections = useVisibleSections()

  const toggleCategory = (id: SectionId) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandCategory = (id: SectionId) => {
    setExpandedCategories((prev) => new Set(prev).add(id))
  }
  const collapseCategory = (id: SectionId) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }
  const expandAll = () => {
    setExpandedCategories(new Set(sections.map((s) => s.id)))
  }
  const collapseAll = () => {
    setExpandedCategories(new Set())
  }

  const handleMenuContextMenu = (e: React.MouseEvent, targetSectionId: SectionId | null) => {
    e.preventDefault()
    if (!expanded) return
    setMenuContext({ x: e.clientX, y: e.clientY, targetSectionId })
  }
  const closeMenuContext = () => setMenuContext(null)

  const getSubOptions = (section: SectionConfig) => {
    const list =
      runSelected &&
      (section.id === 'runtime' || section.id === 'ledger') &&
      section.runSelectedOptions?.length
        ? section.runSelectedOptions
        : section.subOptions
    return list.filter((sub) => !sub.featureId || isFeatureEnabled(sub.featureId as import('../config/features').FeatureId))
  }

  return (
    <aside className={`left-panel ${expanded ? 'expanded' : 'collapsed'}`}>
      {expanded && (
        <div className="left-panel-inner">
          <div className="left-panel-tenant">
            <label className="left-panel-tenant-label">Tenant</label>
            <select
              className="left-panel-tenant-select"
              value={tenantId}
              onChange={(e) => onTenantChange(e.target.value)}
            >
              <option value="">Select tenant</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {tenantDisplayName(t)}
                </option>
              ))}
            </select>
          </div>
          <nav
            className="left-panel-menu"
            onContextMenu={(e) => handleMenuContextMenu(e, null)}
          >
            {sections.map((section) => {
              const isCategoryExpanded = expandedCategories.has(section.id)
              const subOptions = getSubOptions(section)
              const hasSubs = subOptions.length > 0
              const categoryTooltip = `${section.label}: ${section.subtitle}`

              return (
                <div key={section.id} className="left-panel-category">
                  <button
                    type="button"
                    className={`left-panel-category-header ${isCategoryExpanded ? 'expanded' : ''} ${sectionId === section.id && (!hasSubs || getSubOptions(section).some((s) => s.id === subId)) ? 'active' : ''}`}
                    onClick={() => (hasSubs ? toggleCategory(section.id) : onSectionSubSelect(section.id, ''))}
                    onContextMenu={(e) => handleMenuContextMenu(e, section.id)}
                    aria-expanded={isCategoryExpanded}
                    title={categoryTooltip}
                  >
                    <span className="left-panel-category-chevron">
                      {hasSubs ? (isCategoryExpanded ? '▼' : '▶') : ''}
                    </span>
                    <span className="left-panel-category-label">{section.label}</span>
                    <span className="left-panel-category-subtitle">{section.subtitle}</span>
                  </button>
                  {hasSubs && isCategoryExpanded && (
                    <ul className="left-panel-sub-list">
                      {subOptions.map((sub) => (
                        <li key={sub.id}>
                          <button
                            type="button"
                            className={`left-panel-sub-item ${sectionId === section.id && subId === sub.id ? 'active' : ''}`}
                            onClick={() => onSectionSubSelect(section.id, sub.id)}
                            title={sub.description ?? sub.label}
                          >
                            {sub.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </nav>
          {menuContext && (
            <>
              <div
                className="left-panel-menu-context-backdrop"
                onClick={closeMenuContext}
                onContextMenu={closeMenuContext}
                aria-hidden
              />
              <div
                className="left-panel-menu-context-menu"
                style={{ left: menuContext.x, top: menuContext.y }}
                role="menu"
              >
                {menuContext.targetSectionId != null && (
                  <>
                    <button
                      type="button"
                      className="left-panel-menu-context-item"
                      role="menuitem"
                      onClick={() => {
                        collapseCategory(menuContext.targetSectionId!)
                        closeMenuContext()
                      }}
                    >
                      Collapse
                    </button>
                    <button
                      type="button"
                      className="left-panel-menu-context-item"
                      role="menuitem"
                      onClick={() => {
                        expandCategory(menuContext.targetSectionId!)
                        closeMenuContext()
                      }}
                    >
                      Expand
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="left-panel-menu-context-item"
                  role="menuitem"
                  onClick={() => {
                    collapseAll()
                    closeMenuContext()
                  }}
                >
                  Collapse all
                </button>
                <button
                  type="button"
                  className="left-panel-menu-context-item"
                  role="menuitem"
                  onClick={() => {
                    expandAll()
                    closeMenuContext()
                  }}
                >
                  Expand all
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <button
        type="button"
        className="left-panel-toggle"
        onClick={onToggle}
        title={expanded ? 'Collapse' : 'Expand'}
        aria-label={expanded ? 'Collapse menu' : 'Expand menu'}
      >
        {expanded ? '<' : <span className="left-panel-collapsed-label">Menu</span>}
      </button>
    </aside>
  )
}
