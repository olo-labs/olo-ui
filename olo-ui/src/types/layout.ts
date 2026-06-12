/**

 * v1 product navigation — stable section IDs for URLs; labels are display-only.

 */

export type SectionId =

  | 'overview'

  | 'workflows'

  | 'executions'

  | 'observability'

  | 'extensions'

  | 'administration'



export type SectionStatus = 'available' | 'coming-soon' | 'partial'



export interface SubOption {

  id: string

  label: string

  description?: string

  status?: 'available' | 'coming-soon'

  featureId?: keyof typeof import('../config/features').features

  /** Show catalog Components panel (builder). */

  componentsPanel?: boolean

  /** Legacy contextual tool IDs (non-builder views). */

  toolIds?: string[]

}



export interface SectionConfig {

  id: SectionId

  label: string

  emoji: string

  status: SectionStatus

  subtitle: string

  subOptions: SubOption[]

  /** Future: run-level tabs when a run is selected (Executions, Observability). */

  runSelectedOptions?: SubOption[]

}



export const SECTIONS: SectionConfig[] = [

  {

    id: 'overview',

    label: 'Overview',

    emoji: '🏠',

    status: 'coming-soon',

    subtitle: 'Product dashboard',

    subOptions: [],

  },

  {

    id: 'workflows',

    label: 'Workflows',

    emoji: '📋',

    status: 'available',

    subtitle: 'Design and manage workflows',

    subOptions: [

      {

        id: 'builder',

        label: 'Builder',

        description: 'Visual workflow editor',

        status: 'available',

        componentsPanel: true,

      },

      {

        id: 'import-export',

        label: 'Import / Export',

        description: 'Import, export, and manage workflow JSON',

        status: 'available',

        featureId: 'workflowConfiguration',

      },

      {

        id: 'templates',

        label: 'Templates',

        description: 'Workflow templates',

        status: 'coming-soon',

      },

      {

        id: 'versions',

        label: 'Versions',

        description: 'Workflow version history',

        status: 'coming-soon',

      },

    ],

  },

  {

    id: 'executions',

    label: 'Executions',

    emoji: '⚡',

    status: 'coming-soon',

    subtitle: 'Live and recent runs',

    subOptions: [],

  },

  {

    id: 'observability',

    label: 'Observability',

    emoji: '📊',

    status: 'coming-soon',

    subtitle: 'Metrics, logs, and traces',

    subOptions: [],

  },

  {

    id: 'extensions',

    label: 'Extensions',

    emoji: '🔌',

    status: 'coming-soon',

    subtitle: 'Plugins and integrations',

    subOptions: [],

  },

  {

    id: 'administration',

    label: 'Administration',

    emoji: '⚙️',

    status: 'partial',

    subtitle: 'Tenants and platform settings',

    subOptions: [

      {

        id: 'tenants',

        label: 'Tenants',

        description: 'Manage tenants',

        status: 'available',

        featureId: 'tenantConfiguration',

      },

    ],

  },

]



export function getSection(sectionId: SectionId): SectionConfig | undefined {

  return SECTIONS.find((s) => s.id === sectionId)

}



export function getSubOption(sectionId: SectionId, subId: string): SubOption | undefined {

  const section = getSection(sectionId)

  if (!section) return undefined

  return section.subOptions.find((s) => s.id === subId)

}



export function sectionIsComingSoon(section: SectionConfig): boolean {

  return section.status === 'coming-soon'

}



export function subOptionIsComingSoon(sub: SubOption): boolean {

  return sub.status === 'coming-soon'

}


