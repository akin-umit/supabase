import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  FileSystemSecretStore,
  SecretStoreConflictError,
  SecretStoreDataError,
  SecretStoreValidationError,
} from './fileSystemStore'

describe('FileSystemSecretStore', () => {
  let folderPath: string
  let store: FileSystemSecretStore

  beforeEach(async () => {
    folderPath = await mkdtemp(path.join(tmpdir(), 'function-secrets-'))
    store = new FileSystemSecretStore(folderPath)
  })

  afterEach(async () => {
    await rm(folderPath, { recursive: true, force: true })
  })

  it('persists a versioned file and lists only SHA-256 redactions', async () => {
    const plaintext = 'never-return-this-value'
    await store.upsert([{ name: 'API_TOKEN', value: plaintext }])

    const stored = JSON.parse(await readFile(store.filePath, 'utf8'))
    expect(stored).toMatchObject({
      version: 1,
      secrets: { API_TOKEN: { value: plaintext } },
    })

    const result = await store.list()
    expect(result).toEqual([
      {
        name: 'API_TOKEN',
        value: createHash('sha256').update(plaintext).digest('hex'),
        updated_at: expect.any(String),
      },
    ])
    expect(JSON.stringify(result)).not.toContain(plaintext)
  })

  it('upserts and deletes secrets without leaving lock or temp files', async () => {
    await store.upsert([
      { name: 'B_SECRET', value: 'first' },
      { name: 'A_SECRET', value: 'second' },
    ])
    await store.upsert([{ name: 'A_SECRET', value: 'replacement' }])
    await store.delete(['B_SECRET', 'MISSING_SECRET'])

    expect((await store.list()).map(({ name }) => name)).toEqual(['A_SECRET'])
    expect((await readdir(folderPath)).sort()).toEqual(['.supabase'])
  })

  it('returns a conflict while another writer owns the lock', async () => {
    await mkdir(path.dirname(store.lockPath), { recursive: true })
    await writeFile(store.lockPath, 'locked', { flag: 'wx' })

    await expect(store.upsert([{ name: 'API_TOKEN', value: 'value' }])).rejects.toBeInstanceOf(
      SecretStoreConflictError
    )
  })

  it.each(['SUPABASE_URL', 'SB_REGION', 'DENO_DEPLOYMENT_ID'])(
    'rejects the reserved prefix for %s',
    async (name) => {
      await expect(store.upsert([{ name, value: 'value' }])).rejects.toBeInstanceOf(
        SecretStoreValidationError
      )
    }
  )

  it.each(['FUNCTION_SECRETS_FILE', 'JWT_SECRET', 'VERIFY_JWT'])(
    'rejects the reserved runtime name %s',
    async (name) => {
      await expect(store.upsert([{ name, value: 'value' }])).rejects.toBeInstanceOf(
        SecretStoreValidationError
      )
    }
  )

  it('rejects invalid, duplicate, empty, and oversized inputs', async () => {
    await expect(store.upsert([{ name: 'not-valid', value: 'value' }])).rejects.toBeInstanceOf(
      SecretStoreValidationError
    )
    await expect(
      store.upsert([
        { name: 'DUPLICATE', value: 'one' },
        { name: 'DUPLICATE', value: 'two' },
      ])
    ).rejects.toBeInstanceOf(SecretStoreValidationError)
    await expect(store.upsert([{ name: 'EMPTY', value: '' }])).rejects.toBeInstanceOf(
      SecretStoreValidationError
    )
    await expect(store.upsert([{ name: 'NUL_VALUE', value: 'bad\0value' }])).rejects.toBeInstanceOf(
      SecretStoreValidationError
    )
    await expect(
      store.upsert([{ name: 'TOO_LARGE', value: 'x'.repeat(64 * 1024 + 1) }])
    ).rejects.toBeInstanceOf(SecretStoreValidationError)
  })

  it('rejects malformed or unsupported store files without exposing their contents', async () => {
    const plaintext = 'sensitive-corrupt-content'
    await mkdir(path.dirname(store.filePath), { recursive: true })
    await writeFile(store.filePath, `{${plaintext}`)

    const error = await store.list().catch((caught) => caught)
    expect(error).toBeInstanceOf(SecretStoreDataError)
    expect(String(error)).not.toContain(plaintext)

    await writeFile(store.filePath, JSON.stringify({ version: 2, secrets: {} }))
    await expect(store.list()).rejects.toBeInstanceOf(SecretStoreDataError)
  })
})
