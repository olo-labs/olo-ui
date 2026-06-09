/**
 * User-centric menu: Build, Run, Investigate, System.
 * Section IDs are stable for URLs (studio, runtime, ledger, configuration); labels are display-only.
 */
export type SectionId =
  | 'studio'   // Build
  | 'runtime'  // Run
  | 'ledger'   // Investigate
  | 'configuration'  // System

export interface SubOption {
  id: string
  label: string
  /** Optional description for tooltip */
  description?: string
  /** When set, sub-option is shown only when this feature flag is enabled (see config/features) */
  featureId?: keyof typeof import('../config/features').features
  /** Tool IDs to show in the Tools panel for this view (contextual tools). Resolved via tool registry. */
  toolIds?: string[]
}

export interface SectionConfig {
  id: SectionId
  label: string
  /** Short subtitle and tooltip description for the category */
  subtitle: string
  /** Sub-options shown when category is expanded (or run-level options when run selected) */
  subOptions: SubOption[]
  /** When a run is selected, show these instead of subOptions for Run / Investigate */
  runSelectedOptions?: SubOption[]
}

export const SECTIONS: SectionConfig[] = [
  {
    id: 'studio',
    label: 'Build',
    subtitle: 'Create or modify pipelines',
    subOptions: [
      { id: 'canvas', label: 'Canvas', description: 'Design and edit pipelines', toolIds: ['shortcuts'] },
      { id: 'versions', label: 'Versions', description: 'Pipeline version history', toolIds: ['shortcuts'] },
      { id: 'validate', label: 'Validate', description: 'Validate pipeline config', toolIds: ['shortcuts'] },
      { id: 'test-run', label: 'Test Run', description: 'Run a test execution', toolIds: ['quick-actions', 'shortcuts'] },
      { id: 'schema', label: 'Schema', description: 'Schema definitions', toolIds: ['shortcuts'] },
    ],
  },
  {
    id: 'runtime',
    label: 'Run',
    subtitle: 'What is currently happening?',
    subOptions: [
      { id: 'live-runs', label: 'Live Runs', description: 'Active run list', toolIds: ['quick-actions', 'filters', 'search'] },
      { id: 'queues', label: 'Queues', description: 'Execution queues', toolIds: ['filters', 'search'] },
      { id: 'metrics', label: 'Metrics', description: 'Runtime metrics', toolIds: ['filters'] },
    ],
    runSelectedOptions: [
      { id: 'overview', label: 'Overview', description: 'Run summary', toolIds: ['quick-actions', 'node-inspector', 'logs-preview'] },
      { id: 'tree-view', label: 'Tree View', description: 'Execution tree', toolIds: ['node-inspector', 'logs-preview'] },
      { id: 'timeline', label: 'Timeline', description: 'Execution timeline', toolIds: ['node-inspector'] },
      { id: 'debug', label: 'Debug', description: 'Debug run', toolIds: ['quick-actions', 'node-inspector', 'logs-preview'] },
      { id: 'compare', label: 'Compare', description: 'Compare runs', toolIds: ['shortcuts'] },
    ],
  },
  {
    id: 'ledger',
    label: 'Investigate',
    subtitle: 'What happened in the past?',
    subOptions: [
      { id: 'runs', label: 'Runs', description: 'Historical run list', toolIds: ['filters', 'search'] },
      { id: 'replay', label: 'Replay', description: 'Replay execution', featureId: 'replay', toolIds: ['quick-actions'] },
      { id: 'cost-analysis', label: 'Cost Analysis', description: 'Cost breakdown', featureId: 'costAnalysis', toolIds: ['filters'] },
      { id: 'diff', label: 'Diff', description: 'Compare runs', toolIds: ['shortcuts'] },
      { id: 'snapshots', label: 'Snapshots', description: 'State snapshots', toolIds: ['search'] },
    ],
    runSelectedOptions: [
      { id: 'summary', label: 'Summary', description: 'Run summary', toolIds: ['node-inspector', 'logs-preview'] },
      { id: 'execution-tree', label: 'Execution Tree', description: 'Execution tree', toolIds: ['node-inspector', 'logs-preview'] },
      { id: 'time-travel', label: 'Time Travel', description: 'Time travel debug', toolIds: ['node-inspector'] },
      { id: 'raw-events', label: 'Raw Events', description: 'Raw event log', toolIds: ['search', 'logs-preview'] },
      { id: 'diff', label: 'Diff', description: 'Compare with another run', toolIds: ['shortcuts'] },
    ],
  },
  {
    id: 'configuration',
    label: 'System',
    subtitle: 'Configure environment',
    subOptions: [
      { id: 'tenant-configuration', label: 'Tenant Configuration', description: 'Manage tenants', featureId: 'tenantConfiguration', toolIds: ['search'] },
      { id: 'environment-config', label: 'Environment', description: 'Per-environment settings', toolIds: ['shortcuts'] },
      { id: 'secrets', label: 'Secrets', description: 'Secrets management', toolIds: [] },
      { id: 'plugin-config', label: 'Plugins', description: 'Plugin settings', toolIds: ['search'] },
      { id: 'global-settings', label: 'Global Settings', description: 'Global app settings', toolIds: ['shortcuts'] },
    ],
  },
]
