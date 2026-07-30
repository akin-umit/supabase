import { useParams } from 'common'
import {
  Badge,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from 'ui'
import { Admonition } from 'ui-patterns/admonition'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'
import { GenericSkeletonLoader } from 'ui-patterns/ShimmeringLoader'

import { ProjectUpgradeAlert } from '../General/Infrastructure/ProjectUpgradeAlert'
import {
  ReadReplicasWarning,
  ValidationErrorsWarning,
  ValidationWarningsAdmonition,
} from './UpgradeWarnings'
import {
  ScaffoldContainer,
  ScaffoldDivider,
  ScaffoldSection,
  ScaffoldSectionContent,
  ScaffoldSectionDetail,
} from '@/components/layouts/Scaffold'
import { AlertError } from '@/components/ui/AlertError'
import { useProjectUpgradeEligibilityQuery } from '@/data/config/project-upgrade-eligibility-query'
import { useProjectOperationsQuery } from '@/data/operations/project-operations-query'
import { useProjectServiceVersionsQuery } from '@/data/projects/project-service-versions'
import { useReadReplicasQuery } from '@/data/read-replicas/replicas-query'
import { useIsFeatureEnabled } from '@/hooks/misc/useIsFeatureEnabled'
import { useIsOrioleDb, useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'
import { IS_PLATFORM } from '@/lib/constants'

export const InfrastructureInfo = () => {
  if (!IS_PLATFORM) {
    return <SelfHostedInfrastructureInfo />
  }

  const { ref } = useParams()
  const { data: project } = useSelectedProjectQuery()

  const { projectAuthAll: authEnabled, projectSettingsDatabaseUpgrades: showDatabaseUpgrades } =
    useIsFeatureEnabled([
      'project_auth:all',
      'project_settings:database_upgrades',
      'database:replication',
    ])

  const {
    data,
    error,
    isPending: isLoadingUpgradeEligibility,
    isError: isErrorUpgradeEligibility,
    isSuccess: isSuccessUpgradeEligibility,
  } = useProjectUpgradeEligibilityQuery({
    projectRef: ref,
  })

  const {
    data: serviceVersions,
    error: serviceVersionsError,
    isPending: isLoadingServiceVersions,
    isError: isErrorServiceVersions,
    isSuccess: isSuccessServiceVersions,
  } = useProjectServiceVersionsQuery({ projectRef: ref })

  const { data: databases } = useReadReplicasQuery({ projectRef: ref })
  const { current_app_version, current_app_version_release_channel, latest_app_version } =
    data || {}

  const isOnLatestVersion = current_app_version === latest_app_version
  const currentPgVersion = (current_app_version ?? '')
    .split('supabase-postgres-')[1]
    ?.replace('-orioledb', '')
  const isVisibleReleaseChannel =
    current_app_version_release_channel &&
    !['ga', 'withdrawn'].includes(current_app_version_release_channel)
      ? current_app_version_release_channel
      : undefined
  const isOrioleDb = useIsOrioleDb()
  const latestPgVersion = (latest_app_version ?? '').split('supabase-postgres-')[1]

  const isInactive = project?.status === 'INACTIVE'
  const hasReadReplicas = (databases ?? []).length > 1

  return (
    <>
      <ScaffoldDivider />

      <ScaffoldContainer>
        <ScaffoldSection>
          <ScaffoldSectionDetail>
            <h4 className="text-base capitalize m-0">Service versions</h4>
            <p className="text-foreground-light text-sm pr-8 mt-1">
              Service versions and upgrade eligibility for your provisioned instance.
            </p>
          </ScaffoldSectionDetail>
          <ScaffoldSectionContent>
            {isInactive ? (
              <Admonition
                type="note"
                showIcon={false}
                title="Service versions cannot be retrieved while project is paused"
                description="Restoring the project will update Postgres to the newest version"
              />
            ) : (
              <>
                {/* [Joshen] Double check why we need this waterfall loading behaviour here */}
                {isLoadingUpgradeEligibility && <GenericSkeletonLoader />}
                {isErrorUpgradeEligibility && (
                  <AlertError error={error} subject="Failed to retrieve Postgres version" />
                )}
                {isSuccessUpgradeEligibility && (
                  <>
                    {isLoadingServiceVersions && <GenericSkeletonLoader />}
                    {isErrorServiceVersions && (
                      <AlertError
                        error={serviceVersionsError}
                        subject="Failed to retrieve versions"
                      />
                    )}
                    {isSuccessServiceVersions && (
                      <>
                        {authEnabled && (
                          <FormItemLayout
                            label="Auth version"
                            layout="vertical"
                            isReactForm={false}
                          >
                            <Input readOnly disabled value={serviceVersions?.gotrue ?? ''} />
                          </FormItemLayout>
                        )}
                        <FormItemLayout
                          label="PostgREST version"
                          layout="vertical"
                          isReactForm={false}
                        >
                          <Input readOnly disabled value={serviceVersions?.postgrest ?? ''} />
                        </FormItemLayout>
                        <FormItemLayout
                          label="Postgres version"
                          layout="vertical"
                          isReactForm={false}
                        >
                          <InputGroup>
                            <InputGroupInput
                              readOnly
                              disabled
                              value={
                                currentPgVersion || serviceVersions?.['supabase-postgres'] || ''
                              }
                            />
                            <InputGroupAddon align="inline-end">
                              {[
                                isVisibleReleaseChannel && (
                                  <Tooltip key="release-channel">
                                    <TooltipTrigger>
                                      <Badge variant="warning" className="mr-1">
                                        {isVisibleReleaseChannel}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="w-44 text-center">
                                      This project uses a {isVisibleReleaseChannel} database version
                                      release
                                    </TooltipContent>
                                  </Tooltip>
                                ),
                                isOrioleDb && (
                                  <Tooltip key="orioledb">
                                    <TooltipTrigger>
                                      <Badge variant="default" className="mr-1">
                                        OrioleDB
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="w-44 text-center">
                                      This project uses OrioleDB
                                    </TooltipContent>
                                  </Tooltip>
                                ),
                                isOnLatestVersion && (
                                  <Tooltip key="latest-version">
                                    <TooltipTrigger>
                                      <Badge variant="success" className="mr-1">
                                        Latest
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="w-52 text-center">
                                      Project is on the latest version of Postgres that Supabase
                                      supports
                                    </TooltipContent>
                                  </Tooltip>
                                ),
                              ]}
                            </InputGroupAddon>
                          </InputGroup>
                        </FormItemLayout>
                      </>
                    )}

                    {showDatabaseUpgrades && data && data.eligible ? (
                      hasReadReplicas ? (
                        <ReadReplicasWarning latestPgVersion={latestPgVersion} />
                      ) : (
                        <ProjectUpgradeAlert />
                      )
                    ) : null}

                    {showDatabaseUpgrades && data && !data.eligible && (
                      <ValidationErrorsWarning validationErrors={data.validation_errors} />
                    )}

                    {showDatabaseUpgrades && data && data.warnings && (
                      <ValidationWarningsAdmonition warnings={data.warnings} />
                    )}
                  </>
                )}
              </>
            )}
          </ScaffoldSectionContent>
        </ScaffoldSection>
      </ScaffoldContainer>
    </>
  )
}

const SelfHostedInfrastructureInfo = () => {
  const { ref } = useParams()
  const { data, isPending, isError, refetch, isFetching } = useProjectOperationsQuery({
    projectRef: ref,
  })

  return (
    <>
      <ScaffoldDivider />
      <ScaffoldContainer>
        <ScaffoldSection>
          <ScaffoldSectionDetail>
            <h4 className="text-base capitalize m-0">Service versions</h4>
            <p className="text-foreground-light text-sm pr-8 mt-1">
              Version and service evidence reported by the self-hosted runtime.
            </p>
          </ScaffoldSectionDetail>
          <ScaffoldSectionContent>
            {isPending ? (
              <GenericSkeletonLoader />
            ) : isError ? (
              <Admonition type="warning" title="Service versions could not be loaded">
                <button
                  className="text-sm underline"
                  type="button"
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  Retry
                </button>
              </Admonition>
            ) : (
              <div className="space-y-3">
                <FormItemLayout label="Studio image version" layout="vertical" isReactForm={false}>
                  <Input readOnly disabled value={data?.deployment.version ?? 'Unknown'} />
                </FormItemLayout>
                <FormItemLayout label="Deployed commit" layout="vertical" isReactForm={false}>
                  <Input readOnly disabled value={data?.deployment.commit ?? 'Unknown'} />
                </FormItemLayout>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(data?.services ?? {}).map(([service, status]) => (
                    <div
                      key={service}
                      className="flex items-center justify-between rounded border bg-surface-75 px-3 py-2 text-sm"
                    >
                      <span className="text-foreground">{service}</span>
                      <Badge variant={status === 'healthy' ? 'success' : 'default'}>{status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ScaffoldSectionContent>
        </ScaffoldSection>
      </ScaffoldContainer>
    </>
  )
}
