import { useParams } from 'common'
import Link from 'next/link'

import { IS_PLATFORM } from '@/lib/constants'

export const ObservabilityLink = () => {
  const { ref } = useParams()

  return (
    <div className="flex items-center justify-center gap-1.5 text-sm">
      {IS_PLATFORM ? (
        <p className="text-foreground-light">
          Metrics are read from Logflare and Vector.{' '}
          <Link
            href={`/project/${ref}/settings/log-drains`}
            className="text-foreground underline underline-offset-2 decoration-foreground-muted hover:decoration-foreground transition-all"
          >
            Open log drains
          </Link>
        </p>
      ) : (
        <p className="text-foreground-light">
          Metrics are read from the local Logflare and Vector collectors configured for this
          self-hosted runtime.
        </p>
      )}
    </div>
  )
}
