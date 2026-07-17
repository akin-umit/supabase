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
    expect(config.RATE_LIMIT_EMAIL_SENT).toBe(2)
    expect(config.SESSIONS_TIMEBOX).toBe(0)
    expect(config.PASSKEY_ENABLED).toBe(false)
    expect(config.CUSTOM_OAUTH_ENABLED).toBe(false)
    expect(config.CUSTOM_OAUTH_MAX_PROVIDERS).toBe(0)
    expect(config.MFA_TOTP_ENROLL_ENABLED).toBe(true)
    expect(config.MFA_TOTP_VERIFY_ENABLED).toBe(true)
    expect(config.MFA_MAX_ENROLLED_FACTORS).toBe(10)
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

  it('maps GoTrue-prefixed self-host env vars into auth subpages', () => {
    vi.stubEnv('GOTRUE_SITE_URL', 'https://auth.example.com')
    vi.stubEnv('GOTRUE_URI_ALLOW_LIST', 'https://app.example.com/callback')
    vi.stubEnv('GOTRUE_SMTP_ADMIN_EMAIL', 'noreply@example.com')
    vi.stubEnv('GOTRUE_SMTP_SENDER_NAME', 'Example Auth')
    vi.stubEnv('GOTRUE_SMTP_HOST', 'smtp.example.com')
    vi.stubEnv('GOTRUE_SMTP_PORT', '587')
    vi.stubEnv('GOTRUE_SMTP_USER', 'smtp-user')
    vi.stubEnv('GOTRUE_SMTP_PASS', 'smtp-pass')
    vi.stubEnv('GOTRUE_SMTP_MAX_FREQUENCY', '30s')
    vi.stubEnv('GOTRUE_RATE_LIMIT_EMAIL_SENT', '60')
    vi.stubEnv('GOTRUE_SESSIONS_TIMEBOX', '24h')
    vi.stubEnv('GOTRUE_SESSIONS_INACTIVITY_TIMEOUT', '30m')
    vi.stubEnv('GOTRUE_PASSKEY_ENABLED', 'true')
    vi.stubEnv('GOTRUE_WEBAUTHN_RP_ID', 'example.com')
    vi.stubEnv('GOTRUE_CUSTOM_OAUTH_ENABLED', 'true')
    vi.stubEnv('GOTRUE_CUSTOM_OAUTH_MAX_PROVIDERS', '3')
    vi.stubEnv('GOTRUE_MFA_PHONE_VERIFY_ENABLED', 'true')
    vi.stubEnv('GOTRUE_MFA_MAX_ENROLLED_FACTORS', '5')
    vi.stubEnv('GOTRUE_HOOK_SEND_EMAIL_ENABLED', 'true')
    vi.stubEnv('GOTRUE_HOOK_SEND_EMAIL_URI', 'http://functions:9000/email')

    const config = getSelfHostedAuthConfig()

    expect(config.SITE_URL).toBe('https://auth.example.com')
    expect(config.URI_ALLOW_LIST).toBe('https://app.example.com/callback')
    expect(config.SMTP_ADMIN_EMAIL).toBe('noreply@example.com')
    expect(config.SMTP_SENDER_NAME).toBe('Example Auth')
    expect(config.SMTP_HOST).toBe('smtp.example.com')
    expect(config.SMTP_PORT).toBe('587')
    expect(config.SMTP_USER).toBe('smtp-user')
    expect(config.SMTP_PASS).toBe('smtp-pass')
    expect(config.SMTP_MAX_FREQUENCY).toBe(30)
    expect(config.RATE_LIMIT_EMAIL_SENT).toBe(60)
    expect(config.SESSIONS_TIMEBOX).toBe(86400)
    expect(config.SESSIONS_INACTIVITY_TIMEOUT).toBe(1800)
    expect(config.PASSKEY_ENABLED).toBe(true)
    expect(config.WEBAUTHN_RP_ID).toBe('example.com')
    expect(config.CUSTOM_OAUTH_ENABLED).toBe(true)
    expect(config.CUSTOM_OAUTH_MAX_PROVIDERS).toBe(3)
    expect(config.MFA_PHONE_VERIFY_ENABLED).toBe(true)
    expect(config.MFA_MAX_ENROLLED_FACTORS).toBe(5)
    expect(config.HOOK_SEND_EMAIL_ENABLED).toBe(true)
    expect(config.HOOK_SEND_EMAIL_URI).toBe('http://functions:9000/email')
  })
})
