import { createHash, randomUUID } from 'node:crypto'
import {
  constants,
  lstat,
  mkdir,
  open,
  readFile,
  rename,
  rm,
  type FileHandle,
} from 'node:fs/promises'
import path from 'node:path'

import type { RedactedSecret, SecretInput, SecretsFile } from './types'

const FILE_VERSION = 1 as const
const SECRET_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/
const RESERVED_PREFIXES = ['SUPABASE_', 'SB_', 'DENO_']
const RESERVED_NAMES = new Set(['FUNCTION_SECRETS_FILE', 'JWT_SECRET', 'VERIFY_JWT'])
const MAX_SECRET_NAME_LENGTH = 128
const MAX_SECRET_VALUE_BYTES = 64 * 1024
const MAX_BATCH_SIZE = 100
const MAX_STORE_BYTES = 256 * 1024

export class SecretStoreValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SecretStoreValidationError'
  }
}

export class SecretStoreConflictError extends Error {
  constructor() {
    super('The secret store is busy')
    this.name = 'SecretStoreConflictError'
  }
}

export class SecretStoreCapacityError extends Error {
  constructor() {
    super('The secret store exceeds its capacity')
    this.name = 'SecretStoreCapacityError'
  }
}

export class SecretStoreDataError extends Error {
  constructor() {
    super('The secret store data is invalid')
    this.name = 'SecretStoreDataError'
  }
}

export class FileSystemSecretStore {
  readonly filePath: string
  readonly lockPath: string

  constructor(folderPath: string) {
    this.filePath = path.join(folderPath, '.supabase', 'function-secrets.json')
    this.lockPath = `${this.filePath}.lock`
  }

  async list(): Promise<RedactedSecret[]> {
    const file = await this.read()

    return Object.entries(file.secrets)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, secret]) => ({
        name,
        value: createHash('sha256').update(secret.value).digest('hex'),
        updated_at: secret.updated_at,
      }))
  }

  async upsert(inputs: SecretInput[]): Promise<void> {
    validateSecretInputs(inputs)

    await this.withLock(async () => {
      const file = await this.read()
      const updatedAt = new Date().toISOString()

      for (const input of inputs) {
        file.secrets[input.name] = { value: input.value, updated_at: updatedAt }
      }

      await this.write(file)
    })
  }

  async delete(names: string[]): Promise<void> {
    validateSecretNames(names)

    await this.withLock(async () => {
      const file = await this.read()
      for (const name of names) delete file.secrets[name]
      await this.write(file)
    })
  }

  private async read(): Promise<SecretsFile> {
    await this.assertSafeStorePath()
    let contents: string
    try {
      contents = await readFile(this.filePath, 'utf8')
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return { version: FILE_VERSION, secrets: {} }
      }
      throw error
    }

    try {
      const parsed: unknown = JSON.parse(contents)
      if (!isSecretsFile(parsed)) throw new SecretStoreDataError()
      return parsed
    } catch (error) {
      if (error instanceof SecretStoreDataError) throw error
      throw new SecretStoreDataError()
    }
  }

  private async write(file: SecretsFile): Promise<void> {
    const folderPath = path.dirname(this.filePath)
    const tempPath = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`
    await mkdir(folderPath, { recursive: true })
    await this.assertSafeStorePath()

    const serialized = `${JSON.stringify(file, null, 2)}\n`
    if (
      Object.keys(file.secrets).length > MAX_BATCH_SIZE ||
      Buffer.byteLength(serialized, 'utf8') > MAX_STORE_BYTES
    ) {
      throw new SecretStoreCapacityError()
    }

    let handle: FileHandle | undefined
    try {
      handle = await open(
        tempPath,
        constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
        0o600
      )
      await handle.writeFile(serialized, 'utf8')
      await handle.sync()
      await handle.close()
      handle = undefined
      await rename(tempPath, this.filePath)
    } finally {
      await handle?.close().catch(() => undefined)
      await rm(tempPath, { force: true }).catch(() => undefined)
    }
  }

  private async withLock(operation: () => Promise<void>): Promise<void> {
    await mkdir(path.dirname(this.lockPath), { recursive: true })
    await this.assertSafeStorePath()

    let lock
    try {
      lock = await open(
        this.lockPath,
        constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
        0o600
      )
    } catch (error) {
      if (isNodeError(error) && error.code === 'EEXIST') throw new SecretStoreConflictError()
      throw error
    }

    try {
      await operation()
    } finally {
      await lock.close().catch(() => undefined)
      await rm(this.lockPath, { force: true }).catch(() => undefined)
    }
  }

  private async assertSafeStorePath(): Promise<void> {
    for (const candidate of [path.dirname(this.filePath), this.filePath]) {
      try {
        if ((await lstat(candidate)).isSymbolicLink()) throw new SecretStoreDataError()
      } catch (error) {
        if (error instanceof SecretStoreDataError) throw error
        if (!isNodeError(error) || error.code !== 'ENOENT') throw error
      }
    }
  }
}

function validateSecretInputs(inputs: SecretInput[]): void {
  if (!Array.isArray(inputs) || inputs.length === 0 || inputs.length > MAX_BATCH_SIZE) {
    throw new SecretStoreValidationError('Secrets must be a non-empty array of at most 100 items')
  }

  validateUniqueNames(inputs.map((input) => input?.name))
  for (const input of inputs) {
    if (!isRecord(input)) {
      throw new SecretStoreValidationError('Each secret must contain a name and value')
    }
    validateSecretName(input?.name)
    if (typeof input.value !== 'string' || input.value.length === 0) {
      throw new SecretStoreValidationError('Secret values must be non-empty strings')
    }
    if (input.value.includes('\0')) {
      throw new SecretStoreValidationError('Secret values cannot contain NUL bytes')
    }
    if (Buffer.byteLength(input.value, 'utf8') > MAX_SECRET_VALUE_BYTES) {
      throw new SecretStoreValidationError('Secret values must be at most 65536 bytes')
    }
  }
}

function validateSecretNames(names: string[]): void {
  if (!Array.isArray(names) || names.length === 0 || names.length > MAX_BATCH_SIZE) {
    throw new SecretStoreValidationError(
      'Secret names must be a non-empty array of at most 100 items'
    )
  }
  validateUniqueNames(names)
  names.forEach(validateSecretName)
}

function validateUniqueNames(names: unknown[]): void {
  if (new Set(names).size !== names.length) {
    throw new SecretStoreValidationError('Secret names must be unique')
  }
}

function validateSecretName(name: unknown): asserts name is string {
  if (
    typeof name !== 'string' ||
    name.length > MAX_SECRET_NAME_LENGTH ||
    !SECRET_NAME_PATTERN.test(name)
  ) {
    throw new SecretStoreValidationError('Secret names must be valid environment variable names')
  }
  if (RESERVED_NAMES.has(name) || RESERVED_PREFIXES.some((prefix) => name.startsWith(prefix))) {
    throw new SecretStoreValidationError('Secret name uses a reserved prefix')
  }
}

function isSecretsFile(value: unknown): value is SecretsFile {
  if (!isRecord(value) || value.version !== FILE_VERSION || !isRecord(value.secrets)) return false

  return Object.entries(value.secrets).every(
    ([name, secret]) =>
      SECRET_NAME_PATTERN.test(name) &&
      !RESERVED_NAMES.has(name) &&
      !RESERVED_PREFIXES.some((prefix) => name.startsWith(prefix)) &&
      isRecord(secret) &&
      typeof secret.value === 'string' &&
      typeof secret.updated_at === 'string' &&
      !Number.isNaN(Date.parse(secret.updated_at))
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}
