import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SelfHostedInfrastructureDiagram } from './SelfHostedTopSummary'

const mockUseProjectOperationsQuery = vi.fn()

vi.mock('common', () => ({ useParams: () => ({ ref: 'default' }) }))
vi.mock('@/data/operations/project-operations-query', () => ({
  useProjectOperationsQuery: (...args: unknown[]) => mockUseProjectOperationsQuery(...args),
}))

describe('SelfHostedInfrastructureDiagram', () => {
  beforeEach(() => {
    mockUseProjectOperationsQuery.mockReset()
  })

  it('renders self-host runtime telemetry when the management API reports it', () => {
    mockUseProjectOperationsQuery.mockReturnValue({
      isPending: false,
      data: {
        generatedAt: '2026-07-14T18:00:00Z',
        status: 'healthy',
        services: {
          analytics: 'healthy',
          auth: 'healthy',
          database: 'healthy',
          functions: 'healthy',
          realtime: 'healthy',
          rest: 'healthy',
          storage: 'healthy',
          vector: 'healthy',
        },
        deployment: { commit: 'abc1234', version: '0.2.0' },
        backup: { status: 'unavailable' },
        migration: { status: 'unavailable' },
        infrastructure: {
          database: { host: 'db', port: 5432, maxClientConnections: 60 },
          runtime: {
            cpuPercent: 12.4,
            diskPercent: 45.2,
            memoryPercent: 66.8,
            connectionsCurrent: 22,
            connectionsMax: 60,
            updatedAt: '2026-07-14T18:01:00Z',
          },
          services: { total: 8, healthy: 8, unavailable: 0 },
        },
      },
    })

    render(<SelfHostedInfrastructureDiagram />)

    expect(screen.getByText('Self-host Runtime')).toBeInTheDocument()
    expect(screen.getByText('12%')).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()
    expect(screen.getByText('67%')).toBeInTheDocument()
    expect(screen.getByText('22/60')).toBeInTheDocument()
    expect(screen.getByText('8/8')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Settings' })).toHaveAttribute(
      'href',
      '/project/default/settings/general'
    )
  })

  it('keeps the accepted health view when telemetry is not reported yet', () => {
    mockUseProjectOperationsQuery.mockReturnValue({
      isPending: false,
      data: {
        generatedAt: '2026-07-14T18:00:00Z',
        status: 'healthy',
        services: { database: 'healthy' },
        deployment: { commit: 'abc1234', version: '0.2.0' },
        backup: { status: 'unavailable' },
        migration: { status: 'unavailable' },
        infrastructure: {
          database: { host: 'db', port: 5432, maxClientConnections: 60 },
          services: { total: 1, healthy: 1, unavailable: 0 },
        },
      },
    })

    render(<SelfHostedInfrastructureDiagram />)

    expect(screen.getAllByText('Awaiting telemetry')).toHaveLength(3)
    expect(screen.getByText('Max 60')).toBeInTheDocument()
    expect(screen.getByText('1/1')).toBeInTheDocument()
    expect(screen.getByText('Telemetry pending')).toBeInTheDocument()
  })
})
