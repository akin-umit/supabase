import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ComputeAndDiskPage from '@/pages/project/[ref]/settings/compute-and-disk'

const { mockIsPlatform, mockReplace } = vi.hoisted(() => ({
  mockIsPlatform: { value: false },
  mockReplace: vi.fn(),
}))

vi.mock('common', () => ({
  useParams: () => ({ ref: 'default' }),
}))

vi.mock('next/router', () => ({
  useRouter: () => ({ replace: mockReplace }),
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

vi.mock('@/hooks/misc/useSelectedProject', () => ({
  useSelectedProjectQuery: () => ({
    data: {
      ref: 'default',
      databases: [{ identifier: 'default', infra_compute_size: 'medium' }],
    },
  }),
}))

vi.mock('@/data/operations/project-operations-query', () => ({
  useProjectOperationsQuery: () => ({
    data: {
      infrastructure: {
        runtime: {
          cpuPercent: 12,
          memoryPercent: 34,
          diskPercent: 56,
        },
      },
    },
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}))

describe('/project/[ref]/settings/compute-and-disk', () => {
  beforeEach(() => {
    mockIsPlatform.value = false
    mockReplace.mockReset()
  })

  it('shows the self-hosted VPS resource profile instead of redirecting', () => {
    render(<ComputeAndDiskPage dehydratedState={{}} />)

    expect(mockReplace).not.toHaveBeenCalled()
    expect(screen.getByText('VPS resource profile')).toBeInTheDocument()
    expect(screen.getByText('Self-hosted VPS')).toBeInTheDocument()
    expect(screen.getAllByText('Medium')).toHaveLength(2)
    expect(screen.getByText('12%')).toBeInTheDocument()
    expect(screen.getByText('34%')).toBeInTheDocument()
    expect(screen.getByText('56%')).toBeInTheDocument()
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
