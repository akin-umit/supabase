import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createMocks } from 'node-mocks-http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import handler from '../../../../../../../pages/api/v1/projects/[ref]/functions/deploy'

vi.mock('@/lib/constants', () => ({
  IS_PLATFORM: false,
  API_URL: 'https://api.example.com',
}))

describe('/api/v1/projects/[ref]/functions/deploy', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'studio-functions-api-'))
    vi.stubEnv('EDGE_FUNCTIONS_MANAGEMENT_FOLDER', dir)
  })

  afterEach(async () => {
    vi.unstubAllEnvs()
    await rm(dir, { recursive: true, force: true })
  })

  it('stores posted self-hosted function files', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: { ref: 'default', slug: 'hello-world' },
      body: { files: [{ name: 'index.ts', content: 'Deno.serve(() => new Response("ok"))' }] },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData()).restart_required).toBe(true)
    await expect(readFile(path.join(dir, 'hello-world', 'index.ts'), 'utf8')).resolves.toContain(
      'Deno.serve'
    )
  })
})
