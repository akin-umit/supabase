import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getLegacySigningKey } from './signing-keys'

vi.mock('./util', () => ({
  assertSelfHosted: vi.fn(),
}))

describe('api/self-hosted/signing-keys', () => {
  let mockAssertSelfHosted: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()

    const util = await import('./util')
    mockAssertSelfHosted = vi.mocked(util.assertSelfHosted)
  })

  describe('getLegacySigningKey', () => {
    it('should call assertSelfHosted', () => {
      getLegacySigningKey()

      expect(mockAssertSelfHosted).toHaveBeenCalled()
    })

    it('should return a SigningKeyResponse-shaped legacy entry', () => {
      const key = getLegacySigningKey()

      expect(key).toEqual({
        id: 'legacy-hs256-unconfigured',
        algorithm: 'HS256',
        status: 'in_use',
        created_at: '1970-01-01T00:00:00.000Z',
        updated_at: '1970-01-01T00:00:00.000Z',
      })
    })

    it('should derive a non-secret key id from the runtime JWT secret', () => {
      const key = getLegacySigningKey({ JWT_SECRET: 'test-secret-value' })

      expect(key.id).toMatch(/^legacy-hs256-[a-f0-9]{16}$/)
      expect(key.id).not.toContain('test-secret-value')
    })
  })
})
