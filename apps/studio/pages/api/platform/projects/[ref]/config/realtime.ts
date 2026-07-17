import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { getSelfHostedRealtimeConfig } from '@/lib/api/self-hosted/realtime'
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

const handleGet = async (_req: NextApiRequest, res: NextApiResponse) => {
  if (IS_PLATFORM) {
    return res
      .status(404)
      .json({ error: { message: 'Realtime self-hosted config is not available on platform' } })
  }

  return res.status(200).json(getSelfHostedRealtimeConfig())
}

const handlePatch = async (_req: NextApiRequest, res: NextApiResponse) => {
  if (IS_PLATFORM) {
    return res
      .status(404)
      .json({ error: { message: 'Realtime self-hosted config is not available on platform' } })
  }

  return res.status(405).json({
    error: {
      message:
        'Realtime settings are read-only in self-hosted Studio. Change Realtime environment variables and redeploy.',
    },
  })
}
