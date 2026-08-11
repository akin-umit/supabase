import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import {
  deleteSelfHostedThirdPartyAuthIntegration,
  ThirdPartyAuthManagementApiError,
} from '@/lib/api/self-hosted/third-party-auth'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ref = Array.isArray(req.query.ref) ? undefined : req.query.ref
  const tpaId = Array.isArray(req.query.tpa_id) ? undefined : req.query.tpa_id
  if (!ref || !tpaId) {
    return res.status(400).json({ message: 'Project ref and integration id are required' })
  }

  try {
    if (req.method === 'DELETE') {
      return res.status(200).json(await deleteSelfHostedThirdPartyAuthIntegration(ref, tpaId))
    }
    res.setHeader('Allow', ['DELETE'])
    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    const status = error instanceof ThirdPartyAuthManagementApiError ? error.statusCode : 500
    const message =
      error instanceof Error ? error.message : 'Third-party auth integration operation failed'
    return res.status(status).json({ message })
  }
}
