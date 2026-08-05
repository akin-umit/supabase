import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import {
  getManagedRealtimeConfig,
  RealtimeManagementApiError,
  updateManagedRealtimeConfig,
} from '@/lib/api/self-hosted/realtime'
import { IS_PLATFORM } from '@/lib/constants'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'GET':
      return handleGet(req, res)
    case 'PATCH':
      return handlePatch(req, res)
    default:
      res.setHeader('Allow', ['GET', 'PATCH'])
      res.status(405).json({ data: null, error: { message: `Method ${method} Not Allowed` } })
  }
}

function projectRef(req: NextApiRequest) {
  return Array.isArray(req.query.ref) ? undefined : req.query.ref
}

function sendError(res: NextApiResponse, error: unknown) {
  if (error instanceof RealtimeManagementApiError) {
    return res.status(error.statusCode).json({ error: { message: error.message } })
  }
  return res.status(500).json({ error: { message: 'Realtime management request failed' } })
}

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  if (IS_PLATFORM) {
    return res
      .status(404)
      .json({ error: { message: 'Realtime self-hosted config is not available on platform' } })
  }

  const ref = projectRef(req)
  if (!ref) return res.status(400).json({ error: { message: 'Project ref is required' } })
  try {
    return res.status(200).json(await getManagedRealtimeConfig(ref))
  } catch (error) {
    return sendError(res, error)
  }
}

const handlePatch = async (req: NextApiRequest, res: NextApiResponse) => {
  if (IS_PLATFORM) {
    return res
      .status(404)
      .json({ error: { message: 'Realtime self-hosted config is not available on platform' } })
  }

  const ref = projectRef(req)
  if (!ref) return res.status(400).json({ error: { message: 'Project ref is required' } })
  try {
    return res.status(200).json(await updateManagedRealtimeConfig(ref, req.body ?? {}))
  } catch (error) {
    return sendError(res, error)
  }
}
