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

describe('/project/[ref]/settings/compute-and-disk', () => {
  beforeEach(() => {
    mockIsPlatform.value = false
    mockReplace.mockReset()
  })

  it('redirects self-hosted projects to the single infrastructure settings surface', () => {
    render(<ComputeAndDiskPage dehydratedState={{}} />)

    expect(mockReplace).toHaveBeenCalledWith('/project/default/settings/infrastructure')
    expect(screen.queryByText('CPU')).not.toBeInTheDocument()
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
