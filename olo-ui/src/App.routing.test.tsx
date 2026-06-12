import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

vi.mock('./api/rest', () => ({
  getHealth: vi.fn().mockResolvedValue({ status: 'UP', service: 'olo-be' }),
  getTenants: vi.fn().mockResolvedValue([]),
  getCatalog: vi.fn().mockResolvedValue({ schemaVersion: '1.0', nodes: [] }),
  listWorkflowConfigurations: vi.fn().mockResolvedValue([]),
  getConfigurationRoot: vi.fn().mockResolvedValue({ directory: '/tmp' }),
}))

vi.mock('./config/features', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./config/features')>()
  return {
    ...actual,
    isFeatureEnabled: vi.fn((id: keyof typeof actual.features) => actual.features[id] ?? true),
  }
})

import { isFeatureEnabled } from './config/features'

describe('App routing integration', () => {
  beforeEach(() => {
    vi.mocked(isFeatureEnabled).mockImplementation((id) => {
      const defaults: Record<string, boolean> = {
        workflows: true,
        overview: true,
        executions: true,
        observability: true,
        extensions: true,
        administration: true,
      }
      return defaults[id as string] ?? true
    })
  })

  it('redirects to default path when section is disabled', async () => {
    vi.mocked(isFeatureEnabled).mockImplementation((id) => id !== 'executions')
    render(
      <MemoryRouter initialEntries={['/executions']}>
        <App />
      </MemoryRouter>,
    )
    const heading = await screen.findByRole('heading', { name: /Workflows.*Builder/i }, { timeout: 3000 })
    expect(heading).toBeTruthy()
  })

  it('renders workflows builder deep link', async () => {
    vi.mocked(isFeatureEnabled).mockReturnValue(true)
    render(
      <MemoryRouter initialEntries={['/workflows/builder?tenant=abc']}>
        <App />
      </MemoryRouter>,
    )
    const heading = await screen.findByRole('heading', { name: /Workflows.*Builder/i }, { timeout: 3000 })
    expect(heading).toBeTruthy()
  })

  it('renders coming soon for overview', async () => {
    vi.mocked(isFeatureEnabled).mockReturnValue(true)
    render(
      <MemoryRouter initialEntries={['/overview']}>
        <App />
      </MemoryRouter>,
    )
    const badge = await screen.findByText('Coming Soon', {}, { timeout: 3000 })
    expect(badge).toBeTruthy()
  })
})
