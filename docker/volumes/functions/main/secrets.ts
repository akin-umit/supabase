export const DEFAULT_FUNCTION_SECRETS_PATH =
  '/run/function-secrets/.supabase/function-secrets.json'

export const RESERVED_RUNTIME_ENV_NAMES = new Set([
  'DENO_DEPLOYMENT_ID',
  'FUNCTION_SECRETS_FILE',
  'JWT_SECRET',
  'SB_EXECUTION_ID',
  'SB_REGION',
  'SUPABASE_ANON_KEY',
  'SUPABASE_DB_URL',
  'SUPABASE_JWKS',
  'SUPABASE_PUBLIC_URL',
  'SUPABASE_PUBLISHABLE_KEYS',
  'SUPABASE_SECRET_KEYS',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_URL',
  'VERIFY_JWT',
])

type SecretSnapshot = Readonly<Record<string, string>>

type SecretFileInfo = {
  mtime: Date | null
  size: number
}

type SecretFileReader = {
  stat(path: string): Promise<SecretFileInfo>
  readTextFile(path: string): Promise<string>
}

type SecretLoaderLogger = Pick<Console, 'error'>

const EMPTY_SNAPSHOT: SecretSnapshot = Object.freeze({})

function parseSecretSnapshot(raw: string): SecretSnapshot {
  const parsed: unknown = JSON.parse(raw)
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new TypeError('secret file must contain a JSON object')
  }

  const file = parsed as Record<string, unknown>
  if (file.version !== 1 || file.secrets === null || typeof file.secrets !== 'object') {
    throw new TypeError('secret file has an unsupported format')
  }

  const snapshot: Record<string, string> = {}
  for (const [name, stored] of Object.entries(file.secrets as Record<string, unknown>)) {
    if (stored === null || typeof stored !== 'object') {
      throw new TypeError('secret entries must be objects')
    }
    const value = (stored as Record<string, unknown>).value
    if (!name || typeof value !== 'string') {
      throw new TypeError('secret names must be non-empty and values must be strings')
    }
    snapshot[name] = value
  }
  return Object.freeze(snapshot)
}

export class JsonSecretLoader {
  #lastAttemptFingerprint: string | null = null
  #lastGoodSnapshot: SecretSnapshot = EMPTY_SNAPSHOT

  constructor(
    private readonly fileReader: SecretFileReader = Deno,
    private readonly logger: SecretLoaderLogger = console,
  ) {}

  async load(path: string): Promise<SecretSnapshot> {
    let info: SecretFileInfo
    try {
      info = await this.fileReader.stat(path)
    } catch {
      this.#logOnce('missing', 'Function secrets file is unavailable; keeping the last valid snapshot')
      return this.#lastGoodSnapshot
    }

    const fingerprint = `${info.mtime?.getTime() ?? 'unknown'}:${info.size}`
    if (fingerprint === this.#lastAttemptFingerprint) return this.#lastGoodSnapshot
    this.#lastAttemptFingerprint = fingerprint

    try {
      this.#lastGoodSnapshot = parseSecretSnapshot(await this.fileReader.readTextFile(path))
    } catch {
      this.logger.error('Function secrets file is invalid; keeping the last valid snapshot')
    }
    return this.#lastGoodSnapshot
  }

  #logOnce(fingerprint: string, message: string) {
    if (this.#lastAttemptFingerprint === fingerprint) return
    this.#lastAttemptFingerprint = fingerprint
    this.logger.error(message)
  }
}

export function mergeFunctionSecrets(
  runtimeEnv: Record<string, string>,
  customSecrets: SecretSnapshot,
): [string, string][] {
  const merged = { ...runtimeEnv }
  for (const [name, value] of Object.entries(customSecrets)) {
    if (!name.startsWith('SUPABASE_') && !RESERVED_RUNTIME_ENV_NAMES.has(name)) {
      merged[name] = value
    }
  }
  return Object.entries(merged)
}
