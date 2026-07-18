import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useGenerateSettingsMenu } from './SettingsMenu.utils'
import { useIsFeatureEnabled } from '@/hooks/misc/useIsFeatureEnabled'
import { SHORTCUT_IDS } from '@/state/shortcuts/registry'

const getShortcutId = (item: unknown) => (item as { shortcutId?: string } | undefined)?.shortcutId

vi.mock('@/lib/constants', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/constants')
  return {
    ...actual,
    IS_PLATFORM: false,
  }
})

vi.mock('common', () => ({
  useFlag: vi.fn().mockReturnValue(true),
  useParams: vi.fn().mockReturnValue({ ref: 'project-ref' }),
}))

vi.mock('@/hooks/misc/useSelectedOrganization', () => ({
  useSelectedOrganizationQuery: vi.fn().mockReturnValue({ data: { slug: 'my-org' } }),
}))

vi.mock('@/hooks/misc/useSelectedProject', () => ({
  useSelectedProjectQuery: vi.fn().mockReturnValue({ data: { status: 'ACTIVE_HEALTHY' } }),
}))

vi.mock('@/hooks/misc/useIsFeatureEnabled', () => ({
  useIsFeatureEnabled: vi.fn(),
}))

vi.mock('@/components/interfaces/App/FeaturePreview/FeaturePreviewContext', () => ({
  useIsPlatformWebhooksEnabled: vi.fn().mockReturnValue(false),
}))

describe('useGenerateSettingsMenu (self-hosted)', () => {
  beforeEach(() => {
    vi.mocked(useIsFeatureEnabled).mockReturnValue({
      projectSettingsLegacyJwtKeys: false,
      billingAll: true,
      logsAll: true,
      projectSettingsLogDrains: true,
    } as any)
  })

  it('includes General, API Keys, JWT Keys, and Log Drains in self-hosted mode', () => {
    const { result } = renderHook(() => useGenerateSettingsMenu())
    const configGroup = result.current.find((group) => group.title === 'Configuration')

    expect(configGroup?.items.some((item) => item.key === 'general')).toBe(true)
    expect(configGroup?.items.some((item) => item.key === 'api-keys')).toBe(true)
    expect(configGroup?.items.some((item) => item.key === 'jwt')).toBe(true)
    expect(configGroup?.items.find((item) => item.key === 'jwt')?.url).toBe(
      '/project/project-ref/settings/jwt'
    )
    expect(getShortcutId(configGroup?.items.find((item) => item.key === 'jwt'))).toBe(
      SHORTCUT_IDS.NAV_PROJECT_SETTINGS_JWT_KEYS
    )
    expect(configGroup?.items.some((item) => item.key === 'log-drains')).toBe(true)
    expect(getShortcutId(configGroup?.items.find((item) => item.key === 'log-drains'))).toBe(
      SHORTCUT_IDS.NAV_PROJECT_SETTINGS_LOG_DRAINS
    )
  })

  it('hides Log Drains in self-hosted mode when logs:all is disabled', () => {
    vi.mocked(useIsFeatureEnabled).mockReturnValue({
      projectSettingsLegacyJwtKeys: false,
      billingAll: true,
      logsAll: false,
      projectSettingsLogDrains: true,
    } as any)

    const { result } = renderHook(() => useGenerateSettingsMenu())
    const configGroup = result.current.find((group) => group.title === 'Configuration')

    expect(configGroup?.items.some((item) => item.key === 'log-drains')).toBe(false)
  })

  it('hides Log Drains in self-hosted mode when project_settings:log_drains is disabled', () => {
    vi.mocked(useIsFeatureEnabled).mockReturnValue({
      projectSettingsLegacyJwtKeys: false,
      billingAll: true,
      logsAll: true,
      projectSettingsLogDrains: false,
    } as any)

    const { result } = renderHook(() => useGenerateSettingsMenu())
    const configGroup = result.current.find((group) => group.title === 'Configuration')

    expect(configGroup?.items.some((item) => item.key === 'log-drains')).toBe(false)
  })

  it('includes Data API and Vault integrations in self-hosted mode', () => {
    const { result } = renderHook(() => useGenerateSettingsMenu())
    const integrationsGroup = result.current.find((group) => group.title === 'Integrations')

    expect(integrationsGroup?.items.some((item) => item.key === 'api')).toBe(true)
    expect(integrationsGroup?.items.some((item) => item.key === 'vault')).toBe(true)
  })

  it('links dashboard preferences to the project settings surface', () => {
    const { result } = renderHook(() => useGenerateSettingsMenu())
    const configGroup = result.current.find((group) => group.title === 'Configuration')
    const dashboardItem = configGroup?.items.find((item) => item.key === 'dashboard')

    expect(dashboardItem?.name).toBe('Dashboard Preferences')
    expect(dashboardItem?.url).toBe('/project/project-ref/settings/dashboard')
  })

  it('includes the standard project settings surfaces in self-hosted mode', () => {
    const { result } = renderHook(() => useGenerateSettingsMenu())
    const configGroup = result.current.find((group) => group.title === 'Configuration')

    expect(configGroup?.items.some((item) => item.key === 'compute-and-disk')).toBe(true)
    expect(configGroup?.items.some((item) => item.key === 'infrastructure')).toBe(true)
    expect(configGroup?.items.some((item) => item.key === 'integrations')).toBe(true)
    expect(configGroup?.items.some((item) => item.key === 'addons')).toBe(true)
  })

  it('omits billing links in self-hosted mode', () => {
    const { result } = renderHook(() => useGenerateSettingsMenu())
    const billingGroup = result.current.find((group) => group.title === 'Billing')

    expect(billingGroup).toBeUndefined()
  })
})
