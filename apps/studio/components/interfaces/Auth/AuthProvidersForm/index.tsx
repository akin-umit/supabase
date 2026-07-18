import { IS_PLATFORM, useParams } from 'common'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle, Button, WarningIcon } from 'ui'
import {
  PageSection,
  PageSectionContent,
  PageSectionDescription,
  PageSectionMeta,
  PageSectionSummary,
  PageSectionTitle,
} from 'ui-patterns/PageSection'

import { getPhoneProviderValidationSchema, PROVIDERS_SCHEMAS } from '../AuthProvidersFormValidation'
import type { Provider } from './AuthProvidersForm.types'
import { ProviderForm } from './ProviderForm'
import { AlertError } from '@/components/ui/AlertError'
import { ResourceList } from '@/components/ui/Resource/ResourceList'
import { HorizontalShimmerWithIcon } from '@/components/ui/Shimmers'
import { useAuthConfigQuery } from '@/data/auth/auth-config-query'
import { SELF_HOSTED_AUTH_CONFIG_FALLBACK } from '@/data/auth/self-hosted-auth-config-fallback'

export const AuthProvidersForm = () => {
  const { ref: projectRef } = useParams()
  const {
    data: authConfig,
    error: authConfigError,
    isPending: isLoading,
    isError,
    isSuccess,
  } = useAuthConfigQuery({ projectRef })
  const effectiveAuthConfig = !IS_PLATFORM
    ? authConfig ?? SELF_HOSTED_AUTH_CONFIG_FALLBACK
    : authConfig
  const shouldShowError = IS_PLATFORM && isError
  const shouldShowLoading = IS_PLATFORM && isLoading
  const shouldRenderProviders = !!effectiveAuthConfig && (!IS_PLATFORM || isSuccess)

  return (
    <PageSection>
      <PageSectionMeta>
        <PageSectionSummary>
          <PageSectionTitle>Auth Providers</PageSectionTitle>
          <PageSectionDescription>
            Authenticate your users through a suite of providers and login methods
          </PageSectionDescription>
        </PageSectionSummary>
      </PageSectionMeta>
      <PageSectionContent>
        {shouldShowError ? (
          <AlertError
            error={authConfigError}
            subject="Failed to retrieve auth configuration for hooks"
          />
        ) : (
          <div className="-space-y-px">
            {effectiveAuthConfig?.EXTERNAL_EMAIL_ENABLED &&
              effectiveAuthConfig?.MAILER_OTP_EXP > 3600 && (
              <Alert className="flex w-full items-center justify-between my-3" variant="warning">
                <WarningIcon />
                <div>
                  <AlertTitle>OTP expiry exceeds recommended threshold</AlertTitle>
                  <AlertDescription className="flex flex-col gap-y-3">
                    <p>
                      We have detected that you have enabled the email provider with the OTP expiry
                      set to more than an hour. It is recommended to set this value to less than an
                      hour.
                    </p>
                    <Button asChild variant="default" className="w-min" icon={<ExternalLink />}>
                      <Link href="https://supabase.com/docs/guides/platform/going-into-prod#security">
                        View security recommendations
                      </Link>
                    </Button>
                  </AlertDescription>
                </div>
              </Alert>
            )}

            <ResourceList>
              {shouldShowLoading &&
                PROVIDERS_SCHEMAS.map((provider) => (
                  <div
                    key={`provider_${provider.title}`}
                    className="py-4 px-6 border-b last:border-b-none"
                  >
                    <HorizontalShimmerWithIcon />
                  </div>
                ))}
              {shouldRenderProviders &&
                PROVIDERS_SCHEMAS.map((provider) => {
                  const providerSchema =
                    provider.title === 'Phone'
                      ? {
                          ...provider,
                          validationSchema: getPhoneProviderValidationSchema(effectiveAuthConfig),
                        }
                      : provider
                  let isActive = false
                  if (providerSchema.title === 'SAML 2.0') {
                    isActive = effectiveAuthConfig && (effectiveAuthConfig as any)['SAML_ENABLED']
                  } else if (providerSchema.title === 'LinkedIn (OIDC)') {
                    isActive =
                      effectiveAuthConfig &&
                      (effectiveAuthConfig as any)['EXTERNAL_LINKEDIN_OIDC_ENABLED']
                  } else if (providerSchema.title === 'Slack (OIDC)') {
                    isActive =
                      effectiveAuthConfig &&
                      (effectiveAuthConfig as any)['EXTERNAL_SLACK_OIDC_ENABLED']
                  } else if (providerSchema.title.includes('Web3')) {
                    isActive =
                      effectiveAuthConfig &&
                      (effectiveAuthConfig as any)['EXTERNAL_WEB3_SOLANA_ENABLED']
                  } else if (providerSchema.title.includes('X / Twitter (OAuth 2.0)')) {
                    isActive =
                      effectiveAuthConfig && (effectiveAuthConfig as any)['EXTERNAL_X_ENABLED']
                  } else if (providerSchema.title === 'Twitter (Deprecated)') {
                    isActive =
                      effectiveAuthConfig &&
                      (effectiveAuthConfig as any)['EXTERNAL_TWITTER_ENABLED']
                  } else {
                    isActive =
                      effectiveAuthConfig &&
                      (effectiveAuthConfig as any)[
                        `EXTERNAL_${providerSchema.title.toUpperCase()}_ENABLED`
                      ]
                  }
                  return (
                    <ProviderForm
                      key={`provider_${providerSchema.title}`}
                      config={effectiveAuthConfig}
                      provider={providerSchema as unknown as Provider}
                      isActive={isActive}
                    />
                  )
                })}
            </ResourceList>
          </div>
        )}
      </PageSectionContent>
    </PageSection>
  )
}
