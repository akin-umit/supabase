import type { components } from 'api-types'
import { type NextApiRequest, type NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { getFunctionsArtifactStore } from '@/lib/api/self-hosted/functions'
import { uuidv4 } from '@/lib/helpers'

export default function handlerWithErrorCatching(req: NextApiRequest, res: NextApiResponse) {
  return apiWrapper(req, res, handler, { withAuth: true })
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'POST':
      return handlePost(req, res)
    default:
      res.setHeader('Allow', ['POST'])
      res.status(405).json({ data: null, error: { message: `Method ${method} Not Allowed` } })
  }
}

type EdgeFunctionsResponse = components['schemas']['FunctionResponse']

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const slugParam = req.query.slug
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam
  if (!slug) {
    return res.status(400).json({ error: { message: `Missing function 'slug' parameter` } })
  }

  const files = req.body?.files
  if (!Array.isArray(files)) {
    return res.status(400).json({ error: { message: 'Function files are required' } })
  }

  try {
    const artifact = await getFunctionsArtifactStore().upsertFunction({ slug, files })
    const functionResponse = {
      id: uuidv4(),
      slug: artifact.slug,
      version: 1,
      name: artifact.slug,
      status: 'ACTIVE',
      entrypoint_path: artifact.entrypoint_path,
      created_at: artifact.created_at,
      updated_at: artifact.updated_at,
    } satisfies EdgeFunctionsResponse

    return res.status(200).json({
      ...functionResponse,
      restart_required: true,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to deploy function'
    return res.status(400).json({ error: { message } })
  }
}
