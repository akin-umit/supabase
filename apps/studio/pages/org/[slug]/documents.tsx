import { useParams } from 'common'
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderMeta,
  PageHeaderSummary,
  PageHeaderTitle,
} from 'ui-patterns/PageHeader'

import { Documents } from '@/components/interfaces/Organization/Documents/Documents'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import OrganizationLayout from '@/components/layouts/OrganizationLayout'
import { OrganizationSettingsLayout } from '@/components/layouts/ProjectLayout/OrganizationSettingsLayout'
import { ScaffoldDivider } from '@/components/layouts/Scaffold'
import { UnknownInterface } from '@/components/ui/UnknownInterface'
import { useIsFeatureEnabled } from '@/hooks/misc/useIsFeatureEnabled'
import { IS_PLATFORM } from '@/lib/constants'
import type { NextPageWithLayout } from '@/types'

const OrgDocuments: NextPageWithLayout = () => {
  const { slug } = useParams()

  const showLegalDocuments = useIsFeatureEnabled('organization:show_legal_documents')
  const showDocuments = !IS_PLATFORM || showLegalDocuments

  if (!showDocuments) {
    return <UnknownInterface urlBack={`/org/${slug}`} />
  }

  return (
    <>
      <PageHeader size="default" className="pb-12">
        <PageHeaderMeta>
          <PageHeaderSummary>
            <PageHeaderTitle>Legal Documents</PageHeaderTitle>
            <PageHeaderDescription>
              Compliance documentation and legal agreements
            </PageHeaderDescription>
          </PageHeaderSummary>
        </PageHeaderMeta>
      </PageHeader>
      <ScaffoldDivider />
      <Documents />
    </>
  )
}

OrgDocuments.getLayout = (page) => (
  <DefaultLayout>
    <OrganizationLayout title="Legal Documents">
      <OrganizationSettingsLayout>{page}</OrganizationSettingsLayout>
    </OrganizationLayout>
  </DefaultLayout>
)

export default OrgDocuments
