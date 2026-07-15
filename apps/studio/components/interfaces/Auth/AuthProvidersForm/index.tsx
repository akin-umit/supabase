import { IS_PLATFORM, useParams } from 'common'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle, Button, Card, CardContent, WarningIcon } from 'ui'
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
import { DOCS_URL } from '@/lib/constants'

export const AuthProvidersForm = () => {
  const { ref: projectRef } = useParams()
  const {
    data: authConfig,
    error: authConfigError,
    isPending: isLoading,
    isError,
    isSuccess,
  } = useAuthConfigQuery({ projectRef }, { enabled: IS_PLATFORM })

  if (!IS_PLATFORM) {
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
          <Card>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">Self-hosted provider configuration</h3>
                <p className="text-sm text-foreground-light">
                  Provider settings are managed through GoTrue environment variables in your
                  deployment. Update the relevant variables in Coolify or your compose environment,
                  then redeploy the Auth service.
                </p>
              </div>
              <div className="divide-y rounded border text-sm">
                {[
                  ['EXTERNAL_EMAIL_ENABLED', 'Enables email/password and OTP login.'],
                  [
                    'GOTRUE_EXTERNAL_*_ENABLED',
                    'Enables OAuth providers such as Google or GitHub.',
                  ],
                  ['GOTRUE_EXTERNAL_*_CLIENT_ID', 'Stores provider client identifiers.'],
                  ['GOTRUE_EXTERNAL_*_SECRET', 'Stores provider client secrets outside Git.'],
                  ['GOTRUE_SITE_URL', 'Controls the primary redirect URL for Auth flows.'],
                ].map(([name, description]) => (
                  <div className="grid gap-2 px-4 py-3 md:grid-cols-[260px_1fr]" key={name}>
                    <span className="font-mono text-xs text-foreground-light">{name}</span>
                    <span>{description}</span>
                  </div>
                ))}
              </div>
              <Button asChild type="button" variant="default">
                <Link href={`${DOCS_URL}/guides/self-hosting/auth/config`}>
                  Open self-hosted Auth docs
                </Link>
              </Button>
            </CardContent>
          </Card>
        </PageSectionContent>
      </PageSection>
    )
  }

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
        {isError ? (
          <AlertError
            error={authConfigError}
            subject="Failed to retrieve auth configuration for hooks"
          />
        ) : (
          <div className="-space-y-px">
            {authConfig?.EXTERNAL_EMAIL_ENABLED && authConfig?.MAILER_OTP_EXP > 3600 && (
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
              {isLoading &&
                PROVIDERS_SCHEMAS.map((provider) => (
                  <div
                    key={`provider_${provider.title}`}
                    className="py-4 px-6 border-b last:border-b-none"
                  >
                    <HorizontalShimmerWithIcon />
                  </div>
                ))}
              {isSuccess &&
                PROVIDERS_SCHEMAS.map((provider) => {
                  const providerSchema =
                    provider.title === 'Phone'
                      ? {
                          ...provider,
                          validationSchema: getPhoneProviderValidationSchema(authConfig),
                        }
                      : provider
                  let isActive = false
                  if (providerSchema.title === 'SAML 2.0') {
                    isActive = authConfig && (authConfig as any)['SAML_ENABLED']
                  } else if (providerSchema.title === 'LinkedIn (OIDC)') {
                    isActive = authConfig && (authConfig as any)['EXTERNAL_LINKEDIN_OIDC_ENABLED']
                  } else if (providerSchema.title === 'Slack (OIDC)') {
                    isActive = authConfig && (authConfig as any)['EXTERNAL_SLACK_OIDC_ENABLED']
                  } else if (providerSchema.title.includes('Web3')) {
                    isActive = authConfig && (authConfig as any)['EXTERNAL_WEB3_SOLANA_ENABLED']
                  } else if (providerSchema.title.includes('X / Twitter (OAuth 2.0)')) {
                    isActive = authConfig && (authConfig as any)['EXTERNAL_X_ENABLED']
                  } else if (providerSchema.title === 'Twitter (Deprecated)') {
                    isActive = authConfig && (authConfig as any)['EXTERNAL_TWITTER_ENABLED']
                  } else {
                    isActive =
                      authConfig &&
                      (authConfig as any)[`EXTERNAL_${providerSchema.title.toUpperCase()}_ENABLED`]
                  }
                  return (
                    <ProviderForm
                      key={`provider_${providerSchema.title}`}
                      config={authConfig!}
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
