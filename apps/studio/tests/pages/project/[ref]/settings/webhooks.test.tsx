import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import WebhooksPage from '@/pages/project/[ref]/settings/webhooks'
import WebhookEndpointPage from '@/pages/project/[ref]/settings/webhooks/[endpointId]'

const { mockIsPlatform, mockQuery } = vi.hoisted(() => ({
  mockIsPlatform: { value: false },
  mockQuery: { endpointId: 'endpoint-1' as string | string[] | undefined },
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

vi.mock('next/router', () => ({
  useRouter: () => ({ query: mockQuery }),
}))

vi.mock('@/components/layouts/DefaultLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/layouts/ProjectSettingsLayout/SettingsLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/interfaces/Platform/Webhooks', () => ({
  PlatformWebhooksPage: ({ endpointId }: { endpointId?: string }) => (
    <div>PlatformWebhooksPage {endpointId}</div>
  ),
}))

vi.mock('@/components/interfaces/Platform/Webhooks/SelfHostedWebhooks', () => ({
  SelfHostedWebhooks: ({ endpointId }: { endpointId?: string }) => (
    <div>SelfHostedWebhooks {endpointId}</div>
  ),
}))

describe('/project/[ref]/settings/webhooks', () => {
  beforeEach(() => {
    mockIsPlatform.value = false
    mockQuery.endpointId = 'endpoint-1'
  })

  it('does not render mock platform webhooks in self-hosted mode', () => {
    render(<WebhooksPage dehydratedState={{}} />)

    expect(screen.getByText('SelfHostedWebhooks')).toBeInTheDocument()
    expect(screen.queryByText(/PlatformWebhooksPage/)).not.toBeInTheDocument()
  })

  it('does not render mock endpoint details in self-hosted mode', () => {
    render(<WebhookEndpointPage dehydratedState={{}} />)

    expect(screen.getByText('SelfHostedWebhooks endpoint-1')).toBeInTheDocument()
    expect(screen.queryByText(/PlatformWebhooksPage/)).not.toBeInTheDocument()
  })

  it('keeps the platform webhooks surface on platform', () => {
    mockIsPlatform.value = true

    render(<WebhookEndpointPage dehydratedState={{}} />)

    expect(screen.getByText('PlatformWebhooksPage endpoint-1')).toBeInTheDocument()
  })
})
