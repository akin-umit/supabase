import type { components } from 'api-types'

import { assertSelfHosted } from './util'
import { PROJECT_ENDPOINT, PROJECT_ENDPOINT_PROTOCOL } from '@/lib/constants/api'

export type SelfHostedAuthConfig = components['schemas']['GoTrueConfigResponse']

const boolEnv = (name: string, defaultValue = false) => {
  const value = process.env[name]
  if (value === undefined || value === '') return defaultValue
  return value === 'true' || value === '1'
}

const numberEnv = (name: string, defaultValue: number) => {
  const value = process.env[name]
  if (!value) return defaultValue

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : defaultValue
}

const stringEnv = (name: string, defaultValue = '') => process.env[name] ?? defaultValue

const providerDefaults = {
  EXTERNAL_APPLE_ENABLED: false,
  EXTERNAL_AZURE_ENABLED: false,
  EXTERNAL_BITBUCKET_ENABLED: false,
  EXTERNAL_DISCORD_ENABLED: false,
  EXTERNAL_FACEBOOK_ENABLED: false,
  EXTERNAL_FIGMA_ENABLED: false,
  EXTERNAL_GITHUB_ENABLED: false,
  EXTERNAL_GITLAB_ENABLED: false,
  EXTERNAL_GOOGLE_ENABLED: false,
  EXTERNAL_KAKAO_ENABLED: false,
  EXTERNAL_KEYCLOAK_ENABLED: false,
  EXTERNAL_LINKEDIN_OIDC_ENABLED: false,
  EXTERNAL_NOTION_ENABLED: false,
  EXTERNAL_SLACK_ENABLED: false,
  EXTERNAL_SLACK_OIDC_ENABLED: false,
  EXTERNAL_SPOTIFY_ENABLED: false,
  EXTERNAL_TWITCH_ENABLED: false,
  EXTERNAL_TWITTER_ENABLED: false,
  EXTERNAL_WEB3_ETHEREUM_ENABLED: false,
  EXTERNAL_WEB3_SOLANA_ENABLED: false,
  EXTERNAL_WORKOS_ENABLED: false,
  EXTERNAL_X_ENABLED: false,
  EXTERNAL_ZOOM_ENABLED: false,
  SAML_ENABLED: false,
}

export function getSelfHostedAuthConfig(): SelfHostedAuthConfig {
  assertSelfHosted()

  const config = {
    ...providerDefaults,
    DISABLE_SIGNUP: boolEnv('DISABLE_SIGNUP'),
    EXTERNAL_ANONYMOUS_USERS_ENABLED: boolEnv('ENABLE_ANONYMOUS_USERS'),
    EXTERNAL_EMAIL_ENABLED: boolEnv('ENABLE_EMAIL_SIGNUP', true),
    EXTERNAL_PHONE_ENABLED: boolEnv('ENABLE_PHONE_SIGNUP'),
    MAILER_AUTOCONFIRM: boolEnv('ENABLE_EMAIL_AUTOCONFIRM'),
    MAILER_OTP_EXP: numberEnv('MAILER_OTP_EXP', 3600),
    MAILER_OTP_LENGTH: numberEnv('MAILER_OTP_LENGTH', 6),
    MAILER_SECURE_EMAIL_CHANGE_ENABLED: boolEnv('MAILER_SECURE_EMAIL_CHANGE_ENABLED', true),
    PASSWORD_HIBP_ENABLED: boolEnv('PASSWORD_HIBP_ENABLED'),
    PASSWORD_MIN_LENGTH: numberEnv('PASSWORD_MIN_LENGTH', 6),
    PASSWORD_REQUIRED_CHARACTERS: stringEnv('PASSWORD_REQUIRED_CHARACTERS'),
    SECURITY_CAPTCHA_ENABLED: boolEnv('SECURITY_CAPTCHA_ENABLED'),
    SECURITY_MANUAL_LINKING_ENABLED: boolEnv('SECURITY_MANUAL_LINKING_ENABLED'),
    SECURITY_REFRESH_TOKEN_REUSE_INTERVAL: numberEnv('SECURITY_REFRESH_TOKEN_REUSE_INTERVAL', 10),
    REFRESH_TOKEN_ROTATION_ENABLED: boolEnv('SECURITY_REFRESH_TOKEN_ROTATION_ENABLED', true),
    SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD: boolEnv(
      'SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD'
    ),
    SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION: boolEnv(
      'SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION'
    ),
    SITE_URL: stringEnv('SITE_URL', `${PROJECT_ENDPOINT_PROTOCOL}://${PROJECT_ENDPOINT}`),
    SMS_AUTOCONFIRM: boolEnv('ENABLE_PHONE_AUTOCONFIRM'),
    SMS_OTP_EXP: numberEnv('SMS_OTP_EXP', 60),
    SMS_OTP_LENGTH: numberEnv('SMS_OTP_LENGTH', 6),
    SMS_PROVIDER: stringEnv('SMS_PROVIDER'),
    SMS_TEMPLATE: stringEnv('SMS_TEMPLATE'),
    SMS_TEST_OTP: stringEnv('SMS_TEST_OTP'),
    SMS_TEST_OTP_VALID_UNTIL: stringEnv('SMS_TEST_OTP_VALID_UNTIL'),
  }

  return config as unknown as SelfHostedAuthConfig
}
