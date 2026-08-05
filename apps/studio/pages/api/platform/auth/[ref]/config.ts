import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { getSelfHostedAuthConfig } from '@/lib/api/self-hosted/auth-config'
import {
  requestSelfHostedManagement,
  SelfHostedManagementError,
} from '@/lib/api/self-hosted/management'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'GET':
      return res.status(200).json(getSelfHostedAuthConfig())
    case 'PATCH': {
      const projectRef = String(req.query.ref ?? '')
      try {
        const data = await requestSelfHostedManagement({
          projectRef,
          resource: ['auth', 'config'],
          method: 'PATCH',
          body: req.body,
        })
        return res.status(200).json(data)
      } catch (error) {
        const status = error instanceof SelfHostedManagementError ? error.statusCode : 500
        const message =
          error instanceof Error ? error.message : 'Unable to update Auth configuration'
        return res.status(status).json({ data: null, error: { message } })
      }
    }
    default:
      res.setHeader('Allow', ['GET', 'PATCH'])
      return res.status(405).json({
        data: null,
        error: { message: `Method ${method} Not Allowed` },
      })
  }
}
