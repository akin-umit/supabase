import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getSelfHostedUsageServices, SelfHostedUsageSection } from './SelfHostedUsageSection'

const mockUseSelfHostedUsageQuery = vi.fn()

vi.mock('common', async (importOriginal) => ({
  ...(await importOriginal<typeof import('common')>()),
  useParams: () => ({ ref: 'default' }),
}))
vi.mock('@/data/analytics/self-hosted-usage-query', () => ({
  useSelfHostedUsageQuery: (...args: unknown[]) => mockUseSelfHostedUsageQuery(...args),
}))
vi.mock('ui-patterns/LogsBarChart', () => ({
  LogsBarChart: ({ data, EmptyState }: { data: unknown[]; EmptyState: React.ReactNode }) =>
    data.length === 0 ? EmptyState : <div data-testid="usage-chart">{JSON.stringify(data)}</div>,
}))

describe('getSelfHostedUsageServices', () => {
  it('maps Logflare api counts and totals each service', () => {
    const usage = getSelfHostedUsageServices(
      [
        {
          timestamp: '2026-07-12T09:00:00Z',
          total_api_requests: 12,
          total_functions_requests: 5,
          total_rest_requests: 10,
          total_auth_requests: 4,
          total_storage_requests: 3,
          total_realtime_requests: 2,
        },
      ],
      undefined
    )

    expect(usage.services.map(({ title, total }) => [title, total])).toEqual([
      ['API Gateway', 12],
      ['Edge Functions', 5],
      ['Postgres / REST', 10],
      ['Storage', 3],
      ['Realtime', 2],
      ['Auth', 4],
    ])
  })
})

describe('SelfHostedUsageSection', () => {
  beforeEach(() => {
    mockUseSelfHostedUsageQuery.mockReset()
  })

  it('requests only the last 24 hours and renders service charts and the total', () => {
    mockUseSelfHostedUsageQuery.mockReturnValue({
      isPending: false,
      error: null,
      data: {
        result: [
          {
            timestamp: '2026-07-12T09:00:00Z',
            total_api_requests: 12,
            total_functions_requests: 5,
            total_rest_requests: 10,
            total_auth_requests: 4,
            total_storage_requests: 3,
            total_realtime_requests: 2,
          },
        ],
      },
    })

    render(<SelfHostedUsageSection />)

    expect(mockUseSelfHostedUsageQuery).toHaveBeenCalledWith('default', {
      refetchOnWindowFocus: false,
    })
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getAllByTestId('usage-chart')).toHaveLength(6)
  })

  it('renders loading and empty states', () => {
    mockUseSelfHostedUsageQuery.mockReturnValue({ isPending: true, error: null })
    const { rerender } = render(<SelfHostedUsageSection />)

    expect(screen.getByRole('generic', { busy: true })).toBeInTheDocument()
    expect(screen.queryByText('Total requests')).not.toBeInTheDocument()

    mockUseSelfHostedUsageQuery.mockReturnValue({
      isPending: false,
      error: null,
      data: { result: [] },
    })
    rerender(<SelfHostedUsageSection />)
    expect(screen.getAllByText('No requests in the last 24 hours')).toHaveLength(6)
  })

  it('renders a restrained error and retries', () => {
    const refetch = vi.fn()
    mockUseSelfHostedUsageQuery.mockReturnValue({
      isPending: false,
      isFetching: false,
      error: new Error('internal Logflare detail'),
      refetch,
    })

    render(<SelfHostedUsageSection />)

    expect(screen.getByText('Usage data is unavailable')).toBeInTheDocument()
    expect(screen.queryByText('internal Logflare detail')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
