import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import {
  getRuntimeConfig,
  runtimeConfigResourceSchema,
  RuntimeManagementApiError,
  updateRuntimeConfig,
} from '@/lib/api/self-hosted/runtime-config'
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
      return res
        .status(405)
        .json({ data: null, error: { message: `Method ${method} Not Allowed` } })
  }
}

function readPath(req: NextApiRequest) {
  const projectRef = Array.isArray(req.query.ref) ? undefined : req.query.ref
  const resource = Array.isArray(req.query.resource) ? undefined : req.query.resource
  const runtimeResource = runtimeConfigResourceSchema.safeParse(resource)

  if (!projectRef || !/^[A-Za-z0-9_-]{1,64}$/.test(projectRef) || !runtimeResource.success) {
    return { error: 'Invalid runtime config path' as const }
  }

  return { projectRef, resource: runtimeResource.data }
}

function sendRuntimeError(res: NextApiResponse, error: unknown) {
  if (error instanceof RuntimeManagementApiError) {
    return res.status(error.statusCode).json({ data: null, error: { message: error.message } })
  }

  return res
    .status(500)
    .json({ data: null, error: { message: 'Unable to retrieve runtime config' } })
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  if (IS_PLATFORM) {
    return res.status(404).json({
      data: null,
      error: { message: 'Runtime config proxy is not available on platform' },
    })
  }

  const path = readPath(req)
  if ('error' in path) {
    return res.status(400).json({ data: null, error: { message: path.error } })
  }

  try {
    const data = await getRuntimeConfig(path.projectRef, path.resource)
    return res.status(200).json(data)
  } catch (error) {
    return sendRuntimeError(res, error)
  }
}

async function handlePatch(req: NextApiRequest, res: NextApiResponse) {
  if (IS_PLATFORM) {
    return res.status(404).json({
      data: null,
      error: { message: 'Runtime config proxy is not available on platform' },
    })
  }

  const path = readPath(req)
  if ('error' in path) {
    return res.status(400).json({ data: null, error: { message: path.error } })
  }

  try {
    const data = await updateRuntimeConfig(path.projectRef, path.resource, req.body)
    return res.status(200).json(data)
  } catch (error) {
    return sendRuntimeError(res, error)
  }
}
