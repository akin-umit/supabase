import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import {
  getSelfHostedOrganization,
  updateSelfHostedOrganization,
} from '@/lib/api/self-hosted/organization'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return res.status(200).json(await getSelfHostedOrganization())
    case 'PATCH':
      return res.status(200).json(await updateSelfHostedOrganization(req.body ?? {}))
    default:
      res.setHeader('Allow', ['GET', 'PATCH'])
      return res
        .status(405)
        .json({ data: null, error: { message: `Method ${req.method} Not Allowed` } })
  }
}
