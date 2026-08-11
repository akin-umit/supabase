import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { getSelfHostedUsage } from '@/lib/api/self-hosted/organization'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res
      .status(405)
      .json({ data: null, error: { message: `Method ${req.method} Not Allowed` } })
  }

  return res.status(200).json(await getSelfHostedUsage())
}
