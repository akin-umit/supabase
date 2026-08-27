import { describe, expect, it } from 'vitest'

import { getSelfHostedCapability, SELF_HOSTED_CAPABILITIES } from './self-hosted-capabilities'

describe('self-hosted capabilities', () => {
  it('marks Log Drains as backed by runtime configuration', () => {
    expect(getSelfHostedCapability('log-drains')).toMatchObject({
      state: 'runtime-config',
      backend: expect.stringContaining('Vector/Logflare'),
    })
  })

  it('keeps upstream feature-preview gaps as explicit self-host runtime roadmap items', () => {
    expect(getSelfHostedCapability('query-diagnostics')).toMatchObject({
      state: 'runtime-roadmap',
      title: expect.stringContaining('Diagnose blocked queries'),
    })
    expect(getSelfHostedCapability('rls-tester')).toMatchObject({
      state: 'runtime-roadmap',
      backend: expect.stringContaining('sandbox'),
    })
    expect(getSelfHostedCapability('temporary-db-access')).toMatchObject({
      state: 'runtime-roadmap',
      description: expect.stringContaining('local controller'),
    })
  })

  it('classifies every self-host capability with an explicit backend requirement', () => {
    for (const capability of Object.values(SELF_HOSTED_CAPABILITIES)) {
      expect(['active', 'runtime-config', 'runtime-roadmap']).toContain(capability.state)
      expect(capability.title).not.toHaveLength(0)
      expect(capability.description).not.toHaveLength(0)
      expect(capability.backend).not.toHaveLength(0)
    }
  })
})
