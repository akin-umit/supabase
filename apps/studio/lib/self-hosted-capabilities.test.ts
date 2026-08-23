import { describe, expect, it } from 'vitest'

import { getSelfHostedCapability, SELF_HOSTED_CAPABILITIES } from './self-hosted-capabilities'

describe('self-hosted capabilities', () => {
  it('marks Log Drains as operator-managed with runtime visibility', () => {
    expect(getSelfHostedCapability('log-drains')).toMatchObject({
      state: 'operator-managed',
      backend: expect.stringContaining('Vector/Logflare'),
    })
  })

  it('keeps upstream feature-preview gaps as explicit self-host backlog items', () => {
    expect(getSelfHostedCapability('query-diagnostics')).toMatchObject({
      state: 'planned',
      title: expect.stringContaining('Diagnose blocked queries'),
    })
    expect(getSelfHostedCapability('rls-tester')).toMatchObject({
      state: 'planned',
      backend: expect.stringContaining('sandbox'),
    })
    expect(getSelfHostedCapability('temporary-db-access')).toMatchObject({
      state: 'planned',
      description: expect.stringContaining('platform-only'),
    })
  })

  it('classifies every self-host capability with an explicit backend requirement', () => {
    for (const capability of Object.values(SELF_HOSTED_CAPABILITIES)) {
      expect(['active', 'operator-managed', 'planned', 'cloud-only']).toContain(capability.state)
      expect(capability.title).not.toHaveLength(0)
      expect(capability.description).not.toHaveLength(0)
      expect(capability.backend).not.toHaveLength(0)
    }
  })
})
