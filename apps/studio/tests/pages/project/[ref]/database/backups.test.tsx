import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import PitrBackupsPage from '@/pages/project/[ref]/database/backups/pitr'
import ScheduledBackupsPage from '@/pages/project/[ref]/database/backups/scheduled'

const { mockIsPlatform, mockOperationsQuery } = vi.hoisted(() => ({
  mockIsPlatform: { value: false },
  mockOperationsQuery: vi.fn(),
}))

vi.mock('common', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('common')
  return {
    ...actual,
    useParams: () => ({ ref: 'default' }),
  }
})

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
  DefaultLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/layouts/DatabaseLayout/DatabaseLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/interfaces/Database/Backups/BackupsList', () => ({
  BackupsList: () => <div>Cloud BackupsList</div>,
}))

vi.mock('@/components/interfaces/Database/Backups/DatabaseBackupsNav', () => ({
  __esModule: true,
  default: ({ active }: { active: string }) => <div>Backups nav {active}</div>,
}))

vi.mock('@/components/interfaces/Database/Backups/PITR/PITRNotice', () => ({
  PITRNotice: () => <div>Cloud PITRNotice</div>,
}))

vi.mock('@/components/interfaces/Database/Backups/PITR/PITRSelection', () => ({
  PITRSelection: () => <div>Cloud PITRSelection</div>,
}))

vi.mock('@/components/ui/UpgradeToPro', () => ({
  UpgradeToPro: () => <div>Cloud UpgradeToPro</div>,
}))

vi.mock('@/components/ui/HighAvailability/HighAvailabilityDisabledEmptyState', () => ({
  HighAvailabilityDisabledEmptyState: () => <div>Cloud HighAvailabilityDisabledEmptyState</div>,
}))

vi.mock('@/data/database/backups-query', () => ({
  useBackupsQuery: () => ({
    data: undefined,
    error: undefined,
    isPending: false,
    isError: false,
    isSuccess: true,
  }),
}))

vi.mock('@/data/operations/project-operations-query', () => ({
  useProjectOperationsQuery: mockOperationsQuery,
}))

vi.mock('@/hooks/misc/useCheckPermissions', () => ({
  useAsyncCheckPermissions: () => ({ can: true, isSuccess: true }),
}))

vi.mock('@/hooks/misc/useCheckEntitlements', () => ({
  useCheckEntitlements: () => ({ hasAccess: true, isLoading: false }),
}))

vi.mock('@/hooks/misc/useHighAvailability', () => ({
  useHighAvailability: () => ({ isHighAvailability: false }),
}))

vi.mock('@/hooks/misc/useSelectedProject', () => ({
  useIsOrioleDbInAws: () => false,
  useSelectedProjectQuery: () => ({ data: { status: 'ACTIVE_HEALTHY' }, isPending: false }),
}))

describe('/project/[ref]/database/backups self-hosted evidence', () => {
  beforeEach(() => {
    mockIsPlatform.value = false
    mockOperationsQuery.mockReturnValue({
      data: {
        generatedAt: '2026-08-05T14:30:00.000Z',
        backup: {
          status: 'verified',
          lastVerifiedAt: '2026-08-05T14:20:00.000Z',
        },
        migration: {
          status: 'applied',
          lastApplied: '20260805142000_schema',
          appliedAt: '2026-08-05T14:21:00.000Z',
        },
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
      isFetching: false,
    })
  })

  it('renders scheduled backup evidence from the self-hosted management API', () => {
    render(<ScheduledBackupsPage />)

    expect(screen.getByText('Scheduled backup evidence')).toBeInTheDocument()
    expect(screen.getByText('verified')).toBeInTheDocument()
    expect(screen.getByText('2026-08-05 14:20:00 UTC')).toBeInTheDocument()
    expect(screen.getByText('20260805142000_schema')).toBeInTheDocument()
    expect(screen.queryByText('Cloud BackupsList')).not.toBeInTheDocument()
  })

  it('renders PITR evidence from the self-hosted management API', () => {
    render(<PitrBackupsPage />)

    expect(screen.getByText('Point-in-time recovery evidence')).toBeInTheDocument()
    expect(screen.getByText('applied')).toBeInTheDocument()
    expect(screen.getByText('20260805142000_schema')).toBeInTheDocument()
    expect(screen.queryByText('Cloud PITRSelection')).not.toBeInTheDocument()
    expect(screen.queryByText('Cloud UpgradeToPro')).not.toBeInTheDocument()
  })
})
