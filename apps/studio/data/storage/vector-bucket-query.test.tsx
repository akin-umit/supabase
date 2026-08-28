import { waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, test } from 'vitest'

import { useVectorBucketQuery } from './vector-bucket-query'
import { useVectorBucketsIndexesQuery } from './vector-buckets-indexes-query'
import { API_URL } from '@/lib/constants'
import { customRenderHook } from '@/tests/lib/custom-render'
import { mswServer } from '@/tests/lib/msw'

describe('vector bucket queries', () => {
  beforeEach(() => {
    mswServer.use(
      http.get(`${API_URL}/platform/projects/:ref`, () =>
        HttpResponse.json({
          ref: 'default',
          status: 'ACTIVE_HEALTHY',
        })
      )
    )
  })

  test('surfaces bucket fetch failures instead of inventing a self-hosted bucket', async () => {
    mswServer.use(
      http.get(`${API_URL}/platform/storage/:ref/vector-buckets/:id`, () =>
        HttpResponse.json(
          { message: 'Vector bucket runtime is unavailable' },
          { status: 503 }
        )
      )
    )

    const { result } = customRenderHook(() =>
      useVectorBucketQuery({ projectRef: 'default', vectorBucketName: 'documents' })
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('Vector bucket runtime is unavailable')
    expect(result.current.data).toBeUndefined()
  })

  test('surfaces index fetch failures instead of showing an empty table list', async () => {
    mswServer.use(
      http.get(`${API_URL}/platform/storage/:ref/vector-buckets/:id/indexes`, () =>
        HttpResponse.json(
          { message: 'Vector index runtime is unavailable' },
          { status: 503 }
        )
      )
    )

    const { result } = customRenderHook(() =>
      useVectorBucketsIndexesQuery({ projectRef: 'default', vectorBucketName: 'documents' })
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('Vector index runtime is unavailable')
    expect(result.current.data).toBeUndefined()
  })
})
