import { Admonition } from 'ui-patterns/admonition'

import { VectorBucketsLocalDisabledState } from './VectorBucketsLocalDisabledState'
import { AlertError } from '@/components/ui/AlertError'
import { useDeploymentMode } from '@/hooks/misc/useDeploymentMode'
import type { ResponseError } from '@/types'

interface VectorBucketsErrorStateProps {
  error: ResponseError | null
}

export const VectorBucketsErrorState = ({ error }: VectorBucketsErrorStateProps) => {
  const { isCli, isSelfHosted } = useDeploymentMode()

  if (isCli) return <VectorBucketsLocalDisabledState />
  if (isSelfHosted) {
    return (
      <Admonition type="warning" title="Vector bucket API is not available">
        <p className="text-foreground-light">
          Studio tried the self-hosted Storage vector bucket API and it did not return a usable
          response. Enable the vector bucket runtime in your deployment, then restart Storage and
          Kong.
        </p>
        {error?.message && (
          <p className="mt-2 font-mono text-xs text-foreground-light">{error.message}</p>
        )}
      </Admonition>
    )
  }

  return <AlertError error={error} subject="Failed to retrieve vector buckets" />
}
