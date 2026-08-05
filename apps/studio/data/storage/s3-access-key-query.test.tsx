import { waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, test } from 'vitest'

import { useStorageCredentialsQuery } from './s3-access-key-query'
import { API_URL } from '@/lib/constants'
import { customRenderHook } from '@/tests/lib/custom-render'
import { mswServer } from '@/tests/lib/msw'

describe('useStorageCredentialsQuery', () => {
  test('returns the runtime access key without inventing a creation date', async () => {
    mswServer.use(
      http.get(`${API_URL}/platform/storage/:ref/credentials`, () =>
        HttpResponse.json({
          data: [
            {
              id: 'self-hosted-runtime',
              access_key: 'runtime-access-key',
              description: 'Self-hosted runtime credential',
              created_at: null,
            },
          ],
        })
      )
    )

    const { result } = customRenderHook(() => useStorageCredentialsQuery({ projectRef: 'default' }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data).toEqual([
      expect.objectContaining({ access_key: 'runtime-access-key', created_at: null }),
    ])
  })
})
