import type { components } from 'api-types'
import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import {
  requestSelfHostedManagement,
  SelfHostedManagementError,
} from '@/lib/api/self-hosted/management'
import {
  getSelfHostedStorageConfig,
  STORAGE_RUNTIME_WRITE_BRIDGE_REASON,
} from '@/lib/api/self-hosted/storage'
import { IS_PLATFORM } from '@/lib/constants'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

type StorageConfigResponse = components['schemas']['StorageConfigResponse']

function buildStorageConfigPatchBody(req: NextApiRequest) {
  return {
    fileSizeLimit: req.body?.fileSizeLimit,
    features: {
      imageTransformation: req.body?.features?.imageTransformation,
      s3Protocol: req.body?.features?.s3Protocol,
    },
  }
}

function buildRuntimeStoragePatchBody(req: NextApiRequest) {
  const body: Record<string, unknown> = {}

  if (req.body?.fileSizeLimit !== undefined) body.fileSizeLimit = req.body.fileSizeLimit
  if (req.body?.features?.imageTransformation?.enabled !== undefined) {
    body.imageProxyAutoWebp = req.body.features.imageTransformation.enabled
  }
  if (req.body?.features?.s3Protocol?.enabled !== undefined) {
    body.s3ProtocolEnabled = req.body.features.s3Protocol.enabled
  }

  return body
}

function buildAppliedStorageConfig(req: NextApiRequest, managementPayload: unknown = {}) {
  return getSelfHostedStorageConfig({
    ...(typeof managementPayload === 'object' && managementPayload !== null
      ? (managementPayload as Partial<StorageConfigResponse>)
      : {}),
    fileSizeLimit: req.body?.fileSizeLimit,
    features: {
      imageTransformation: req.body?.features?.imageTransformation,
      s3Protocol: req.body?.features?.s3Protocol,
    },
  })
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'GET':
      return handleGet(res)
    case 'PATCH':
      return handlePatch(req, res)
    default:
      res.setHeader('Allow', ['GET', 'PATCH'])
      res.status(405).json({ data: null, error: { message: `Method ${method} Not Allowed` } })
  }
}

const handleGet = async (res: NextApiResponse) => {
  if (IS_PLATFORM) {
    return res
      .status(404)
      .json({ error: { message: 'Storage self-hosted config is not available on platform' } })
  }

  return res.status(200).json(getSelfHostedStorageConfig())
}

const handlePatch = async (req: NextApiRequest, res: NextApiResponse) => {
  if (IS_PLATFORM) {
    return res
      .status(404)
      .json({ error: { message: 'Storage self-hosted config is not available on platform' } })
  }

  try {
    const storageConfigBody = buildStorageConfigPatchBody(req)
    const data = await requestSelfHostedManagement({
      projectRef: String(req.query.ref ?? ''),
      resource: ['storage', 'config'],
      method: 'PATCH',
      body: storageConfigBody,
    })

    return res.status(200).json(buildAppliedStorageConfig(req, data))
  } catch (error) {
    if (error instanceof SelfHostedManagementError && error.statusCode === 503) {
      try {
        const runtimeBody = buildRuntimeStoragePatchBody(req)
        if (Object.keys(runtimeBody).length === 0) throw error

        const data = await requestSelfHostedManagement({
          projectRef: String(req.query.ref ?? ''),
          resource: ['runtime', 'storage'],
          method: 'PATCH',
          body: runtimeBody,
        })

        return res
          .status(200)
          .json(buildAppliedStorageConfig(req, { external: { operation: data } }))
      } catch (fallbackError) {
        error = fallbackError
      }
    }

    const status = error instanceof SelfHostedManagementError ? error.statusCode : 500
    const message =
      error instanceof SelfHostedManagementError && error.statusCode === 503
        ? STORAGE_RUNTIME_WRITE_BRIDGE_REASON
        : error instanceof Error
          ? error.message
          : 'Unable to update Storage runtime settings'
    return res.status(status).json({ error: { message } })
  }
}
