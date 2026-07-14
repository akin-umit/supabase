import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getSelfHostedAuthConfig } from './auth-config'

vi.mock('./util', () => ({
  assertSelfHosted: vi.fn(),
}))

vi.mock('@/lib/constants/api', () => ({
  PROJECT_ENDPOINT: 'supabase.example.com',
  PROJECT_ENDPOINT_PROTOCOL: 'https',
}))

describe('api/self-hosted/auth-config', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns a complete enough config for auth settings pages to render', () => {
    const config = getSelfHostedAuthConfig()

    expect(config.SITE_URL).toBe('https://supabase.example.com')
    expect(config.EXTERNAL_EMAIL_ENABLED).toBe(true)
    expect(config.EXTERNAL_PHONE_ENABLED).toBe(false)
    expect(config.MAILER_OTP_EXP).toBe(3600)
    expect(config.MAILER_OTP_LENGTH).toBe(6)
    expect(config.SAML_ENABLED).toBe(false)
    expect(config.EXTERNAL_GITHUB_ENABLED).toBe(false)
    expect(config.REFRESH_TOKEN_ROTATION_ENABLED).toBe(true)
  })

  it('maps supported self-host env vars into the Studio config shape', () => {
    vi.stubEnv('SITE_URL', 'https://app.example.com')
    vi.stubEnv('DISABLE_SIGNUP', 'true')
    vi.stubEnv('ENABLE_EMAIL_SIGNUP', 'false')
    vi.stubEnv('ENABLE_ANONYMOUS_USERS', 'true')
    vi.stubEnv('ENABLE_PHONE_SIGNUP', 'true')
    vi.stubEnv('MAILER_OTP_EXP', '7200')
    vi.stubEnv('MAILER_OTP_LENGTH', '8')

    const config = getSelfHostedAuthConfig()

    expect(config.SITE_URL).toBe('https://app.example.com')
    expect(config.DISABLE_SIGNUP).toBe(true)
    expect(config.EXTERNAL_EMAIL_ENABLED).toBe(false)
    expect(config.EXTERNAL_ANONYMOUS_USERS_ENABLED).toBe(true)
    expect(config.EXTERNAL_PHONE_ENABLED).toBe(true)
    expect(config.MAILER_OTP_EXP).toBe(7200)
    expect(config.MAILER_OTP_LENGTH).toBe(8)
  })
})
