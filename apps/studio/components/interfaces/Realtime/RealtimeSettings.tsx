import { zodResolver } from '@hookform/resolvers/zod'
import { PermissionAction } from '@supabase/shared-types/out/constants'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'common'
import Link from 'next/link'
import { useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  Form,
  FormControl,
  FormField,
  FormInputGroupInput,
  FormMessage,
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  Switch,
} from 'ui'
import { Admonition } from 'ui-patterns/admonition'
import ConfirmationModal from 'ui-patterns/Dialogs/ConfirmationModal'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'
import { GenericSkeletonLoader } from 'ui-patterns/ShimmeringLoader'
import * as z from 'zod'

import { AlertError } from '@/components/ui/AlertError'
import { ToggleSpendCapButton } from '@/components/ui/ToggleSpendCapButton'
import { UpgradePlanButton } from '@/components/ui/UpgradePlanButton'
import { useDatabasePoliciesQuery } from '@/data/database-policies/database-policies-query'
import { useMaxConnectionsQuery } from '@/data/database/max-connections-query'
import { useRealtimeConfigurationUpdateMutation } from '@/data/realtime/realtime-config-mutation'
import {
  REALTIME_DEFAULT_CONFIG,
  useRealtimeConfigurationQuery,
} from '@/data/realtime/realtime-config-query'
import { useAsyncCheckPermissions } from '@/hooks/misc/useCheckPermissions'
import { useSelectedOrganizationQuery } from '@/hooks/misc/useSelectedOrganization'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'
import type { SelfHostedRealtimeConfig } from '@/lib/api/self-hosted/realtime'
import { IS_PLATFORM } from '@/lib/constants'

const formId = 'realtime-configuration-form'

async function fetchSelfHostedRealtimeConfig(projectRef?: string) {
  if (!projectRef) throw new Error('Project ref is required')

  const response = await fetch(`/api/platform/projects/${projectRef}/config/realtime`)
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? 'Failed to retrieve self-hosted realtime settings')
  }

  return payload as SelfHostedRealtimeConfig
}

