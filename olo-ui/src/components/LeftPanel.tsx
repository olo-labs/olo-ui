import { useEffect, useState } from 'react'
import {
  type SectionConfig,
  type SectionId,
  getSectionDefaultSubId,
  sectionIsComingSoon,
  subOptionIsComingSoon,
} from '../types/layout'
import { useVisibleSections } from '../hooks/useFeature'
import { isFeatureEnabled } from '../config/features'

export interface LeftPanelProps {
  expanded: boolean
  onToggle: () => void
  sectionId: SectionId | null
  subId: string
  onSectionSubSelect: (sectionId: SectionId, subId: string) => void
}

type MenuContextMenu = { x: number; y: number; targetSectionId: SectionId | null }

export function LeftPanel({
  expanded,
  onToggle,
  sectionId,
  subId,
  onSectionSubSelect,
}: LeftPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<SectionId>>(new Set(['workflows']))
  const [menuContext, setMenuContext] = useState<MenuContextMenu | null>(null)
  const sections = useVisibleSections()

  useEffect(() => {
    if (sectionId) {
      setExpandedCategories((prev) => new Set(prev).add(sectionId))
    }
  }, [sectionId])

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

  const getSubOptions = (section: SectionConfig) =>
    section.subOptions.filter(
      (sub) => !sub.featureId || isFeatureEnabled(sub.featureId as import('../config/features').FeatureId),
    )

  const handleSectionClick = (section: SectionConfig) => {
    const subs = getSubOptions(section)
    if (subs.length > 0) {
      toggleCategory(section.id)
      if (sectionId !== section.id) {
        onSectionSubSelect(section.id, getSectionDefaultSubId(section.id) || subs[0].id)
      }
      return
    }
    onSectionSubSelect(section.id, '')
  }

  return (
    <aside className={`left-panel ${expanded ? 'expanded' : 'collapsed'}`}>
      {expanded && (
        <div className="left-panel-inner">
          <nav
            className="left-panel-menu"
            onContextMenu={(e) => handleMenuContextMenu(e, null)}
          >
            {sections.map((section) => {
              const isCategoryExpanded = expandedCategories.has(section.id)
              const subOptions = getSubOptions(section)
              const hasSubs = subOptions.length > 0
              const isActiveSection =
                sectionId === section.id &&
                (!hasSubs || subOptions.some((s) => s.id === subId))
              const comingSoon = sectionIsComingSoon(section)

              return (
                <div key={section.id} className="left-panel-category">
                  <button
                    type="button"
                    className={`left-panel-category-header ${isCategoryExpanded ? 'expanded' : ''} ${isActiveSection ? 'active' : ''}`}
                    onClick={() => handleSectionClick(section)}
                    onContextMenu={(e) => handleMenuContextMenu(e, section.id)}
                    aria-expanded={hasSubs ? isCategoryExpanded : undefined}
                    title={section.subtitle}
                  >
                    <span className="left-panel-category-chevron">
                      {hasSubs ? (isCategoryExpanded ? '▼' : '▶') : ''}
                    </span>
                    <span className="left-panel-category-emoji" aria-hidden>
                      {section.emoji}
                    </span>
                    <span className="left-panel-category-label">{section.label}</span>
                    {comingSoon ? (
                      <span className="left-panel-soon-badge">{section.comingSoonLabel ?? 'Scheduled'}</span>
                    ) : section.status === 'partial' ? (
                      <span className="left-panel-partial-badge">Partial</span>
                    ) : null}
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
                            {subOptionIsComingSoon(sub) ? (
                              <span className="left-panel-soon-badge small">{sub.comingSoonLabel ?? 'Scheduled'}</span>
                            ) : null}
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
