import type { components } from 'api-types'

import { assertSelfHosted } from './util'
import { PROJECT_ENDPOINT, PROJECT_ENDPOINT_PROTOCOL } from '@/lib/constants/api'

export type SelfHostedAuthConfig = components['schemas']['GoTrueConfigResponse']

const envValue = (...names: string[]) => {
  for (const name of names) {
    const value = process.env[name]
    if (value !== undefined && value !== '') return value
  }
  return undefined
}

const boolEnv = (names: string | string[], defaultValue = false) => {
  const value = envValue(...(Array.isArray(names) ? names : [names]))
  if (value === undefined || value === '') return defaultValue
  return value === 'true' || value === '1'
}

const numberEnv = (names: string | string[], defaultValue: number) => {
  const value = envValue(...(Array.isArray(names) ? names : [names]))
  if (!value) return defaultValue

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : defaultValue
}

const stringEnv = (names: string | string[], defaultValue = '') =>
  envValue(...(Array.isArray(names) ? names : [names])) ?? defaultValue

const enumEnv = <T extends string>(
  names: string | string[],
  allowed: readonly T[],
  defaultValue: T
) => {
  const value = stringEnv(names, defaultValue)
  return allowed.includes(value as T) ? (value as T) : defaultValue
}

const durationEnvSeconds = (names: string | string[], defaultValue: number) => {
  const value = envValue(...(Array.isArray(names) ? names : [names]))
  if (!value) return defaultValue

  const match = value.trim().match(/^(\d+)(ms|s|m|h)?$/)
  if (!match) return numberEnv(names, defaultValue)

  const amount = Number(match[1])
  const unit = match[2] ?? 's'
  if (!Number.isFinite(amount)) return defaultValue

  switch (unit) {
    case 'ms':
      return Math.ceil(amount / 1000)
    case 'm':
      return amount * 60
    case 'h':
      return amount * 3600
    default:
      return amount
  }
}

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

const providerStringSettings = [
  'EXTERNAL_APPLE_CLIENT_ID',
  'EXTERNAL_APPLE_SECRET',
  'EXTERNAL_AZURE_CLIENT_ID',
  'EXTERNAL_AZURE_SECRET',
  'EXTERNAL_AZURE_URL',
  'EXTERNAL_BITBUCKET_CLIENT_ID',
  'EXTERNAL_BITBUCKET_SECRET',
  'EXTERNAL_DISCORD_CLIENT_ID',
  'EXTERNAL_DISCORD_SECRET',
  'EXTERNAL_FACEBOOK_CLIENT_ID',
  'EXTERNAL_FACEBOOK_SECRET',
  'EXTERNAL_FIGMA_CLIENT_ID',
  'EXTERNAL_FIGMA_SECRET',
  'EXTERNAL_GITHUB_CLIENT_ID',
  'EXTERNAL_GITHUB_SECRET',
  'EXTERNAL_GITLAB_CLIENT_ID',
  'EXTERNAL_GITLAB_SECRET',
  'EXTERNAL_GITLAB_URL',
  'EXTERNAL_GOOGLE_CLIENT_ID',
  'EXTERNAL_GOOGLE_SECRET',
  'EXTERNAL_KAKAO_CLIENT_ID',
  'EXTERNAL_KAKAO_SECRET',
  'EXTERNAL_KEYCLOAK_CLIENT_ID',
  'EXTERNAL_KEYCLOAK_SECRET',
  'EXTERNAL_KEYCLOAK_URL',
  'EXTERNAL_LINKEDIN_OIDC_CLIENT_ID',
  'EXTERNAL_LINKEDIN_OIDC_SECRET',
  'EXTERNAL_NOTION_CLIENT_ID',
  'EXTERNAL_NOTION_SECRET',
  'EXTERNAL_SLACK_CLIENT_ID',
  'EXTERNAL_SLACK_SECRET',
  'EXTERNAL_SLACK_OIDC_CLIENT_ID',
  'EXTERNAL_SLACK_OIDC_SECRET',
  'EXTERNAL_SPOTIFY_CLIENT_ID',
  'EXTERNAL_SPOTIFY_SECRET',
  'EXTERNAL_TWITCH_CLIENT_ID',
  'EXTERNAL_TWITCH_SECRET',
  'EXTERNAL_TWITTER_CLIENT_ID',
  'EXTERNAL_TWITTER_SECRET',
  'EXTERNAL_WORKOS_CLIENT_ID',
  'EXTERNAL_WORKOS_SECRET',
  'EXTERNAL_WORKOS_URL',
  'EXTERNAL_X_CLIENT_ID',
  'EXTERNAL_X_SECRET',
  'EXTERNAL_ZOOM_CLIENT_ID',
  'EXTERNAL_ZOOM_SECRET',
  'SAML_EXTERNAL_URL',
  'SMS_MESSAGEBIRD_ACCESS_KEY',
  'SMS_MESSAGEBIRD_ORIGINATOR',
  'SMS_TEXTLOCAL_API_KEY',
  'SMS_TEXTLOCAL_SENDER',
  'SMS_TWILIO_ACCOUNT_SID',
  'SMS_TWILIO_AUTH_TOKEN',
  'SMS_TWILIO_CONTENT_SID',
  'SMS_TWILIO_MESSAGE_SERVICE_SID',
  'SMS_TWILIO_VERIFY_ACCOUNT_SID',
  'SMS_TWILIO_VERIFY_AUTH_TOKEN',
  'SMS_TWILIO_VERIFY_MESSAGE_SERVICE_SID',
  'SMS_VONAGE_API_KEY',
  'SMS_VONAGE_API_SECRET',
  'SMS_VONAGE_FROM',
]

