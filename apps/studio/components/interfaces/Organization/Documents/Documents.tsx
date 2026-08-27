import { Fragment } from 'react'

import { CustomDocument } from './CustomDocument'
import { DPA } from './DPA'
import { HIPAA } from './HIPAA'
import { ISO27001 } from './ISO27001'
import { SecurityQuestionnaire } from './SecurityQuestionnaire'
import { SOC2 } from './SOC2'
import { TIA } from './TIA'
import { SupportLink } from '@/components/interfaces/Support/SupportLink'
import {
  ScaffoldContainer,
  ScaffoldDivider,
  ScaffoldSection,
  ScaffoldSectionDetail,
  ScaffoldSectionTitle,
} from '@/components/layouts/Scaffold'
import { InlineLink, InlineLinkClassName } from '@/components/ui/InlineLink'
import { useCustomContent } from '@/hooks/custom-content/useCustomContent'
import { useSelectedOrganizationQuery } from '@/hooks/misc/useSelectedOrganization'

export const Documents = () => {
  const { data: organization } = useSelectedOrganizationQuery()
  const { organizationLegalDocuments } = useCustomContent(['organization:legal_documents'])
  const isSelfHosted = organization?.integration_source === 'self-hosted'

  if (Array.isArray(organizationLegalDocuments)) {
    return organizationLegalDocuments.map((doc, idx) => {
      return (
        <Fragment key={doc.id}>
          <CustomDocument doc={doc} />
          {idx !== organizationLegalDocuments.length - 1 && <ScaffoldDivider />}
        </Fragment>
      )
    })
  }

  if (isSelfHosted) {
    return (
      <>
        <ScaffoldContainer id="dpa" className="px-6 xl:px-10">
          <ScaffoldSection>
            <ScaffoldSectionDetail>
              <ScaffoldSectionTitle>Data Processing Addendum</ScaffoldSectionTitle>
              <p className="text-sm text-foreground-light m-0">
                Public Supabase DPA reference for self-hosted deployments.
              </p>
            </ScaffoldSectionDetail>
            <div>
              <InlineLink href="https://supabase.com/downloads/docs/Supabase+DPA+260601.pdf">
                Open DPA reference
              </InlineLink>
            </div>
          </ScaffoldSection>
        </ScaffoldContainer>

        <ScaffoldDivider />

        <ScaffoldContainer id="tia" className="px-6 xl:px-10">
          <ScaffoldSection>
            <ScaffoldSectionDetail>
              <ScaffoldSectionTitle>Transfer Impact Assessment</ScaffoldSectionTitle>
              <p className="text-sm text-foreground-light m-0">
                Public Supabase TIA reference for self-hosted deployments.
              </p>
            </ScaffoldSectionDetail>
            <div>
              <InlineLink href="https://supabase.com/downloads/docs/Supabase+TIA+250314.pdf">
                Open TIA reference
              </InlineLink>
            </div>
          </ScaffoldSection>
        </ScaffoldContainer>

        <ScaffoldDivider />

        <ScaffoldContainer className="px-6 xl:px-10">
          <ScaffoldSection className="py-12">
            <ScaffoldSectionDetail className="col-span-full">
              <ScaffoldSectionTitle>Self-hosted compliance documents</ScaffoldSectionTitle>
              <p className="text-sm text-foreground-light m-0">
                SOC 2, ISO 27001, HIPAA, W-9, and security questionnaires are Supabase Cloud
                legal artifacts. Self-hosted Studio keeps this page available without calling
                Cloud-only document request APIs; add deployment-specific documents through custom
                content when required.
              </p>
            </ScaffoldSectionDetail>
          </ScaffoldSection>
        </ScaffoldContainer>
      </>
    )
  }

  return (
    <>
      <ScaffoldContainer id="dpa" className="px-6 xl:px-10">
        <DPA />
      </ScaffoldContainer>

      <ScaffoldDivider />

      <ScaffoldContainer id="tia" className="px-6 xl:px-10">
        <TIA />
      </ScaffoldContainer>

      <ScaffoldDivider />

      <ScaffoldContainer id="soc2" className="px-6 xl:px-10">
        <SOC2 />
      </ScaffoldContainer>

      <ScaffoldDivider />

      <ScaffoldContainer id="iso27001" className="px-6 xl:px-10">
        <ISO27001 />
      </ScaffoldContainer>

      <ScaffoldDivider />

      <ScaffoldContainer id="hipaa" className="px-6 xl:px-10">
        <HIPAA />
      </ScaffoldContainer>

      <ScaffoldDivider />

      <ScaffoldContainer id="security-questionnaire" className="px-6 xl:px-10">
        <SecurityQuestionnaire />
      </ScaffoldContainer>

      <ScaffoldDivider />

      <ScaffoldContainer className="px-6 xl:px-10">
        <ScaffoldSection className="py-12">
          <ScaffoldSectionDetail className="col-span-full">
            <p className="text-sm text-foreground-light m-0">
              <SupportLink className={InlineLinkClassName}>Submit a support request</SupportLink> if
              you require additional documents for financial or tax reasons, such as a W-9 form.
            </p>
          </ScaffoldSectionDetail>
        </ScaffoldSection>
      </ScaffoldContainer>
    </>
  )
}
