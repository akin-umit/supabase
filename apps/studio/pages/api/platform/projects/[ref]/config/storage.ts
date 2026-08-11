import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import {
  getSelfHostedStorageConfig,
  STORAGE_OPERATOR_MANAGED_REASON,
} from '@/lib/api/self-hosted/storage'
import {
  requestSelfHostedManagement,
  SelfHostedManagementError,
} from '@/lib/api/self-hosted/management'
import { IS_PLATFORM } from '@/lib/constants'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

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
    const data = await requestSelfHostedManagement({
      projectRef: String(req.query.ref ?? ''),
      resource: ['storage', 'config'],
      method: 'PATCH',
      body: {
        fileSizeLimit: req.body?.fileSizeLimit,
        features: {
          imageTransformation: req.body?.features?.imageTransformation,
          s3Protocol: req.body?.features?.s3Protocol,
        },
      },
    })

    return res.status(200).json(getSelfHostedStorageConfig(data))
  } catch (error) {
    const status = error instanceof SelfHostedManagementError ? error.statusCode : 500
    const message =
      error instanceof SelfHostedManagementError && error.statusCode === 503
        ? STORAGE_OPERATOR_MANAGED_REASON
        : error instanceof Error
          ? error.message
          : 'Unable to update Storage runtime settings'
    return res.status(status).json({ error: { message } })
  }
}
