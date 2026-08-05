import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import {
  DatabaseSettingsManagementApiError,
  getDatabaseSettingsOperation,
} from '@/lib/api/self-hosted/database-settings'
import { IS_PLATFORM } from '@/lib/constants'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (IS_PLATFORM) {
    return res.status(404).json({ error: { message: 'Operation proxy is unavailable' } })
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
  }

  const projectRef = Array.isArray(req.query.ref) ? undefined : req.query.ref
  const operationId = Array.isArray(req.query.operationId) ? undefined : req.query.operationId

  if (!projectRef || !operationId) {
    return res.status(400).json({ error: { message: 'Invalid operation path' } })
  }

  try {
    const operation = await getDatabaseSettingsOperation(projectRef, operationId)
    return res.status(200).json(operation)
  } catch (error) {
    if (error instanceof DatabaseSettingsManagementApiError) {
      return res.status(error.statusCode).json({ error: { message: error.message } })
    }

    return res.status(500).json({ error: { message: 'Unable to retrieve operation status' } })
  }
}