export const RealtimeSettings = () => {
  const { ref: projectRef } = useParams()
  const isSelfHosted = !IS_PLATFORM
  const { data: project } = useSelectedProjectQuery()
  const { data: organization, isSuccess: isSuccessOrganization } = useSelectedOrganizationQuery()
  const { can: canUpdateConfig, isSuccess: isPermissionsLoaded } = useAsyncCheckPermissions(
    PermissionAction.REALTIME_ADMIN_READ,
    '*'
  )

  const [isConfirmNextModalOpen, setIsConfirmNextModalOpen] = useState(false)

  const { data: maxConn } = useMaxConnectionsQuery({
    projectRef: project?.ref,
    connectionString: project?.connectionString,
  })
  const { data, error, isError } = useRealtimeConfigurationQuery(
    {
      projectRef,
    },
    { enabled: IS_PLATFORM }
  )
  const {
    data: selfHostedConfig,
    error: selfHostedError,
    isPending: isLoadingSelfHostedConfig,
    isError: isSelfHostedConfigError,
  } = useQuery<SelfHostedRealtimeConfig, Error>({
    queryKey: ['self-hosted', 'realtime-config', projectRef],
    queryFn: () => fetchSelfHostedRealtimeConfig(projectRef),
    enabled: isSelfHosted && typeof projectRef !== 'undefined',
  })

  const { data: policies, isSuccess: isSuccessPolicies } = useDatabasePoliciesQuery({
    projectRef,
    connectionString: project?.connectionString,
    schemas: ['realtime'],
  })

  const isFreePlan = organization?.plan.id === 'free'
  const isUsageBillingEnabled = organization?.usage_billing_enabled
  const realtimeConfig = isSelfHosted ? selfHostedConfig : data
  const realtimeConfigError = isSelfHosted ? selfHostedError : error
  const hasRealtimeConfigError = isSelfHosted ? isSelfHostedConfigError : isError
  const isRealtimeDisabled = realtimeConfig?.suspend ?? REALTIME_DEFAULT_CONFIG.suspend
  // Check if RLS policies exist for realtime.messages table
  const realtimeMessagesPolicies = policies?.filter(
    (policy) => policy.schema === 'realtime' && policy.table === 'messages'
  )
  const hasRealtimeMessagesPolicies =
    realtimeMessagesPolicies && realtimeMessagesPolicies.length > 0

  const { mutate: updateRealtimeConfig, isPending: isUpdatingConfig } =
    useRealtimeConfigurationUpdateMutation({
      onSuccess: () => {
        form.reset(form.getValues())
        toast.success('Successfully updated realtime settings')
        setIsConfirmNextModalOpen(false)
      },
    })

  const FormSchema = z.discriminatedUnion('suspend', [
    z.object({
      suspend: z.literal(true),
      connection_pool: z.coerce
        .number()
        .min(1)
        .max(maxConn?.maxConnections ?? 100)
        .optional(),
      max_concurrent_users: z.coerce.number().min(1).max(50000).optional(),
      max_events_per_second: z.coerce.number().min(1).max(10000).optional(),
      max_presence_events_per_second: z.coerce.number().min(1).max(10000).optional(),
      max_payload_size_in_kb: z.coerce.number().min(1).max(3000).optional(),
      // [Joshen] These fields are temporarily hidden from the UI
      // max_bytes_per_second: z.coerce.number().min(1).max(10000000).optional(),
      // max_channels_per_client: z.coerce.number().min(1).max(10000).optional(),
      // max_joins_per_second: z.coerce.number().min(1).max(5000).optional(),

      allow_public: z.boolean().optional(),
    }),
    z.object({
      suspend: z.literal(false),
      connection_pool: z.coerce
        .number()
        .min(1)
        .max(maxConn?.maxConnections ?? 100),
      max_concurrent_users: z.coerce.number().min(1).max(50000),
      max_events_per_second: z.coerce.number().min(1).max(10000),
      max_presence_events_per_second: z.coerce.number().min(1).max(10000),
      max_payload_size_in_kb: z.coerce.number().min(1).max(3000),
      // [Joshen] These fields are temporarily hidden from the UI
      // max_bytes_per_second: z.coerce.number().min(1).max(10000000),
      // max_channels_per_client: z.coerce.number().min(1).max(10000),
      // max_joins_per_second: z.coerce.number().min(1).max(5000),

      allow_public: z.boolean(),
    }),
  ])

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      ...REALTIME_DEFAULT_CONFIG,
      allow_public: !REALTIME_DEFAULT_CONFIG.private_only,
    },
    values: {
      ...(realtimeConfig ?? REALTIME_DEFAULT_CONFIG),
      allow_public: !(realtimeConfig?.private_only ?? REALTIME_DEFAULT_CONFIG.private_only),
    } as any,
  })

  const { allow_public, suspend } = form.watch()
  const isSettingToPrivate = !realtimeConfig?.private_only && !allow_public
  const isDisablingRealtime = !isRealtimeDisabled && suspend
  const isEnablingRealtime = isRealtimeDisabled && !suspend
  const selfHostedSources = selfHostedConfig?.sources

  const onSubmit: SubmitHandler<z.infer<typeof FormSchema>> = (_data) => {
    if (!projectRef) return console.error('Project ref is required')
    if (isSelfHosted) return
    setIsConfirmNextModalOpen(true)
  }

  const onConfirmSave = () => {
    if (!projectRef) return console.error('Project ref is required')
    const values = form.getValues()

    // [Joshen] Casting to `Number` here as the values are being set as string when edited in the form
    // and returned in form.getValues() - I might be missing some easy util function from RHF though
    updateRealtimeConfig({
      ref: projectRef,
      private_only: !values.allow_public,
      connection_pool: Number(
        values.connection_pool ?? data?.connection_pool ?? REALTIME_DEFAULT_CONFIG.connection_pool
      ),
      max_concurrent_users: Number(
        values.max_concurrent_users ??
          data?.max_concurrent_users ??
          REALTIME_DEFAULT_CONFIG.max_concurrent_users
      ),
      max_events_per_second: Number(
        values.max_events_per_second ??
          data?.max_events_per_second ??
          REALTIME_DEFAULT_CONFIG.max_events_per_second
      ),
      max_presence_events_per_second: Number(
        values.max_presence_events_per_second ??
          data?.max_presence_events_per_second ??
          REALTIME_DEFAULT_CONFIG.max_presence_events_per_second
      ),
      max_payload_size_in_kb: Number(
        values.max_payload_size_in_kb ??
          data?.max_payload_size_in_kb ??
          REALTIME_DEFAULT_CONFIG.max_payload_size_in_kb
      ),
      suspend: values.suspend,
    })
  }

  return (
    <>
      <Form {...form}>
        <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
          {hasRealtimeConfigError ? (
            <AlertError
              error={realtimeConfigError}
              subject="Failed to retrieve realtime settings"
            />
          ) : isSelfHosted && isLoadingSelfHostedConfig ? (
            <GenericSkeletonLoader />
          ) : (
            <Card>
              <CardContent className="space-y-4">
                {isSelfHosted && (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <Admonition
                        className="flex-1"
                        showIcon={false}
                        type="default"
                        title="Realtime limits are managed by the self-hosted runtime"
                        description="Studio keeps the same Realtime settings surface as Cloud, but writes are intentionally disabled. Change limits in the Realtime service environment or Compose file, then redeploy Realtime and Kong."
                      />
                      <Badge variant="default">Read-only</Badge>
                    </div>
                    <div className="grid gap-3 text-sm md:grid-cols-2">
                      {[
                        [
                          'Enable Realtime service',
                          selfHostedSources?.suspend ?? 'REALTIME_ENABLED',
                          'Controls whether clients can connect to the Realtime service.',
                        ],
                        [
                          'Database connection pool size',
                          selfHostedSources?.connection_pool ?? 'DB_POOL_SIZE',
                          'Controls authorization and database-change fanout capacity.',
                        ],
                        [
                          'Max concurrent clients',
                          selfHostedSources?.max_concurrent_users ?? 'TENANT_MAX_CONCURRENT_USERS',
                          'Protects the service from too many simultaneous websocket clients.',
                        ],
                        [
                          'Payload and event limits',
                          `${selfHostedSources?.max_events_per_second ?? 'TENANT_MAX_EVENTS_PER_SECOND'} / ${selfHostedSources?.max_payload_size_in_kb ?? 'TENANT_MAX_PAYLOAD_SIZE_IN_KB'}`,
                          'Limits broadcast, presence, and database-change event volume.',
                        ],
                      ].map(([title, envName, description]) => (
                        <div className="rounded border bg-surface-100 p-3" key={title}>
                          <p className="font-medium">{title}</p>
                          <p className="mt-1 font-mono text-xs text-foreground-light">{envName}</p>
                          <p className="mt-2 text-foreground-light">{description}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <FormField
                  control={form.control}
                  name="suspend"
                  render={({ field }) => (
                    <>
                      <FormItemLayout
                        id="suspend"
                        layout="flex-row-reverse"
                        label="Enable Realtime service"
                        description="If disabled, no clients will be able to connect and new connections will be rejected"
                      >
                        <FormControl>
                          <Switch
                            id="suspend"
                            checked={!field.value}
                            onCheckedChange={(checked) => field.onChange(!checked)}
                            disabled={isSelfHosted || !canUpdateConfig}
                          />
                        </FormControl>
                      </FormItemLayout>
                      <FormMessage />
                    </>
                  )}
                />
                {(isRealtimeDisabled || isDisablingRealtime || isEnablingRealtime) && (
                  <Admonition
                    showIcon={false}
                    type={isDisablingRealtime || isEnablingRealtime ? 'warning' : 'default'}
                  >
                    <div className="flex items-center gap-x-2">
                      <div>
                        <h5 className="text-foreground mb-1">
                          {isDisablingRealtime
                            ? 'Realtime service will be disabled'
                            : isEnablingRealtime
                              ? 'Realtime service will be re-enabled'
                              : isRealtimeDisabled
                                ? 'Realtime service is disabled'
                                : null}
                        </h5>
                        <p className="text-foreground-light">
                          {isDisablingRealtime
                            ? 'Clients will no longer be able to connect to your project’s realtime service once saved'
                            : isEnablingRealtime
                              ? "Clients will be able to connect to your project's realtime service again once saved"
                              : isRealtimeDisabled
                                ? 'You will need to enable it to continue using Realtime'
                                : null}
                        </p>
                      </div>
                    </div>
                  </Admonition>
                )}
              </CardContent>

              {!suspend && (
                <>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="allow_public"
                      render={({ field }) => (
                        <>
                          <FormItemLayout
                            id="allow_public"
                            layout="flex-row-reverse"
                            label="Allow public access to channels"
                            description="If disabled, only private channels will be allowed"
                          >
                            <FormControl>
                              <Switch
                                id="allow_public"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={isSelfHosted || !canUpdateConfig}
                              />
                            </FormControl>
                          </FormItemLayout>

                          {isSuccessPolicies &&
                            !hasRealtimeMessagesPolicies &&
                            !allow_public &&
                            !isRealtimeDisabled && (
                              <Admonition
                                showIcon={false}
                                type="warning"
                                title="No Realtime RLS policies found"
                                description={
                                  <>
                                    <p className="prose max-w-full text-sm">
                                      Private mode is {isSettingToPrivate ? 'being ' : ''}
                                      enabled, but no RLS policies exists on the{' '}
                                      <code className="text-code-inline">
                                        realtime.messages
                                      </code>{' '}
                                      table. No messages will be received by users.
                                    </p>

                                    <Button asChild variant="default" className="mt-2">
                                      <Link href={`/project/${projectRef}/realtime/policies`}>
                                        Create policy
                                      </Link>
                                    </Button>
                                  </>
                                }
                              />
                            )}
                        </>
                      )}
                    />
                  </CardContent>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="connection_pool"
                      render={({ field }) => (
                        <>
                          <FormItemLayout
                            id="connection_pool"
                            layout="flex-row-reverse"
                            label="Database connection pool size"
                            description="Realtime Authorization uses this database pool to check client access"
                          >
                            <FormControl>
                              <InputGroup>
                                <FormInputGroupInput
                                  {...field}
                                  id="connection_pool"
                                  type="number"
                                  readOnly={isSelfHosted}
                                  disabled={!isSelfHosted && !canUpdateConfig}
                                  value={field.value || ''}
                                />
                                <InputGroupAddon align="inline-end">
                                  <InputGroupText>connections</InputGroupText>
                                </InputGroupAddon>
                              </InputGroup>
                            </FormControl>
                          </FormItemLayout>
                          {!!maxConn &&
                            field.value &&
                            field.value > maxConn.maxConnections * 0.5 && (
                              <Admonition
                                showIcon={false}
                                type="warning"
                                title={`Pool size is greater than 50% of the max connections (${maxConn.maxConnections}) on your database`}
                                description="This may result in instability and unreliability with your database connections."
                              />
                            )}
                        </>
                      )}
                    />
                  </CardContent>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="max_concurrent_users"
                      render={({ field }) => (
                        <FormItemLayout
                          id="max_concurrent_users"
                          layout="flex-row-reverse"
                          label="Max concurrent clients"
                          description="Sets maximum number of concurrent clients that can connect to your Realtime service"
                        >
                          <FormControl>
                            <InputGroup>
                              <FormInputGroupInput
                                {...field}
                                id="max_concurrent_users"
                                type="number"
                                readOnly={isSelfHosted}
                                disabled={!isSelfHosted && !canUpdateConfig}
                                value={field.value || ''}
                              />
                              <InputGroupAddon align="inline-end">
                                <InputGroupText>clients</InputGroupText>
                              </InputGroupAddon>
                            </InputGroup>
                          </FormControl>
                        </FormItemLayout>
                      )}
                    />
                  </CardContent>
                  <CardContent className="space-y-2">
                    <FormField
                      control={form.control}
                      name="max_events_per_second"
                      render={({ field }) => (
                        <FormItemLayout
                          id="max_events_per_second"
                          layout="flex-row-reverse"
                          label="Max events per second"
                          description="Sets maximum number of events per second that can be sent to your Realtime service"
                        >
                          <FormControl>
                            <InputGroup>
                              <FormInputGroupInput
                                {...field}
                                id="max_events_per_second"
                                type="number"
                                readOnly={isSelfHosted}
                                disabled={
                                  !isSelfHosted && (!isUsageBillingEnabled || !canUpdateConfig)
                                }
                                value={field.value || ''}
                              />
                              <InputGroupAddon align="inline-end">
                                <InputGroupText>events/s</InputGroupText>
                              </InputGroupAddon>
                            </InputGroup>
                          </FormControl>
                        </FormItemLayout>
                      )}
                    />
                    {!isSelfHosted && isSuccessOrganization && !isUsageBillingEnabled && (
                      <Admonition showIcon={false} type="default">
                        <div className="flex items-center gap-x-2">
                          <div>
                            <h5 className="text-foreground mb-1">
                              Spend cap needs to be disabled to configure this value
                            </h5>
                            <p className="text-foreground-light">
                              {isFreePlan
                                ? 'Upgrade to the Pro plan first to disable spend cap'
                                : 'You may adjust this setting in the organization billing settings'}
                            </p>
                          </div>
                          <div className="grow flex items-center justify-end">
                            {isFreePlan ? (
                              <UpgradePlanButton
                                source="realtimeSettings"
                                addon="spendCap"
                                featureProposition="configure the max events per second parameter of realtime settings"
                              />
                            ) : (
                              <ToggleSpendCapButton />
                            )}
                          </div>
                        </div>
                      </Admonition>
                    )}
                  </CardContent>
                  <CardContent className="space-y-2">
                    <FormField
                      control={form.control}
                      name="max_presence_events_per_second"
                      render={({ field }) => (
                        <FormItemLayout
                          id="max_presence_events_per_second"
                          layout="flex-row-reverse"
                          label="Max presence events per second"
                          description="Sets maximum number of presence events per second that can be sent to your Realtime service"
                        >
                          <FormControl>
                            <InputGroup>
                              <FormInputGroupInput
                                {...field}
                                id="max_presence_events_per_second"
                                type="number"
                                readOnly={isSelfHosted}
                                disabled={
                                  !isSelfHosted && (!isUsageBillingEnabled || !canUpdateConfig)
                                }
                                value={field.value || ''}
                              />
                              <InputGroupAddon align="inline-end">
                                <InputGroupText>events/s</InputGroupText>
                              </InputGroupAddon>
                            </InputGroup>
                          </FormControl>
                        </FormItemLayout>
                      )}
                    />
                    {!isSelfHosted && isSuccessOrganization && !isUsageBillingEnabled && (
                      <Admonition showIcon={false} type="default">
                        <div className="flex items-center gap-x-2">
                          <div>
                            <h5 className="text-foreground mb-1">
                              Spend cap needs to be disabled to configure this value
                            </h5>
                            <p className="text-foreground-light">
                              {isFreePlan
                                ? 'Upgrade to the Pro plan first to disable spend cap'
                                : 'You may adjust this setting in the organization billing settings'}
                            </p>
                          </div>
                          <div className="grow flex items-center justify-end">
                            {isFreePlan ? (
                              <UpgradePlanButton
                                source="realtimeSettings"
                                addon="spendCap"
                                featureProposition="configure the max presence events per second parameter of realtime settings"
                              />
                            ) : (
                              <ToggleSpendCapButton />
                            )}
                          </div>
                        </div>
                      </Admonition>
                    )}
                  </CardContent>
                  <CardContent className="space-y-2">
                    <FormField
                      control={form.control}
                      name="max_payload_size_in_kb"
                      render={({ field }) => (
                        <FormItemLayout
                          id="max_payload_size_in_kb"
                          layout="flex-row-reverse"
                          label="Max payload size in KB"
                          description="Sets maximum number of payload size in KB that can be sent to your Realtime service"
                        >
                          <FormControl>
                            <InputGroup>
                              <FormInputGroupInput
                                {...field}
                                id="max_payload_size_in_kb"
                                type="number"
                                readOnly={isSelfHosted}
                                disabled={
                                  !isSelfHosted && (!isUsageBillingEnabled || !canUpdateConfig)
                                }
                                value={field.value || ''}
                              />
                              <InputGroupAddon align="inline-end">
                                <InputGroupText>KB</InputGroupText>
                              </InputGroupAddon>
                            </InputGroup>
                          </FormControl>
                        </FormItemLayout>
                      )}
                    />
                    {!isSelfHosted && isSuccessOrganization && !isUsageBillingEnabled && (
                      <Admonition showIcon={false} type="default">
                        <div className="flex items-center gap-x-2">
                          <div>
                            <h5 className="text-foreground mb-1">
                              Spend cap needs to be disabled to configure this value
                            </h5>
                            <p className="text-foreground-light">
                              {isFreePlan
                                ? 'Upgrade to the Pro plan first to disable spend cap'
                                : 'You may adjust this setting in the organization billing settings'}
                            </p>
                          </div>
                          <div className="grow flex items-center justify-end">
                            {isFreePlan ? (
                              <UpgradePlanButton
                                addon="spendCap"
                                source="realtimeSettings"
                                featureProposition="configure the max payload size parameter of realtime settings"
                              />
                            ) : (
                              <ToggleSpendCapButton />
                            )}
                          </div>
                        </div>
                      </Admonition>
                    )}
                  </CardContent>
                </>
              )}

              <CardFooter className="justify-between">
                <div>
                  {isPermissionsLoaded && !canUpdateConfig && (
                    <p className="text-sm text-foreground-light">
                      You need additional permissions to update realtime settings
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-x-2">
                  {form.formState.isDirty && (
                    <Button variant="default" onClick={() => form.reset(realtimeConfig as any)}>
                      Cancel
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    type="submit"
                    form={formId}
                    disabled={
                      isSelfHosted ||
                      !canUpdateConfig ||
                      isUpdatingConfig ||
                      !form.formState.isDirty
                    }
                    loading={isUpdatingConfig}
                  >
                    Save changes
                  </Button>
                </div>
              </CardFooter>
            </Card>
          )}
        </form>
      </Form>

      <ConfirmationModal
        visible={isConfirmNextModalOpen}
        title="Confirm saving changes"
        confirmLabel="Save changes"
        loading={isUpdatingConfig}
        onCancel={() => setIsConfirmNextModalOpen(false)}
        onConfirm={() => onConfirmSave()}
      >
        <p className="text-sm text-foreground-light">
          Saving the changes will disconnect all the clients connected to your project. Are you sure
          you want to continue?
        </p>
      </ConfirmationModal>
    </>
  )
}