const providerBooleanSettings = [
  'EXTERNAL_APPLE_ENABLED',
  'EXTERNAL_APPLE_EMAIL_OPTIONAL',
  'EXTERNAL_AZURE_ENABLED',
  'EXTERNAL_AZURE_EMAIL_OPTIONAL',
  'EXTERNAL_BITBUCKET_ENABLED',
  'EXTERNAL_BITBUCKET_EMAIL_OPTIONAL',
  'EXTERNAL_DISCORD_ENABLED',
  'EXTERNAL_DISCORD_EMAIL_OPTIONAL',
  'EXTERNAL_FACEBOOK_ENABLED',
  'EXTERNAL_FACEBOOK_EMAIL_OPTIONAL',
  'EXTERNAL_FIGMA_ENABLED',
  'EXTERNAL_FIGMA_EMAIL_OPTIONAL',
  'EXTERNAL_GITHUB_ENABLED',
  'EXTERNAL_GITHUB_EMAIL_OPTIONAL',
  'EXTERNAL_GITLAB_ENABLED',
  'EXTERNAL_GITLAB_EMAIL_OPTIONAL',
  'EXTERNAL_GOOGLE_ENABLED',
  'EXTERNAL_GOOGLE_EMAIL_OPTIONAL',
  'EXTERNAL_GOOGLE_SKIP_NONCE_CHECK',
  'EXTERNAL_KAKAO_ENABLED',
  'EXTERNAL_KAKAO_EMAIL_OPTIONAL',
  'EXTERNAL_KEYCLOAK_ENABLED',
  'EXTERNAL_KEYCLOAK_EMAIL_OPTIONAL',
  'EXTERNAL_LINKEDIN_OIDC_ENABLED',
  'EXTERNAL_LINKEDIN_OIDC_EMAIL_OPTIONAL',
  'EXTERNAL_NOTION_ENABLED',
  'EXTERNAL_NOTION_EMAIL_OPTIONAL',
  'EXTERNAL_SLACK_ENABLED',
  'EXTERNAL_SLACK_EMAIL_OPTIONAL',
  'EXTERNAL_SLACK_OIDC_ENABLED',
  'EXTERNAL_SLACK_OIDC_EMAIL_OPTIONAL',
  'EXTERNAL_SPOTIFY_ENABLED',
  'EXTERNAL_SPOTIFY_EMAIL_OPTIONAL',
  'EXTERNAL_TWITCH_ENABLED',
  'EXTERNAL_TWITCH_EMAIL_OPTIONAL',
  'EXTERNAL_TWITTER_ENABLED',
  'EXTERNAL_TWITTER_EMAIL_OPTIONAL',
  'EXTERNAL_WEB3_ETHEREUM_ENABLED',
  'EXTERNAL_WEB3_SOLANA_ENABLED',
  'EXTERNAL_WORKOS_ENABLED',
  'EXTERNAL_X_ENABLED',
  'EXTERNAL_X_EMAIL_OPTIONAL',
  'EXTERNAL_ZOOM_ENABLED',
  'EXTERNAL_ZOOM_EMAIL_OPTIONAL',
  'SAML_ENABLED',
  'SAML_ALLOW_ENCRYPTED_ASSERTIONS',
]

