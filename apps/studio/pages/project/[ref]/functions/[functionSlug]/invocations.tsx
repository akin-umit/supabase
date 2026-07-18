import { useParams } from 'common'

import { LogsPreviewer } from '@/components/interfaces/Settings/Logs/LogsPreviewer'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import EdgeFunctionDetailsLayout from '@/components/layouts/EdgeFunctionsLayout/EdgeFunctionDetailsLayout'
import { useEdgeFunctionQuery } from '@/data/edge-functions/edge-function-query'
import type { NextPageWithLayout } from '@/types'

export const LogPage: NextPageWithLayout = () => {
  const { ref, functionSlug } = useParams()
  const { data: selectedFunction, isPending: isLoading } = useEdgeFunctionQuery({
    projectRef: ref,
    slug: functionSlug,
  })

  if (isLoading) {
    return (
      <div className="flex-1 p-6 text-sm text-foreground-light">
        Loading function invocations...
      </div>
    )
  }

  if (selectedFunction === undefined) {
    return (
      <div className="flex-1 p-6 text-sm text-foreground-light">
        Function metadata could not be loaded. Logs can still be queried from Observability.
      </div>
    )
  }

  return (
    <div className="flex-1">
      <LogsPreviewer
        condensedLayout
        projectRef={ref as string}
        queryType="fn_edge"
        filterOverride={{ 'request.pathname': `/functions/v1/${selectedFunction.slug}` }}
      />
    </div>
  )
}

LogPage.getLayout = (page) => (
  <DefaultLayout>
    <EdgeFunctionDetailsLayout title="Invocations">{page}</EdgeFunctionDetailsLayout>
  </DefaultLayout>
)

export default LogPage
