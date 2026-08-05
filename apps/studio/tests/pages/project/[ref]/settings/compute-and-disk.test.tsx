import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ComputeAndDiskPage from '@/pages/project/[ref]/settings/compute-and-disk'

const { mockIsPlatform, mockOperationsQuery } = vi.hoisted(() => ({
  mockIsPlatform: { value: false },
  mockOperationsQuery: vi.fn(),
}))

vi.mock('common', () => ({
  useParams: () => ({ ref: 'default' }),
}))

vi.mock('@/lib/constants', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/constants')
  return {
    ...actual,
    get IS_PLATFORM() {
      return mockIsPlatform.value
    },
  }
})

vi.mock('@/components/layouts/DefaultLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/layouts/ProjectSettingsLayout/SettingsLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/interfaces/DiskManagement/DiskManagementForm', () => ({
  DiskManagementForm: () => <div>Cloud DiskManagementForm</div>,
}))

vi.mock('@/data/operations/project-operations-query', () => ({
  useProjectOperationsQuery: mockOperationsQuery,
}))

describe('/project/[ref]/settings/compute-and-disk', () => {
  beforeEach(() => {
    mockIsPlatform.value = false
    mockOperationsQuery.mockReturnValue({
      data: {
        infrastructure: {
          runtime: {
            cpuPercent: 43,
            memoryPercent: 44,
            diskPercent: 34,
            connectionsCurrent: 2,
            connectionsMax: 100,
          },
          services: { healthy: 8, total: 8, unavailable: 0 },
          database: { host: 'db', port: 5432, maxClientConnections: 100 },
        },
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
      isFetching: false,
    })
  })

  it('renders runtime-backed compute and disk evidence in self-hosted mode', () => {
    render(<ComputeAndDiskPage dehydratedState={{}} />)

    expect(
      screen.getByText('Inspect compute and disk telemetry from your self-hosted runtime.')
    ).toBeInTheDocument()
    expect(screen.getByText('CPU')).toBeInTheDocument()
    expect(screen.getByText('43%')).toBeInTheDocument()
    expect(screen.getByText('RAM')).toBeInTheDocument()
    expect(screen.getByText('44%')).toBeInTheDocument()
    expect(screen.getByText('Disk')).toBeInTheDocument()
    expect(screen.getByText('34%')).toBeInTheDocument()
    expect(screen.getByText('2/100')).toBeInTheDocument()
    expect(screen.getByText('8/8')).toBeInTheDocument()
    expect(screen.queryByText('Cloud DiskManagementForm')).not.toBeInTheDocument()
  })

  it('keeps the cloud disk management form on platform', () => {
    mockIsPlatform.value = true

    render(<ComputeAndDiskPage dehydratedState={{}} />)

    expect(screen.getByText('Cloud DiskManagementForm')).toBeInTheDocument()
    expect(
      screen.getByText('Configure the compute and disk settings for your project.')
    ).toBeInTheDocument()
  })
})