function getProviderCredentialConfig() {
  return {
    ...Object.fromEntries(
      providerStringSettings.map((key) => [key, stringEnv([`GOTRUE_${key}`, key])])
    ),
    ...Object.fromEntries(
      providerBooleanSettings.map((key) => [key, boolEnv([`GOTRUE_${key}`, key])])
    ),
  }
}

const emailTemplateDefaults = {
  MAILER_SUBJECTS_CONFIRMATION: 'Confirm your signup',
  MAILER_TEMPLATES_CONFIRMATION_CONTENT:
    '<h2>Confirm your signup</h2><p>Follow this link to confirm your user:</p><p><a href="{{ .ConfirmationURL }}">Confirm your mail</a></p>',
  MAILER_SUBJECTS_INVITE: 'You have been invited',
  MAILER_TEMPLATES_INVITE_CONTENT:
    '<h2>You have been invited</h2><p>You have been invited to create a user on {{ .SiteURL }}. Follow this link to accept the invite:</p><p><a href="{{ .ConfirmationURL }}">Accept the invite</a></p>',
  MAILER_SUBJECTS_MAGIC_LINK: 'Your magic link',
  MAILER_TEMPLATES_MAGIC_LINK_CONTENT:
    '<h2>Magic Link</h2><p>Follow this link to login:</p><p><a href="{{ .ConfirmationURL }}">Log In</a></p>',
  MAILER_SUBJECTS_EMAIL_CHANGE: 'Confirm email change',
  MAILER_TEMPLATES_EMAIL_CHANGE_CONTENT:
    '<h2>Confirm Change of Email</h2><p>Follow this link to confirm the update of your email from {{ .Email }} to {{ .NewEmail }}:</p><p><a href="{{ .ConfirmationURL }}">Change Email</a></p>',
  MAILER_SUBJECTS_RECOVERY: 'Reset your password',
  MAILER_TEMPLATES_RECOVERY_CONTENT:
    '<h2>Reset Password</h2><p>Follow this link to reset the password for your user:</p><p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>',
  MAILER_SUBJECTS_REAUTHENTICATION: 'Confirm reauthentication',
  MAILER_TEMPLATES_REAUTHENTICATION_CONTENT:
    '<h2>Confirm reauthentication</h2><p>Enter the code: {{ .Token }}</p>',
  MAILER_SUBJECTS_PASSWORD_CHANGED_NOTIFICATION: 'Your password has been changed',
  MAILER_TEMPLATES_PASSWORD_CHANGED_NOTIFICATION_CONTENT:
    '<h2>Password changed</h2><p>Your password for {{ .SiteURL }} has been changed.</p>',
  MAILER_SUBJECTS_EMAIL_CHANGED_NOTIFICATION: 'Your email address has been changed',
  MAILER_TEMPLATES_EMAIL_CHANGED_NOTIFICATION_CONTENT:
    '<h2>Email changed</h2><p>Your email address for {{ .SiteURL }} has been changed.</p>',
  MAILER_SUBJECTS_PHONE_CHANGED_NOTIFICATION: 'Your phone number has been changed',
  MAILER_TEMPLATES_PHONE_CHANGED_NOTIFICATION_CONTENT:
    '<h2>Phone changed</h2><p>Your phone number for {{ .SiteURL }} has been changed.</p>',
  MAILER_SUBJECTS_IDENTITY_LINKED_NOTIFICATION: 'A sign-in method has been linked',
  MAILER_TEMPLATES_IDENTITY_LINKED_NOTIFICATION_CONTENT:
    '<h2>Sign-in method linked</h2><p>{{ .Provider }} has been linked to your account.</p>',
  MAILER_SUBJECTS_IDENTITY_UNLINKED_NOTIFICATION: 'A sign-in method has been removed',
  MAILER_TEMPLATES_IDENTITY_UNLINKED_NOTIFICATION_CONTENT:
    '<h2>Sign-in method removed</h2><p>{{ .Provider }} has been removed from your account.</p>',
  MAILER_SUBJECTS_MFA_FACTOR_ENROLLED_NOTIFICATION: 'An MFA method has been added',
  MAILER_TEMPLATES_MFA_FACTOR_ENROLLED_NOTIFICATION_CONTENT:
    '<h2>MFA method added</h2><p>A {{ .FactorType }} MFA method has been added to your account.</p>',
  MAILER_SUBJECTS_MFA_FACTOR_UNENROLLED_NOTIFICATION: 'An MFA method has been removed',
  MAILER_TEMPLATES_MFA_FACTOR_UNENROLLED_NOTIFICATION_CONTENT:
    '<h2>MFA method removed</h2><p>A {{ .FactorType }} MFA method has been removed from your account.</p>',
}

