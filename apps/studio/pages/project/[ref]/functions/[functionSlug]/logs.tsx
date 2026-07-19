import { useParams } from 'common'
import { Admonition } from 'ui-patterns/admonition'
import { GenericSkeletonLoader } from 'ui-patterns/ShimmeringLoader'

import { LogsPreviewer } from '@/components/interfaces/Settings/Logs/LogsPreviewer'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import EdgeFunctionDetailsLayout from '@/components/layouts/EdgeFunctionsLayout/EdgeFunctionDetailsLayout'
import { AlertError } from '@/components/ui/AlertError'
import { useEdgeFunctionQuery } from '@/data/edge-functions/edge-function-query'
import { useDeploymentMode } from '@/hooks/misc/useDeploymentMode'
import type { NextPageWithLayout } from '@/types'

export const LogPage: NextPageWithLayout = () => {
  const { ref, functionSlug } = useParams()
  const { isSelfHosted } = useDeploymentMode()

  const {
    data: selectedFunction,
    error,
    isError,
    isPending: isLoading,
  } = useEdgeFunctionQuery({
    projectRef: ref,
    slug: functionSlug,
  })

  if (isLoading) return <GenericSkeletonLoader />

  if (isError) {
    return isSelfHosted ? (
      <Admonition type="warning" title="Could not load function metadata for logs">
        <p className="text-sm text-foreground-light">
          Studio could not read this function from the self-hosted Functions runtime. Confirm that
          the function directory exists under the mounted functions volume, then refresh this page.
        </p>
      </Admonition>
    ) : (
      <AlertError error={error} subject="Failed to retrieve edge function" />
    )
  }

  if (selectedFunction === undefined) return null

  return (
    <div className="flex-1">
      <LogsPreviewer
        condensedLayout
        projectRef={ref as string}
        queryType="functions"
        filterOverride={{ 'metadata.function_id': selectedFunction.id }}
      />
    </div>
  )
}

LogPage.getLayout = (page) => (
  <DefaultLayout>
    <EdgeFunctionDetailsLayout title="Logs">{page}</EdgeFunctionDetailsLayout>
  </DefaultLayout>
)

export default LogPage
