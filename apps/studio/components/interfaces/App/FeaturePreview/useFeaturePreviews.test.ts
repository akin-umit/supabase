import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useFeaturePreviews } from './useFeaturePreviews'

vi.mock('common', async (importOriginal) => ({
  ...(await importOriginal<typeof import('common')>()),
  useFlag: () => true,
}))

describe('useFeaturePreviews', () => {
  it('marks only hosted control-plane previews as platform-only', () => {
    const { result } = renderHook(() => useFeaturePreviews())
    const selfHosted = result.current.filter((preview) => !preview.isPlatformOnly)
    const platformOnly = result.current.filter((preview) => preview.isPlatformOnly)

    expect(selfHosted.map((preview) => preview.name)).toEqual(
      expect.arrayContaining([
        'Updated Logs interface',
        'Disable Advisor rules',
        'PG Delta Diff',
        'Column-level privileges',
        'Disable snippet auto-saving',
      ])
    )
    expect(platformOnly.map((preview) => preview.name)).toEqual(
      expect.arrayContaining(['Platform webhooks', 'Temporary access', 'Integrations layout'])
    )
  })
})
