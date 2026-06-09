import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

vi.mock('./api/rest', () => ({
  getHealth: vi.fn().mockResolvedValue({ status: 'UP', service: 'olo-be' }),
  getTenants: vi.fn().mockResolvedValue([]),
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
        studio: true,
        runtime: true,
        ledger: true,
        configuration: true,
      }
      return defaults[id as string] ?? true
    })
  })

  it('redirects to default path when section is disabled (e.g. ledger off)', async () => {
    vi.mocked(isFeatureEnabled).mockImplementation((id) => id !== 'ledger')
    render(
      <MemoryRouter initialEntries={['/ledger/runs']}>
        <App />
      </MemoryRouter>
    )
    const heading = await screen.findByRole('heading', { name: /Build.*Canvas/i }, { timeout: 3000 })
    expect(heading).toBeTruthy()
  })

  it('renders run-level deep link and syncs store (tree-view + tenant query)', async () => {
    vi.mocked(isFeatureEnabled).mockReturnValue(true)
    render(
      <MemoryRouter initialEntries={['/runtime/run/123/tree-view?tenant=abc']}>
        <App />
      </MemoryRouter>
    )
    const heading = await screen.findByRole('heading', { name: /Run.*Tree View/i }, { timeout: 3000 })
    expect(heading).toBeTruthy()
  })
})
