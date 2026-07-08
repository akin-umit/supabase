import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { UnifiedLogsBanner } from './UnifiedLogsBanner'

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
  useUnifiedLogsPreview: vi.fn().mockReturnValue({
    enable: vi.fn(),
    disable: vi.fn(),
    isDefaultOptIn: false,
    isEnabled: false,
  }),
}))

describe('UnifiedLogsBanner (self-hosted)', () => {
  it('renders nothing so unified logs cannot be enabled', () => {
    const { container } = render(<UnifiedLogsBanner />)

    expect(container).toBeEmptyDOMElement()
  })
})
