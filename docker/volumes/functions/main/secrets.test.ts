import { assertEquals, assertStrictEquals } from 'jsr:@std/assert@1'
import { JsonSecretLoader, mergeFunctionSecrets } from './secrets.ts'

Deno.test('caches a valid snapshot while the file metadata is unchanged', async () => {
  let reads = 0
  const loader = new JsonSecretLoader({
    stat: () => Promise.resolve({ mtime: new Date(1000), size: 18 }),
    readTextFile: () => {
      reads++
      return Promise.resolve('{"version":1,"secrets":{"CUSTOM":{"value":"value"}}}')
    },
  })

  const first = await loader.load('/secrets.json')
  const second = await loader.load('/secrets.json')

  assertStrictEquals(first, second)
  assertEquals(first, { CUSTOM: 'value' })
  assertEquals(reads, 1)
})

Deno.test('keeps the last valid snapshot after an invalid update', async () => {
  let version = 1
  const messages: unknown[][] = []
  const loader = new JsonSecretLoader(
    {
      stat: () => Promise.resolve({ mtime: new Date(version), size: version }),
      readTextFile: () =>
        Promise.resolve(
          version === 1 ? '{"version":1,"secrets":{"TOKEN":{"value":"safe"}}}' : '{"TOKEN":',
        ),
    },
    { error: (...args: unknown[]) => messages.push(args) },
  )

  assertEquals(await loader.load('/secrets.json'), { TOKEN: 'safe' })
  version = 2
  assertEquals(await loader.load('/secrets.json'), { TOKEN: 'safe' })
  assertEquals(messages, [['Function secrets file is invalid; keeping the last valid snapshot']])
})

Deno.test('rejects non-string values without exposing file contents', async () => {
  const messages: unknown[][] = []
  const loader = new JsonSecretLoader(
    {
      stat: () => Promise.resolve({ mtime: new Date(1), size: 16 }),
      readTextFile: () => Promise.resolve('{"version":1,"secrets":{"TOKEN":{"value":123456}}}'),
    },
    { error: (...args: unknown[]) => messages.push(args) },
  )

  assertEquals(await loader.load('/secrets.json'), {})
  assertEquals(JSON.stringify(messages).includes('123456'), false)
})

Deno.test('merges custom secrets without replacing reserved runtime values', () => {
  const envVars = Object.fromEntries(mergeFunctionSecrets(
    { SUPABASE_URL: 'runtime-url', SB_REGION: 'runtime-region', EXISTING: 'runtime-value' },
    {
      SUPABASE_URL: 'custom-url',
      SUPABASE_FUTURE_RUNTIME_VALUE: 'blocked',
      SB_REGION: 'custom-region',
      EXISTING: 'custom-value',
      CUSTOM: 'secret',
    },
  ))

  assertEquals(envVars, {
    SUPABASE_URL: 'runtime-url',
    SB_REGION: 'runtime-region',
    EXISTING: 'custom-value',
    CUSTOM: 'secret',
  })
})
