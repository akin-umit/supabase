import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import {
  createSelfHostedThirdPartyAuthIntegration,
  listSelfHostedThirdPartyAuthIntegrations,
  ThirdPartyAuthManagementApiError,
} from '@/lib/api/self-hosted/third-party-auth'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ref = Array.isArray(req.query.ref) ? undefined : req.query.ref
  if (!ref) return res.status(400).json({ message: 'Project ref is required' })

  try {
    if (req.method === 'GET') {
      return res.status(200).json(await listSelfHostedThirdPartyAuthIntegrations(ref))
    }
    if (req.method === 'POST') {
      return res.status(201).json(await createSelfHostedThirdPartyAuthIntegration(ref, req.body))
    }
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    const status = error instanceof ThirdPartyAuthManagementApiError ? error.statusCode : 500
    const message =
      error instanceof Error ? error.message : 'Third-party auth integration operation failed'
    return res.status(status).json({ message })
  }
}
