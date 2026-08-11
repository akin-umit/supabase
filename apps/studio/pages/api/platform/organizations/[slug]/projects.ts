import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { getSelfHostedOrganizationProjects } from '@/lib/api/self-hosted/organization'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res
      .status(405)
      .json({ data: null, error: { message: `Method ${req.method} Not Allowed` } })
  }

  const limit = Number(req.query.limit ?? 96)
  const offset = Number(req.query.offset ?? 0)
  const search = typeof req.query.search === 'string' ? req.query.search : undefined
  const statuses = typeof req.query.statuses === 'string' ? req.query.statuses : undefined
  const sort = typeof req.query.sort === 'string' ? req.query.sort : undefined

  return res
    .status(200)
    .json(await getSelfHostedOrganizationProjects({ limit, offset, search, statuses, sort }))
}
