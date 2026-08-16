import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { getSelfHostedAuthConfig } from '@/lib/api/self-hosted/auth-config'
import {
  requestSelfHostedManagement,
  SelfHostedManagementError,
} from '@/lib/api/self-hosted/management'

const AUTH_WRITE_BRIDGE_UNAVAILABLE_MESSAGE =
  'Auth settings can be read from the self-host runtime, but saving changes requires the self-host management API write bridge. Configure INTERNAL_MANAGEMENT_API_URL and INTERNAL_MANAGEMENT_API_WRITE_TOKEN so Studio can persist GOTRUE_* settings and apply the Auth service runtime.'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'GET':
      try {
        const projectRef = String(req.query.ref ?? '')
        const data = await requestSelfHostedManagement({
          projectRef,
          resource: ['auth', 'config'],
          method: 'GET',
        })
        return res.status(200).json(data)
      } catch (error) {
        if (error instanceof SelfHostedManagementError) {
          return res.status(200).json(getSelfHostedAuthConfig())
        }
        const status = error instanceof SelfHostedManagementError ? error.statusCode : 500
        const message =
          error instanceof Error ? error.message : 'Unable to retrieve Auth configuration'
        return res.status(status).json({ data: null, error: { message } })
      }
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
          error instanceof SelfHostedManagementError && error.statusCode === 503
            ? AUTH_WRITE_BRIDGE_UNAVAILABLE_MESSAGE
            : error instanceof Error
              ? error.message
              : 'Unable to update Auth configuration'
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
