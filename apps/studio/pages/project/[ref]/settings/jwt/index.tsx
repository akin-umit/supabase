import { PermissionAction } from '@supabase/shared-types/out/constants'
import { IS_PLATFORM } from 'common'
import { Badge, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ui'
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
        <Card>
          <div className="border-b px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium">JWT signing keys</h3>
                <p className="text-sm text-foreground-light">
                  Self-hosted projects use runtime-provided signing material. Studio mirrors the
                  Cloud key management surface, but rotation must happen in your secret manager or
                  deployment environment.
                </p>
              </div>
              <Badge variant="default">Operator managed</Badge>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cloud control</TableHead>
                <TableHead>Self-hosted source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Operator action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>JWT Signing Keys</TableCell>
                <TableCell className="font-mono text-xs">SUPABASE_JWKS</TableCell>
                <TableCell>
                  <Badge variant="success">Supported</Badge>
                </TableCell>
                <TableCell>
                  Rotate in the environment, then redeploy Auth, Kong, and REST.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Legacy JWT Secret</TableCell>
                <TableCell className="font-mono text-xs">JWT_SECRET</TableCell>
                <TableCell>
                  <Badge variant="warning">Legacy</Badge>
                </TableCell>
                <TableCell>
                  Keep only for existing anon and service role JWT compatibility.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Publishable / anon key</TableCell>
                <TableCell className="font-mono text-xs">SUPABASE_ANON_KEY</TableCell>
                <TableCell>
                  <Badge variant="default">Read-only</Badge>
                </TableCell>
                <TableCell>Regenerate through the deployment secrets and publish safely.</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Secret / service role key</TableCell>
                <TableCell className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</TableCell>
                <TableCell>
                  <Badge variant="warning">Server only</Badge>
                </TableCell>
                <TableCell>Never expose to browser clients or public repositories.</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
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
