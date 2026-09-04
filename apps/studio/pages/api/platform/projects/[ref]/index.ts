import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import {
  requestSelfHostedManagementRoot,
  SelfHostedManagementError,
} from '@/lib/api/self-hosted/management'
import { getSelfHostedProject } from '@/lib/api/self-hosted/organization'
import { PROJECT_REST_URL } from '@/lib/constants/api'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'GET':
      return handleGet(req, res)
    case 'DELETE':
      return handleDelete(req, res)
    default:
      res.setHeader('Allow', ['GET', 'DELETE'])
      res.status(405).json({ data: null, error: { message: `Method ${method} Not Allowed` } })
  }
}

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  const ref = String(req.query.ref ?? 'default')
  const response = {
    ...(await getSelfHostedProject(ref)),
    connectionString: '',
    restUrl: PROJECT_REST_URL,
  }

  return res.status(200).json(response)
}

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  const ref = String(req.query.ref ?? '')

  try {
    await requestSelfHostedManagementRoot({
      resource: ['projects', ref],
      method: 'DELETE',
      body: { confirm: ref },
    })

    return res.status(200).json({ ref })
  } catch (error) {
    const status = error instanceof SelfHostedManagementError ? error.statusCode : 500
    const message =
      error instanceof SelfHostedManagementError
        ? explainSelfHostedDeleteError(error.message)
        : 'Self-hosted project deletion failed.'

    return res.status(status).json({ data: null, error: { message } })
  }
}

function explainSelfHostedDeleteError(message: string) {
  if (message === 'Management API is not configured') {
    return 'Self-hosted project deletion requires the management API write bridge. Configure INTERNAL_MANAGEMENT_API_URL and INTERNAL_MANAGEMENT_API_WRITE_TOKEN.'
  }
  if (message === 'Unable to reach management API') {
    return 'Unable to reach the self-hosted management API. Check the internal management API URL and network path from Studio.'
  }
  if (message.includes('managed_project_not_found')) {
    return 'The self-hosted project is not registered in the local management API.'
  }
  if (message.includes('coolify')) {
    return `Coolify project deletion failed: ${message}`
  }
  return message
}
