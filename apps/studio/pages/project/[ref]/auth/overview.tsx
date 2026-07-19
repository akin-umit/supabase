import { FeatureFlagContext, useFlag, useParams } from 'common'
import { useRouter } from 'next/router'
import { useContext, useEffect } from 'react'
import { Admonition } from 'ui-patterns/admonition'
import { PageContainer } from 'ui-patterns/PageContainer'
import {
  PageHeader,
  PageHeaderAside,
  PageHeaderMeta,
  PageHeaderSummary,
  PageHeaderTitle,
} from 'ui-patterns/PageHeader'

import { OverviewLearnMore } from '@/components/interfaces/Auth/Overview/OverviewLearnMore'
import { OverviewMetrics } from '@/components/interfaces/Auth/Overview/OverviewMetrics'
import AuthLayout from '@/components/layouts/AuthLayout/AuthLayout'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { DocsButton } from '@/components/ui/DocsButton'
import { useAuthOverviewQuery } from '@/data/auth/auth-overview-query'
import { DOCS_URL, IS_PLATFORM } from '@/lib/constants'
import { NextPageWithLayout } from '@/types'

const AuthOverview: NextPageWithLayout = () => {
  const router = useRouter()
  const { ref } = useParams()
  const { hasLoaded } = useContext(FeatureFlagContext)
  const authOverviewPageEnabled = useFlag('authOverviewPage')

  const {
    data: metrics,
    isPending: isLoading,
    error,
  } = useAuthOverviewQuery({ projectRef: ref }, { enabled: IS_PLATFORM && !!ref })

  useEffect(() => {
    if (IS_PLATFORM && hasLoaded && !authOverviewPageEnabled) {
      router.replace(`/project/${ref}/auth/users`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authOverviewPageEnabled, router, ref])

  if (IS_PLATFORM && !authOverviewPageEnabled) {
    return null
  }

  return (
    <>
      <PageHeader size="large">
        <PageHeaderMeta>
          <PageHeaderSummary>
            <PageHeaderTitle>Overview</PageHeaderTitle>
          </PageHeaderSummary>
          <PageHeaderAside>
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground-light">
                <span className="text-foreground">Last 24 hours</span>
              </span>
              <DocsButton href={`${DOCS_URL}/guides/auth`} />
            </div>
          </PageHeaderAside>
        </PageHeaderMeta>
      </PageHeader>
      <PageContainer size="large">
        {IS_PLATFORM ? (
          <>
            <OverviewMetrics metrics={metrics} isLoading={isLoading} error={error} />
            <OverviewLearnMore />
          </>
        ) : (
          <Admonition type="default" title="Auth overview metrics are managed outside Studio">
            <div className="space-y-3 text-sm text-foreground-light">
              <p>
                This self-hosted Studio does not have the Supabase Cloud Auth analytics endpoint.
                Inspect Auth activity through your logging stack or the Auth service logs.
              </p>
              <DocsButton href={`${DOCS_URL}/guides/self-hosting/auth/config`} />
            </div>
          </Admonition>
        )}
      </PageContainer>
    </>
  )
}

AuthOverview.getLayout = (page) => (
  <DefaultLayout>
    <AuthLayout title="Overview">{page}</AuthLayout>
  </DefaultLayout>
)

export default AuthOverview
