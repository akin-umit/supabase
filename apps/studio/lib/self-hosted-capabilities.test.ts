import { describe, expect, it } from 'vitest'

import { getSelfHostedCapability, SELF_HOSTED_CAPABILITIES } from './self-hosted-capabilities'

describe('self-hosted capabilities', () => {
  it('marks Log Drains as planned until a self-host sink backend exists', () => {
    expect(getSelfHostedCapability('log-drains')).toMatchObject({
      state: 'planned',
      backend: expect.stringContaining('Vector/Logflare'),
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
