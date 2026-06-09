import type { Meta, StoryObj } from '@storybook/react'
import { ToolsPanel } from './ToolsPanel'

const meta: Meta<typeof ToolsPanel> = {
  title: 'Layout/ToolsPanel',
  component: ToolsPanel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    expanded: { control: 'boolean' },
    onToggle: { action: 'toggle' },
    sectionId: { control: 'select', options: ['studio', 'runtime', 'ledger', 'configuration', null] },
    subId: { control: 'text' },
    runSelected: { control: 'boolean' },
  },
}

export default meta

type Story = StoryObj<typeof ToolsPanel>

const base = {
  onToggle: () => {},
  storeContext: {},
}

export const Collapsed: Story = {
  args: {
    ...base,
    expanded: false,
    sectionId: 'studio',
    subId: 'canvas',
    runSelected: false,
  },
}

export const Expanded: Story = {
  args: {
    ...base,
    expanded: true,
    sectionId: 'studio',
    subId: 'canvas',
    runSelected: false,
  },
}

export const RuntimeLiveRuns: Story = {
  args: {
    ...base,
    expanded: true,
    sectionId: 'runtime',
    subId: 'live-runs',
    runSelected: false,
    storeContext: { runId: '' },
  },
}

export const RuntimeRunOverview: Story = {
  args: {
    ...base,
    expanded: true,
    sectionId: 'runtime',
    subId: 'overview',
    runSelected: true,
    storeContext: { runId: 'run-123' },
  },
}

export const NoToolsForView: Story = {
  args: {
    ...base,
    expanded: true,
    sectionId: 'configuration',
    subId: 'secrets',
    runSelected: false,
    storeContext: {},
  },
}
