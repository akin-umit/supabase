import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { getSelfHostedAuthConfig } from '@/lib/api/self-hosted/auth-config'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'GET':
      return res.status(200).json(getSelfHostedAuthConfig())
    case 'PATCH':
      return res.status(501).json({
        data: null,
        error: {
          message:
            'Updating Auth configuration from Studio is not implemented for this self-hosted runtime yet. Set the corresponding GOTRUE_* environment variables and redeploy.',
        },
      })
    default:
      res.setHeader('Allow', ['GET', 'PATCH'])
      return res.status(405).json({
        data: null,
        error: { message: `Method ${method} Not Allowed` },
      })
  }
}
