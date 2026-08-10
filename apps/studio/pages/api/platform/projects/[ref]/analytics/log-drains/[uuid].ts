import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { IS_PLATFORM } from '@/lib/constants'
import { PROJECT_ANALYTICS_URL } from '@/lib/constants/api'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req
  const { uuid } = req.query

  const missingEnvVars = envVarsSet()

  if (missingEnvVars !== true) {
    return res
      .status(IS_PLATFORM ? 500 : 503)
      .json({ error: { message: `${missingEnvVars.join(', ')} env variables are not set` } })
  }

  const baseUrl = PROJECT_ANALYTICS_URL
  if (!baseUrl) {
    return res
      .status(IS_PLATFORM ? 500 : 503)
      .json({ error: { message: `LOGFLARE_URL env variable is not set` } })
  }

  switch (method) {
    case 'GET':
      // get log drain
      const url = new URL(baseUrl)
      url.pathname = `/api/backends/${uuid}`
      const upstream = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.LOGFLARE_PRIVATE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      })
      const result = await upstream.json().catch(() => undefined)
      if (!upstream.ok || !result) {
        return res.status(upstream.status).json({
          error: { message: result?.error ?? 'Failed to fetch log drain from Logflare' },
        })
      }

      return res.status(200).json(result)
    case 'POST': {
      if (req.body?.action !== 'test') {
        return res.status(400).json({ error: { message: 'Unsupported log drain action' } })
      }

      const testUrl = new URL(baseUrl)
      testUrl.pathname = `/api/backends/${uuid}/test`
      const upstream = await fetch(testUrl, {
        body: JSON.stringify({ message: 'Supabase Studio log drain test event' }),
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.LOGFLARE_PRIVATE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      })
      const result = await upstream.json().catch(() => undefined)
      if (!upstream.ok) {
        return res.status(upstream.status).json({
          error: { message: result?.error ?? 'Failed to test log drain in Logflare' },
        })
      }
      return res.status(200).json(result ?? { ok: true })
    }
    case 'PUT':
      // create the log drain
      const putUrl = new URL(baseUrl)
      putUrl.pathname = `/api/backends/${uuid}`
      delete req.body['metadata']
      const putResponse = await fetch(putUrl, {
        body: JSON.stringify(req.body),
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${process.env.LOGFLARE_PRIVATE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      })
      const putResult = await putResponse.json().catch(() => undefined)
      if (!putResponse.ok || !putResult) {
        return res.status(putResponse.status).json({
          error: { message: putResult?.error ?? 'Error updating log drain in Logflare' },
        })
      }
      return res.status(200).json(putResult)

    case 'DELETE':
      // create the log drain
      const deleteUrl = new URL(baseUrl)
      deleteUrl.pathname = `/api/backends/${uuid}`

      const deleteResponse = await fetch(deleteUrl, {
        headers: {
          Authorization: `Bearer ${process.env.LOGFLARE_PRIVATE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        method: 'DELETE',
      })
      if (!deleteResponse.ok) {
        return res.status(deleteResponse.status).json({
          error: { message: 'Error deleting log drain in Logflare' },
        })
      }
      return res.status(204).json({ error: null })
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
      res.status(405).json({ data: null, error: { message: `Method ${method} Not Allowed` } })
  }
}

const envVarsSet = () => {
  const missingEnvVars = [
    process.env.LOGFLARE_PRIVATE_ACCESS_TOKEN ? null : 'LOGFLARE_PRIVATE_ACCESS_TOKEN',
    process.env.LOGFLARE_URL ? null : 'LOGFLARE_URL',
  ].filter((v) => v)
  if (missingEnvVars.length == 0) {
    return true
  } else {
    return missingEnvVars
  }
}
