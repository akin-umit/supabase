import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import JWTSigningKeysPage from '@/pages/project/[ref]/settings/jwt/index'

const { mockIsPlatform, mockUseAsyncCheckPermissions } = vi.hoisted(() => ({
  mockIsPlatform: { value: true },
  mockUseAsyncCheckPermissions: vi.fn(),
}))

vi.mock('common', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('common')
  return {
    ...actual,
    get IS_PLATFORM() {
      return mockIsPlatform.value
    },
  }
})

vi.mock('@/hooks/misc/useCheckPermissions', () => ({
  useAsyncCheckPermissions: mockUseAsyncCheckPermissions,
}))

vi.mock('@/components/layouts/DefaultLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/layouts/ProjectSettingsLayout/SettingsLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/layouts/JWTKeys/JWTKeysLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/interfaces/JwtSecrets/jwt-secret-keys-table', () => ({
  JWTSecretKeysTable: () => <div>JWTSecretKeysTable</div>,
}))

describe('/project/[ref]/settings/jwt', () => {
  beforeEach(() => {
    mockIsPlatform.value = true
    mockUseAsyncCheckPermissions.mockReturnValue({ can: true, isSuccess: true })
  })

  it('renders the JWT signing keys table on platform', () => {
    render(<JWTSigningKeysPage dehydratedState={{}} />)

    expect(screen.getByText('JWTSecretKeysTable')).toBeInTheDocument()
  })

  it('renders the self-hosted JWT surface without waiting for platform permissions', () => {
    mockIsPlatform.value = false
    mockUseAsyncCheckPermissions.mockReturnValue({ can: false, isSuccess: false })

    render(<JWTSigningKeysPage dehydratedState={{}} />)

    expect(screen.getByText('JWTSecretKeysTable')).toBeInTheDocument()
  })
})
