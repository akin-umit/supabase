import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import {
  requestSelfHostedManagementRoot,
  SelfHostedManagementError,
} from '@/lib/api/self-hosted/management'
import { IS_PLATFORM } from '@/lib/constants'

const projectReconcileHandler = (req: NextApiRequest, res: NextApiResponse) =>
  apiWrapper(req, res, handler)

export default projectReconcileHandler

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'POST':
      return handlePost(req, res)
    default:
      res.setHeader('Allow', ['POST'])
      return res
        .status(405)
        .json({ data: null, error: { message: `Method ${method} Not Allowed` } })
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  if (IS_PLATFORM) {
    return res.status(404).json({
      data: null,
      error: { message: 'Self-hosted project reconcile is not available on platform' },
    })
  }

  const ref = Array.isArray(req.query.ref) ? undefined : req.query.ref
  if (!ref || !/^[A-Za-z0-9_-]{1,64}$/.test(ref)) {
    return res.status(400).json({ data: null, error: { message: 'Invalid project reference' } })
  }

  try {
    const response = await requestSelfHostedManagementRoot({
      resource: ['projects', ref, 'reconcile'],
      method: 'POST',
      body: {},
    })

    return res.status(202).json(response)
  } catch (error) {
    const status = error instanceof SelfHostedManagementError ? error.statusCode : 500
    const message =
      error instanceof SelfHostedManagementError
        ? explainSelfHostedReconcileError(error.message)
        : 'Self-hosted project reconcile failed.'

    return res.status(status).json({ data: null, error: { message } })
  }
}

function explainSelfHostedReconcileError(message: string) {
  if (message === 'Management API is not configured') {
    return 'Self-hosted project reconcile requires the management API write bridge. Configure INTERNAL_MANAGEMENT_API_URL and INTERNAL_MANAGEMENT_API_WRITE_TOKEN.'
  }
  if (message === 'Unable to reach management API') {
    return 'Unable to reach the self-hosted management API. Check the internal management API URL and network path from Studio.'
  }
  if (message.includes('managed_project_not_found')) {
    return 'The self-hosted project is not registered in the local management API.'
  }
  if (message.includes('coolify')) {
    return `Coolify project reconcile failed: ${message}`
  }
  return message
}
