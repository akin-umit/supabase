import { PermissionAction } from '@supabase/shared-types/out/constants'
import { IS_PLATFORM } from 'common'
import { GenericSkeletonLoader } from 'ui-patterns/ShimmeringLoader'

import { JWTSecretKeysTable } from '@/components/interfaces/JwtSecrets/jwt-secret-keys-table'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import JWTKeysLayout from '@/components/layouts/JWTKeys/JWTKeysLayout'
import SettingsLayout from '@/components/layouts/ProjectSettingsLayout/SettingsLayout'
import { LocalSetupGuide } from '@/components/ui/LocalSetupGuide'
import { NoPermission } from '@/components/ui/NoPermission'
import { useAsyncCheckPermissions } from '@/hooks/misc/useCheckPermissions'
import { useDeploymentMode } from '@/hooks/misc/useDeploymentMode'
import { DOCS_URL } from '@/lib/constants'
import type { NextPageWithLayout } from '@/types'

const JWTSigningKeysPage: NextPageWithLayout = () => {
  const { isCli, isSelfHosted } = useDeploymentMode()
  const { can: canReadAPIKeys, isSuccess: isPermissionsLoaded } = useAsyncCheckPermissions(
    PermissionAction.READ,
    'auth_signing_keys'
  )

  if (!IS_PLATFORM) {
    return (
      <div className="space-y-4">
        {isCli && (
          <LocalSetupGuide
            variant="cli"
            body={
              <p>
                The asymmetric key pair used to sign user session JWTs is configured by the Supabase
                CLI.
              </p>
            }
            docsHref={`${DOCS_URL}/guides/local-development`}
          />
        )}
        {isSelfHosted && (
          <LocalSetupGuide
            variant="selfHosted"
            body={
              <p>
                The asymmetric key pair used to sign user session JWTs is configured via environment
                variables.
              </p>
            }
            docsHref={`${DOCS_URL}/guides/self-hosting/self-hosted-auth-keys`}
          />
        )}
        <div className="rounded border bg-surface-100">
          <div className="border-b px-5 py-4">
            <h3 className="text-sm font-medium">Self-hosted signing key evidence</h3>
            <p className="text-sm text-foreground-light">
              These values are read from your self-hosted runtime configuration. Rotate or replace
              them in your environment/secret manager, then redeploy the Auth and API services.
            </p>
          </div>
          <div className="divide-y text-sm">
            <div className="grid gap-2 px-5 py-4 md:grid-cols-[220px_1fr]">
              <span className="font-mono text-xs text-foreground-light">SUPABASE_JWKS</span>
              <span>JSON Web Key Set used by API services to verify Auth-issued JWTs.</span>
            </div>
            <div className="grid gap-2 px-5 py-4 md:grid-cols-[220px_1fr]">
              <span className="font-mono text-xs text-foreground-light">JWT_SECRET</span>
              <span>Legacy symmetric signing secret for older anon and service-role JWTs.</span>
            </div>
            <div className="grid gap-2 px-5 py-4 md:grid-cols-[220px_1fr]">
              <span className="font-mono text-xs text-foreground-light">SUPABASE_ANON_KEY</span>
              <span>Deprecated legacy anonymous key. Prefer publishable keys where available.</span>
            </div>
            <div className="grid gap-2 px-5 py-4 md:grid-cols-[220px_1fr]">
              <span className="font-mono text-xs text-foreground-light">
                SUPABASE_SERVICE_ROLE_KEY
              </span>
              <span>Deprecated legacy service role key. Keep it server-side only.</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {!isPermissionsLoaded ? (
        <GenericSkeletonLoader />
      ) : !canReadAPIKeys ? (
        <NoPermission isFullPage resourceText="access your project's API keys" />
      ) : (
        <JWTSecretKeysTable />
      )}
    </>
  )
}

JWTSigningKeysPage.getLayout = (page) => (
  <DefaultLayout>
    <SettingsLayout title="JWT Keys">
      <JWTKeysLayout>{page}</JWTKeysLayout>
    </SettingsLayout>
  </DefaultLayout>
)

export default JWTSigningKeysPage
