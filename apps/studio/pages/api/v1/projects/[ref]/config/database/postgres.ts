import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import {
  DatabaseSettingsManagementApiError,
  getDatabaseSettings,
  updateDatabaseSettings,
} from '@/lib/api/self-hosted/database-settings'
import { IS_PLATFORM } from '@/lib/constants'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (IS_PLATFORM) {
    return res.status(404).json({ error: { message: 'Database settings proxy is unavailable' } })
  }

  const projectRef = Array.isArray(req.query.ref) ? undefined : req.query.ref
  if (!projectRef || !/^[A-Za-z0-9_-]{1,64}$/.test(projectRef)) {
    return res.status(400).json({ error: { message: 'Invalid project reference' } })
  }

  try {
    if (req.method === 'GET') {
      const result = await getDatabaseSettings(projectRef)
      return res.status(200).json({ ...result.settings, operation: result.operation })
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const result = await updateDatabaseSettings(projectRef, req.body)
      return res.status(200).json({ ...result.settings, operation: result.operation })
    }

    res.setHeader('Allow', ['GET', 'PUT', 'PATCH'])
    return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
  } catch (error) {
    if (error instanceof DatabaseSettingsManagementApiError) {
      return res.status(error.statusCode).json({ error: { message: error.message } })
    }

    return res.status(500).json({ error: { message: 'Unable to manage database settings' } })
  }
}
