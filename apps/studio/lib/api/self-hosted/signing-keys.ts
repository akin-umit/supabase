import { createHash } from 'crypto'
import { components } from 'api-types'

import { assertSelfHosted } from './util'

type SigningKeyResponse = components['schemas']['SigningKeyResponse']

const LEGACY_KEY_CREATED_AT = '1970-01-01T00:00:00.000Z'
const LEGACY_KEY_FALLBACK_ID = 'legacy-hs256-unconfigured'

type SigningKeyEnvironment = Record<string, string | undefined>

function legacyKeyId(environment: SigningKeyEnvironment = process.env) {
  const secret = environment.AUTH_JWT_SECRET || environment.JWT_SECRET || ''
  if (!secret) return LEGACY_KEY_FALLBACK_ID

  const fingerprint = createHash('sha256').update(secret).digest('hex').slice(0, 16)
  return `legacy-hs256-${fingerprint}`
}

/**
 * Returns a runtime-derived legacy signing key entry representing the symmetric
 * `AUTH_JWT_SECRET`/`JWT_SECRET` without exposing the secret value to the
 * browser.
 *
 * The asymmetric signing-key lifecycle (create/rotate/revoke) is not
 * supported here — those endpoints remain unmocked, and the JWT Signing
 * Keys page renders a docs-pointing admonition instead of a table.
 *
 * _Only call this from server-side self-hosted code._
 */
export function getLegacySigningKey(
  environment: SigningKeyEnvironment = process.env
): SigningKeyResponse {
  assertSelfHosted()

  return {
    id: legacyKeyId(environment),
    algorithm: 'HS256',
    status: 'in_use',
    created_at: LEGACY_KEY_CREATED_AT,
    updated_at: LEGACY_KEY_CREATED_AT,
  }
}
