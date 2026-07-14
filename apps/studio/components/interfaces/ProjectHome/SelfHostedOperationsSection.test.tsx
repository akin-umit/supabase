import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SelfHostedOperationsSection } from './SelfHostedOperationsSection'

const mockUseProjectOperationsQuery = vi.fn()

vi.mock('common', () => ({ useParams: () => ({ ref: 'default' }) }))
vi.mock('@/data/operations/project-operations-query', () => ({
  useProjectOperationsQuery: (...args: unknown[]) => mockUseProjectOperationsQuery(...args),
}))

describe('SelfHostedOperationsSection', () => {
  beforeEach(() => {
    mockUseProjectOperationsQuery.mockReset()
  })

  it('shows loading placeholders without operation values', () => {
    mockUseProjectOperationsQuery.mockReturnValue({ isPending: true, isError: false })
    render(<SelfHostedOperationsSection />)

    expect(screen.getByRole('heading', { name: 'Operations' })).toBeInTheDocument()
    expect(screen.getByRole('generic', { busy: true })).toBeInTheDocument()
    expect(screen.queryByText('Service health')).not.toBeInTheDocument()
  })

  it('renders service and infrastructure evidence without cloud-only claims', () => {
    mockUseProjectOperationsQuery.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        generatedAt: '2026-07-12T10:00:00Z',
        status: 'healthy',
        services: {
          database: 'healthy',
          storage: 'unavailable',
        },
        deployment: { commit: 'a1b2c3d', version: '1.2.3' },
        backup: { status: 'unavailable' },
        migration: { status: 'unavailable' },
        infrastructure: {
          database: { host: 'db', port: 5432, maxClientConnections: 200 },
          services: { total: 2, healthy: 1, unavailable: 1 },
        },
      },
    })

    render(<SelfHostedOperationsSection />)

    expect(screen.getByText('Service / Infrastructure')).toBeInTheDocument()
    expect(
      screen.getByText('Self-hosted evidence from management services and operator checks.')
    ).toBeInTheDocument()
    expect(screen.getByText('a1b2c3d')).toBeInTheDocument()
    expect(screen.getByText('Needs attention: Storage')).toBeInTheDocument()
    expect(screen.getByText('Version 1.2.3')).toBeInTheDocument()
    expect(screen.getByText('db:5432')).toBeInTheDocument()
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getByText('1 service needs operator attention.')).toBeInTheDocument()
    expect(screen.getByText('200 max pooler connections')).toBeInTheDocument()
    expect(screen.getAllByText('Database')).toHaveLength(2)
    expect(screen.getByText('Storage')).toBeInTheDocument()
    expect(screen.getAllByText('Healthy')).toHaveLength(4)
    expect(screen.getAllByText('Unavailable')).toHaveLength(3)
    expect(screen.getAllByText('Awaiting evidence')).toHaveLength(2)
  })

  it('renders canonical backup and migration timestamps', () => {
    mockUseProjectOperationsQuery.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        generatedAt: '2026-07-12T10:00:00Z',
        status: 'degraded',
        services: { database: 'unavailable', auth: 'healthy' },
        deployment: { commit: 'unknown', version: '0.2.0' },
        backup: { status: 'verified', lastVerifiedAt: '2026-07-12T08:00:00Z' },
        migration: {
          status: 'applied',
          lastApplied: '202607120900_add_index',
          appliedAt: '2026-07-12T09:00:00Z',
        },
        infrastructure: {
          database: { host: 'db', port: 5432 },
          services: { total: 2, healthy: 1, unavailable: 1 },
        },
      },
    })

    render(<SelfHostedOperationsSection />)

    expect(screen.getByText('Needs attention: Database')).toBeInTheDocument()
    expect(screen.getByText('202607120900_add_index')).toBeInTheDocument()
    expect(screen.getByText(/^Applied \d/)).toBeInTheDocument()
    expect(screen.getAllByText('Healthy')).toHaveLength(3)
    expect(screen.getAllByText('Degraded')).toHaveLength(3)
  })

  it('strips credential-shaped database hosts before rendering', () => {
    mockUseProjectOperationsQuery.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        generatedAt: '2026-07-12T10:00:00Z',
        status: 'healthy',
        services: {
          database: 'healthy',
        },
        deployment: { commit: 'a1b2c3d', version: '1.2.3' },
        backup: { status: 'unavailable' },
        migration: { status: 'unavailable' },
        infrastructure: {
          database: { host: 'postgres://admin:secret@db.internal:5432/postgres', port: 5432 },
          services: { total: 1, healthy: 1, unavailable: 0 },
        },
      },
    })

    render(<SelfHostedOperationsSection />)

    expect(screen.getByText('db.internal:5432')).toBeInTheDocument()
    expect(screen.queryByText(/admin:secret/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/postgres:\/\//i)).not.toBeInTheDocument()
  })

  it('shows a restrained request error and retries without exposing raw errors', () => {
    const refetch = vi.fn()
    mockUseProjectOperationsQuery.mockReturnValue({
      isPending: false,
      isError: true,
      isFetching: false,
      error: new Error('database password leaked'),
      refetch,
    })

    render(<SelfHostedOperationsSection />)
    expect(screen.getByText('Operations data is unavailable')).toBeInTheDocument()
    expect(screen.queryByText(/database password/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
