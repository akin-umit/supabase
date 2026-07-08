import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UnifiedLogsBanner } from './UnifiedLogsBanner'

const { unifiedLogsPreviewMock } = vi.hoisted(() => ({ unifiedLogsPreviewMock: vi.fn() }))

vi.mock('@/lib/constants', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/constants')
  return {
    ...actual,
    IS_PLATFORM: false,
  }
})

vi.mock('common', () => ({
  useParams: vi.fn().mockReturnValue({ ref: 'project-ref' }),
}))

vi.mock('next/router', () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
}))

vi.mock('../App/FeaturePreview/FeaturePreviewContext', () => ({
  useFeaturePreviewModal: vi.fn().mockReturnValue({ selectFeaturePreview: vi.fn() }),
  useUnifiedLogsPreview: unifiedLogsPreviewMock,
}))

describe('UnifiedLogsBanner (self-hosted)', () => {
  beforeEach(() => {
    unifiedLogsPreviewMock.mockReturnValue({
      enable: vi.fn(),
      disable: vi.fn(),
      isDefaultOptIn: false,
      isEnabled: false,
    })
  })

  it('renders nothing so unified logs cannot be enabled', () => {
    const { container } = render(<UnifiedLogsBanner />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing even if the preview somehow reports enabled', () => {
    unifiedLogsPreviewMock.mockReturnValue({
      enable: vi.fn(),
      disable: vi.fn(),
      isDefaultOptIn: false,
      isEnabled: true,
    })

    const { container } = render(<UnifiedLogsBanner />)

    expect(container).toBeEmptyDOMElement()
  })
})
