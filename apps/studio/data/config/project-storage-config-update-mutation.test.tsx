import { waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { useProjectStorageConfigUpdateUpdateMutation } from './project-storage-config-update-mutation'
import { API_URL } from '@/lib/constants'
import { customRenderHook } from '@/tests/lib/custom-render'
import { mswServer } from '@/tests/lib/msw'

describe('useProjectStorageConfigUpdateUpdateMutation', () => {
  it('patches storage settings through the project storage config endpoint', async () => {
    let receivedRef: string | undefined
    let receivedBody: unknown
    mswServer.use(
      http.patch(`${API_URL}/platform/projects/:ref/config/storage`, async ({ params, request }) => {
        receivedRef = params.ref as string
        receivedBody = await request.json()
        return HttpResponse.json({
          fileSizeLimit: 25 * 1024 * 1024,
          features: {
            imageTransformation: { enabled: false },
            s3Protocol: { enabled: true },
          },
        })
      })
    )

    const { result } = customRenderHook(() => useProjectStorageConfigUpdateUpdateMutation())

    result.current.mutate({
      projectRef: 'default',
      fileSizeLimit: 25 * 1024 * 1024,
      features: {
        imageTransformation: { enabled: false },
        s3Protocol: { enabled: true },
      },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(receivedRef).toBe('default')
    expect(receivedBody).toEqual({
      fileSizeLimit: 25 * 1024 * 1024,
      features: {
        imageTransformation: { enabled: false },
        s3Protocol: { enabled: true },
      },
    })
  })
})