const securityNotificationIds = [
  'PASSWORD_CHANGED',
  'EMAIL_CHANGED',
  'PHONE_CHANGED',
  'IDENTITY_LINKED',
  'IDENTITY_UNLINKED',
  'MFA_FACTOR_ENROLLED',
  'MFA_FACTOR_UNENROLLED',
]

function getEmailTemplateConfig() {
  const config: Record<string, unknown> = {
    MAILER_SUBJECTS_CUSTOM_CONTENTS: {},
    MAILER_TEMPLATES_CUSTOM_CONTENTS: {},
  }

  Object.entries(emailTemplateDefaults).forEach(([key, fallback]) => {
    config[key] = stringEnv([`GOTRUE_${key}`, key], fallback)
  })

  securityNotificationIds.forEach((id) => {
    const key = `MAILER_NOTIFICATIONS_${id}_ENABLED`
    config[key] = boolEnv([`GOTRUE_${key}`, key], true)
  })

  return config
}

export function getSelfHostedAuthConfig(): SelfHostedAuthConfig {
  assertSelfHosted()

  const config = {
    ...providerDefaults,
    ...getProviderCredentialConfig(),
    ...getEmailTemplateConfig(),
    DISABLE_SIGNUP: boolEnv(['GOTRUE_DISABLE_SIGNUP', 'DISABLE_SIGNUP']),
    EXTERNAL_ANONYMOUS_USERS_ENABLED: boolEnv([
      'GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED',
      'ENABLE_ANONYMOUS_USERS',
    ]),
    EXTERNAL_EMAIL_ENABLED: boolEnv(['GOTRUE_EXTERNAL_EMAIL_ENABLED', 'ENABLE_EMAIL_SIGNUP'], true),
    EXTERNAL_PHONE_ENABLED: boolEnv(['GOTRUE_EXTERNAL_PHONE_ENABLED', 'ENABLE_PHONE_SIGNUP']),
    MAILER_AUTOCONFIRM: boolEnv(['GOTRUE_MAILER_AUTOCONFIRM', 'ENABLE_EMAIL_AUTOCONFIRM']),
    MAILER_OTP_EXP: durationEnvSeconds(['GOTRUE_MAILER_OTP_EXP', 'MAILER_OTP_EXP'], 3600),
    MAILER_OTP_LENGTH: numberEnv(['GOTRUE_MAILER_OTP_LENGTH', 'MAILER_OTP_LENGTH'], 6),
    MAILER_SECURE_EMAIL_CHANGE_ENABLED: boolEnv(
      ['GOTRUE_MAILER_SECURE_EMAIL_CHANGE_ENABLED', 'MAILER_SECURE_EMAIL_CHANGE_ENABLED'],
      true
    ),
    PASSWORD_HIBP_ENABLED: boolEnv(['GOTRUE_PASSWORD_HIBP_ENABLED', 'PASSWORD_HIBP_ENABLED']),
    PASSWORD_MIN_LENGTH: numberEnv(['GOTRUE_PASSWORD_MIN_LENGTH', 'PASSWORD_MIN_LENGTH'], 6),
    PASSWORD_REQUIRED_CHARACTERS: stringEnv([
      'GOTRUE_PASSWORD_REQUIRED_CHARACTERS',
      'PASSWORD_REQUIRED_CHARACTERS',
    ]),
    SECURITY_CAPTCHA_ENABLED: boolEnv([
      'GOTRUE_SECURITY_CAPTCHA_ENABLED',
      'SECURITY_CAPTCHA_ENABLED',
    ]),
    SECURITY_CAPTCHA_PROVIDER: enumEnv(
      ['GOTRUE_SECURITY_CAPTCHA_PROVIDER', 'SECURITY_CAPTCHA_PROVIDER'],
      ['hcaptcha', 'turnstile'] as const,
      'hcaptcha'
    ),
    SECURITY_CAPTCHA_SECRET: stringEnv([
      'GOTRUE_SECURITY_CAPTCHA_SECRET',
      'SECURITY_CAPTCHA_SECRET',
    ]),
    SECURITY_MANUAL_LINKING_ENABLED: boolEnv([
      'GOTRUE_SECURITY_MANUAL_LINKING_ENABLED',
      'SECURITY_MANUAL_LINKING_ENABLED',
    ]),
    SECURITY_REFRESH_TOKEN_REUSE_INTERVAL: durationEnvSeconds(
      ['GOTRUE_SECURITY_REFRESH_TOKEN_REUSE_INTERVAL', 'SECURITY_REFRESH_TOKEN_REUSE_INTERVAL'],
      10
    ),
    REFRESH_TOKEN_ROTATION_ENABLED: boolEnv(
      ['GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED', 'SECURITY_REFRESH_TOKEN_ROTATION_ENABLED'],
      true
    ),
    SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD: boolEnv([
      'GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD',
      'SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD',
    ]),
    SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION: boolEnv([
      'GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION',
      'SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION',
    ]),
    SITE_URL: stringEnv(
      ['GOTRUE_SITE_URL', 'SITE_URL'],
      `${PROJECT_ENDPOINT_PROTOCOL}://${PROJECT_ENDPOINT}`
    ),
    URI_ALLOW_LIST: stringEnv(['GOTRUE_URI_ALLOW_LIST', 'ADDITIONAL_REDIRECT_URLS']),
    SMS_AUTOCONFIRM: boolEnv(['GOTRUE_SMS_AUTOCONFIRM', 'ENABLE_PHONE_AUTOCONFIRM']),
    SMS_OTP_EXP: durationEnvSeconds(['GOTRUE_SMS_OTP_EXP', 'SMS_OTP_EXP'], 60),
    SMS_OTP_LENGTH: numberEnv(['GOTRUE_SMS_OTP_LENGTH', 'SMS_OTP_LENGTH'], 6),
    SMS_PROVIDER: stringEnv(['GOTRUE_SMS_PROVIDER', 'SMS_PROVIDER']),
    SMS_TEMPLATE: stringEnv(['GOTRUE_SMS_TEMPLATE', 'SMS_TEMPLATE']),
    SMS_TEST_OTP: stringEnv(['GOTRUE_SMS_TEST_OTP', 'SMS_TEST_OTP']),
    SMS_TEST_OTP_VALID_UNTIL: stringEnv([
      'GOTRUE_SMS_TEST_OTP_VALID_UNTIL',
      'SMS_TEST_OTP_VALID_UNTIL',
    ]),
    SMTP_ADMIN_EMAIL: stringEnv(['GOTRUE_SMTP_ADMIN_EMAIL', 'SMTP_ADMIN_EMAIL']),
    SMTP_SENDER_NAME: stringEnv(['GOTRUE_SMTP_SENDER_NAME', 'SMTP_SENDER_NAME']),
    SMTP_HOST: stringEnv(['GOTRUE_SMTP_HOST', 'SMTP_HOST']),
    SMTP_PORT: stringEnv(['GOTRUE_SMTP_PORT', 'SMTP_PORT']),
    SMTP_USER: stringEnv(['GOTRUE_SMTP_USER', 'SMTP_USER']),
    SMTP_PASS: stringEnv(['GOTRUE_SMTP_PASS', 'SMTP_PASS']),
    SMTP_MAX_FREQUENCY: durationEnvSeconds(['GOTRUE_SMTP_MAX_FREQUENCY', 'SMTP_MAX_FREQUENCY'], 60),
    RATE_LIMIT_TOKEN_REFRESH: numberEnv(
      ['GOTRUE_RATE_LIMIT_TOKEN_REFRESH', 'RATE_LIMIT_TOKEN_REFRESH'],
      150
    ),
    RATE_LIMIT_VERIFY: numberEnv(['GOTRUE_RATE_LIMIT_VERIFY', 'RATE_LIMIT_VERIFY'], 360),
    RATE_LIMIT_EMAIL_SENT: numberEnv(['GOTRUE_RATE_LIMIT_EMAIL_SENT', 'RATE_LIMIT_EMAIL_SENT'], 2),
    RATE_LIMIT_SMS_SENT: numberEnv(['GOTRUE_RATE_LIMIT_SMS_SENT', 'RATE_LIMIT_SMS_SENT'], 30),
    RATE_LIMIT_ANONYMOUS_USERS: numberEnv(
      ['GOTRUE_RATE_LIMIT_ANONYMOUS_USERS', 'RATE_LIMIT_ANONYMOUS_USERS'],
      30
    ),
    RATE_LIMIT_OTP: numberEnv(['GOTRUE_RATE_LIMIT_OTP', 'RATE_LIMIT_OTP'], 30),
    RATE_LIMIT_WEB3: numberEnv(['GOTRUE_RATE_LIMIT_WEB3', 'RATE_LIMIT_WEB3'], 30),
    API_MAX_REQUEST_DURATION: durationEnvSeconds(
      ['GOTRUE_API_MAX_REQUEST_DURATION', 'API_MAX_REQUEST_DURATION'],
      10
    ),
    DB_MAX_POOL_SIZE: numberEnv(['GOTRUE_DB_MAX_POOL_SIZE', 'DB_MAX_POOL_SIZE'], 10),
    DB_MAX_POOL_SIZE_UNIT: enumEnv(
      ['GOTRUE_DB_MAX_POOL_SIZE_UNIT', 'DB_MAX_POOL_SIZE_UNIT'],
      ['percent', 'connections'] as const,
      'connections'
    ),
    SECURITY_SB_FORWARDED_FOR_ENABLED: boolEnv([
      'GOTRUE_SECURITY_SB_FORWARDED_FOR_ENABLED',
      'SECURITY_SB_FORWARDED_FOR_ENABLED',
    ]),
    SESSIONS_TIMEBOX: durationEnvSeconds(['GOTRUE_SESSIONS_TIMEBOX', 'SESSIONS_TIMEBOX'], 0),
    SESSIONS_INACTIVITY_TIMEOUT: durationEnvSeconds(
      ['GOTRUE_SESSIONS_INACTIVITY_TIMEOUT', 'SESSIONS_INACTIVITY_TIMEOUT'],
      0
    ),
    SESSIONS_SINGLE_PER_USER: boolEnv([
      'GOTRUE_SESSIONS_SINGLE_PER_USER',
      'SESSIONS_SINGLE_PER_USER',
    ]),
    PASSKEY_ENABLED: boolEnv(['GOTRUE_PASSKEY_ENABLED', 'PASSKEY_ENABLED']),
    WEBAUTHN_RP_ID: stringEnv(['GOTRUE_WEBAUTHN_RP_ID', 'WEBAUTHN_RP_ID']),
    WEBAUTHN_RP_DISPLAY_NAME: stringEnv([
      'GOTRUE_WEBAUTHN_RP_DISPLAY_NAME',
      'WEBAUTHN_RP_DISPLAY_NAME',
    ]),
    WEBAUTHN_RP_ORIGINS: stringEnv(['GOTRUE_WEBAUTHN_RP_ORIGINS', 'WEBAUTHN_RP_ORIGINS']),
    CUSTOM_OAUTH_ENABLED: boolEnv(['GOTRUE_CUSTOM_OAUTH_ENABLED', 'CUSTOM_OAUTH_ENABLED']),
    CUSTOM_OAUTH_MAX_PROVIDERS: numberEnv(
      ['GOTRUE_CUSTOM_OAUTH_MAX_PROVIDERS', 'CUSTOM_OAUTH_MAX_PROVIDERS'],
      0
    ),
    OAUTH_SERVER_ENABLED: boolEnv(['GOTRUE_OAUTH_SERVER_ENABLED', 'OAUTH_SERVER_ENABLED']),
    OAUTH_SERVER_ALLOW_DYNAMIC_REGISTRATION: boolEnv([
      'GOTRUE_OAUTH_SERVER_ALLOW_DYNAMIC_REGISTRATION',
      'OAUTH_SERVER_ALLOW_DYNAMIC_REGISTRATION',
    ]),
    OAUTH_SERVER_AUTHORIZATION_PATH: stringEnv(
      ['GOTRUE_OAUTH_SERVER_AUTHORIZATION_PATH', 'OAUTH_SERVER_AUTHORIZATION_PATH'],
      '/oauth/consent'
    ),
    MFA_TOTP_ENROLL_ENABLED: boolEnv(
      ['GOTRUE_MFA_TOTP_ENROLL_ENABLED', 'MFA_TOTP_ENROLL_ENABLED'],
      true
    ),
    MFA_TOTP_VERIFY_ENABLED: boolEnv(
      ['GOTRUE_MFA_TOTP_VERIFY_ENABLED', 'MFA_TOTP_VERIFY_ENABLED'],
      true
    ),
    MFA_PHONE_ENROLL_ENABLED: boolEnv([
      'GOTRUE_MFA_PHONE_ENROLL_ENABLED',
      'MFA_PHONE_ENROLL_ENABLED',
    ]),
    MFA_PHONE_VERIFY_ENABLED: boolEnv([
      'GOTRUE_MFA_PHONE_VERIFY_ENABLED',
      'MFA_PHONE_VERIFY_ENABLED',
    ]),
    MFA_PHONE_OTP_LENGTH: numberEnv(['GOTRUE_MFA_PHONE_OTP_LENGTH', 'MFA_PHONE_OTP_LENGTH'], 6),
    MFA_PHONE_TEMPLATE: stringEnv(
      ['GOTRUE_MFA_PHONE_TEMPLATE', 'MFA_PHONE_TEMPLATE'],
      'Your code is {{ .Code }}'
    ),
    MFA_MAX_ENROLLED_FACTORS: numberEnv(
      ['GOTRUE_MFA_MAX_ENROLLED_FACTORS', 'MFA_MAX_ENROLLED_FACTORS'],
      10
    ),
    MFA_ALLOW_LOW_AAL: boolEnv(['GOTRUE_MFA_ALLOW_LOW_AAL', 'MFA_ALLOW_LOW_AAL'], true),
    HOOK_SEND_SMS_ENABLED: boolEnv(['GOTRUE_HOOK_SEND_SMS_ENABLED', 'HOOK_SEND_SMS_ENABLED']),
    HOOK_SEND_SMS_URI: stringEnv(['GOTRUE_HOOK_SEND_SMS_URI', 'HOOK_SEND_SMS_URI']),
    HOOK_SEND_EMAIL_ENABLED: boolEnv(['GOTRUE_HOOK_SEND_EMAIL_ENABLED', 'HOOK_SEND_EMAIL_ENABLED']),
    HOOK_SEND_EMAIL_URI: stringEnv(['GOTRUE_HOOK_SEND_EMAIL_URI', 'HOOK_SEND_EMAIL_URI']),
    HOOK_CUSTOM_ACCESS_TOKEN_ENABLED: boolEnv([
      'GOTRUE_HOOK_CUSTOM_ACCESS_TOKEN_ENABLED',
      'HOOK_CUSTOM_ACCESS_TOKEN_ENABLED',
    ]),
    HOOK_CUSTOM_ACCESS_TOKEN_URI: stringEnv([
      'GOTRUE_HOOK_CUSTOM_ACCESS_TOKEN_URI',
      'HOOK_CUSTOM_ACCESS_TOKEN_URI',
    ]),
    HOOK_MFA_VERIFICATION_ATTEMPT_ENABLED: boolEnv([
      'GOTRUE_HOOK_MFA_VERIFICATION_ATTEMPT_ENABLED',
      'HOOK_MFA_VERIFICATION_ATTEMPT_ENABLED',
    ]),
    HOOK_MFA_VERIFICATION_ATTEMPT_URI: stringEnv([
      'GOTRUE_HOOK_MFA_VERIFICATION_ATTEMPT_URI',
      'HOOK_MFA_VERIFICATION_ATTEMPT_URI',
    ]),
    HOOK_PASSWORD_VERIFICATION_ATTEMPT_ENABLED: boolEnv([
      'GOTRUE_HOOK_PASSWORD_VERIFICATION_ATTEMPT_ENABLED',
      'HOOK_PASSWORD_VERIFICATION_ATTEMPT_ENABLED',
    ]),
    HOOK_PASSWORD_VERIFICATION_ATTEMPT_URI: stringEnv([
      'GOTRUE_HOOK_PASSWORD_VERIFICATION_ATTEMPT_URI',
      'HOOK_PASSWORD_VERIFICATION_ATTEMPT_URI',
    ]),
    AUDIT_LOG_DISABLE_POSTGRES: boolEnv([
      'GOTRUE_AUDIT_LOG_DISABLE_POSTGRES',
      'AUDIT_LOG_DISABLE_POSTGRES',
    ]),
  }

  return config as unknown as SelfHostedAuthConfig
}
