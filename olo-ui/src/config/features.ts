/**
 * Feature flags: gradual rollout, OSS vs enterprise, hidden experimental domains.
 * Toggle sections and sub-features without forking. Use with useFeature().
 *
 * Rules:
 * (1) Flags are boolean capability toggles only.
 * (2) No business logic branching inside domain stores based on flags.
 * (3) Use flags at composition level (e.g. section/sub visibility in LeftPanel).
 * (4) Sunset rule: every flag must have an owner and removal target version;
 *     document in FEATURE_FLAG_META below (or in code) so flags are reviewed and removed.
 */
export const features = {
  /** Left-panel sections (Build, Run, Investigate, System) */
  studio: true,
  runtime: true,
  ledger: true,
  configuration: true,

  /** Sub-features (can gate specific views) */
  costAnalysis: false,
  replay: true,
  tenantConfiguration: true,
} as const

export type FeatureId = keyof typeof features

/**
 * Sunset rule: every feature flag must have an owner and removal target.
 * Add entries here (or in code) so flags are reviewed and removed when the feature is stable or deprecated.
 */
export const FEATURE_FLAG_META: Partial<Record<FeatureId, { owner: string; removeBy: string }>> = {
  studio: { owner: 'platform', removeBy: 'n/a (core)' },
  runtime: { owner: 'platform', removeBy: 'n/a (core)' },
  ledger: { owner: 'platform', removeBy: 'n/a (core)' },
  configuration: { owner: 'platform', removeBy: 'n/a (core)' },
  costAnalysis: { owner: 'TBD', removeBy: 'TBD' },
  replay: { owner: 'TBD', removeBy: 'TBD' },
  tenantConfiguration: { owner: 'TBD', removeBy: 'TBD' },
}

export function isFeatureEnabled(id: FeatureId): boolean {
  return Boolean(features[id])
}
