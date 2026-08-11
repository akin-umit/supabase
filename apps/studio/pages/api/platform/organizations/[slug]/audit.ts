import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { getSelfHostedAuditLogs } from '@/lib/api/self-hosted/organization'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res
      .status(405)
      .json({ data: null, error: { message: `Method ${req.method} Not Allowed` } })
  }

  const slug = typeof req.query.slug === 'string' ? req.query.slug : undefined
  const iso_timestamp_start =
    typeof req.query.iso_timestamp_start === 'string' ? req.query.iso_timestamp_start : undefined
  const iso_timestamp_end =
    typeof req.query.iso_timestamp_end === 'string' ? req.query.iso_timestamp_end : undefined

  return res
    .status(200)
    .json(await getSelfHostedAuditLogs({ slug, iso_timestamp_start, iso_timestamp_end }))
}
