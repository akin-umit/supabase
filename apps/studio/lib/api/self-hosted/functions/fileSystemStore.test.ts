import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { FileSystemFunctionsArtifactStore } from './fileSystemStore'

describe('FileSystemFunctionsArtifactStore', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'studio-functions-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('writes a self-hosted function artifact into its slug folder', async () => {
    const store = new FileSystemFunctionsArtifactStore(dir)

    const artifact = await store.upsertFunction({
      slug: 'hello-world',
      files: [
        { name: 'index.ts', content: 'Deno.serve(() => new Response("ok"))' },
        { name: 'lib/message.ts', content: 'export const message = "ok"' },
      ],
    })

    await expect(readFile(path.join(dir, 'hello-world', 'index.ts'), 'utf8')).resolves.toContain(
      'Deno.serve'
    )
    await expect(
      readFile(path.join(dir, 'hello-world', 'lib', 'message.ts'), 'utf8')
    ).resolves.toContain('message')
    expect(artifact.slug).toBe('hello-world')
    expect(artifact.entrypoint_path).toContain('/hello-world/index.ts')
  })

  it('rejects path traversal in function file names', async () => {
    const store = new FileSystemFunctionsArtifactStore(dir)

    await expect(
      store.upsertFunction({
        slug: 'hello-world',
        files: [{ name: '../escape.ts', content: 'bad' }],
      })
    ).rejects.toThrow('Invalid function file path')
  })
})
