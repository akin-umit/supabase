import { zodResolver } from '@hookform/resolvers/zod'
import { PermissionAction } from '@supabase/shared-types/out/constants'
import { useQuery } from '@tanstack/react-query'
import { IS_PLATFORM, useParams } from 'common'
import { useEffect, useMemo, useState } from 'react'
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
  Switch,
} from 'ui'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'
import {
  PageSection,
  PageSectionAside,
  PageSectionContent,
  PageSectionMeta,
  PageSectionSummary,
  PageSectionTitle,
} from 'ui-patterns/PageSection'
import z from 'zod'

import { AlertError } from '@/components/ui/AlertError'
import { ButtonTooltip } from '@/components/ui/ButtonTooltip'
import { DocsButton } from '@/components/ui/DocsButton'
import { databaseSettingsOperationQueryOptions } from '@/data/config/database-settings-operation-query'
import { usePostgresConfigurationUpdateMutation } from '@/data/config/postgres-config-mutation'
import { postgresConfigurationQueryOptions } from '@/data/config/postgres-config-query'
import { useAsyncCheckPermissions } from '@/hooks/misc/useCheckPermissions'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'
import { DOCS_URL } from '@/lib/constants'

const FormSchema = z.object({
  log_connections: z.boolean(),
  log_disconnections: z.boolean(),
})

type DatabaseSettingSummary = {
  name: string
  value: string
  unit?: string
  vartype?: string
  context?: string
  pendingRestart?: boolean
}

export const ConnectionLogging = () => {
  const { ref: projectRef } = useParams()
  const { data: project } = useSelectedProjectQuery()
  const { can: canUpdatePostgresConfiguration } = useAsyncCheckPermissions(
    PermissionAction.UPDATE,
    'projects',
    { resource: { project_id: project?.id } }
  )
  const canUpdate = !IS_PLATFORM || canUpdatePostgresConfiguration
  const [operationId, setOperationId] = useState<string>()

  const {
    data: postgresConfig,
    error,
    isSuccess,
    isError,
  } = useQuery(postgresConfigurationQueryOptions({ projectRef }))

  const { mutate: updatePostgresConfig, isPending: isSaving } =
    usePostgresConfigurationUpdateMutation({
      onSuccess: (data) => {
        setOperationId(data.operation?.id)
        if (!data.operation || data.operation.status === 'succeeded') {
          toast('Successfully updated logging settings')
        }
      },
    })

  const { data: operation } = useQuery(
    databaseSettingsOperationQueryOptions({ projectRef, operationId })
  )

  const defaultValues = useMemo(
    () => ({
      log_connections: postgresConfig?.log_connections ?? false,
      log_disconnections: postgresConfig?.log_disconnections ?? false,
    }),
    [postgresConfig]
  )

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    values: defaultValues,
  })
  const hasChanges = form.formState.isDirty
  const settingsList =
    ((postgresConfig as { settingsList?: DatabaseSettingSummary[] } | undefined)?.settingsList ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))

  const onSubmit: SubmitHandler<z.infer<typeof FormSchema>> = (payload) => {
    if (!projectRef) return
    updatePostgresConfig({ projectRef, payload })
  }

  useEffect(() => {
    if (isSuccess) form.reset(defaultValues)
  }, [isSuccess, defaultValues, form])

  useEffect(() => {
    if (operation?.status === 'succeeded') {
      toast('Successfully applied logging settings')
    } else if (operation?.status === 'failed') {
      toast.error('Failed to apply logging settings')
    }
  }, [operation?.status])

  return (
    <PageSection id="log-connections">
      <PageSectionMeta>
        <PageSectionSummary>
          <PageSectionTitle>Connection logging</PageSectionTitle>
        </PageSectionSummary>
        <PageSectionAside className="flex items-center gap-x-2">
          <DocsButton href={`${DOCS_URL}/guides/platform/postgres-connection-logging`} />
        </PageSectionAside>
      </PageSectionMeta>
      <PageSectionContent>
        {isError ? (
          <AlertError error={error} subject="Failed to retrieve Postgres configuration" />
        ) : (
          <div className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <Card>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="log_connections"
                      render={({ field }) => (
                        <FormItemLayout
                          layout="flex-row-reverse"
                          label="Log connections"
                          description="Enables logging for each successful connection to the database"
                          className="[&>div:first-child]:xl:w-1/5"
                        >
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItemLayout>
                      )}
                    />
                  </CardContent>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="log_disconnections"
                      render={({ field }) => (
                        <FormItemLayout
                          layout="flex-row-reverse"
                          label="Log disconnections"
                          description="Enables logging for the end of each session, including its duration"
                          className="[&>div:first-child]:xl:w-1/5"
                        >
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItemLayout>
                      )}
                    />
                  </CardContent>
                  <CardFooter className="gap-x-2 justify-end">
                    {operation !== undefined && (
                      <Badge
                        variant={
                          operation.status === 'failed' || operation.status === 'cancelled'
                            ? 'destructive'
                            : 'default'
                        }
                      >
                        {operation.status === 'queued'
                          ? 'Queued'
                          : operation.status === 'running'
                            ? 'Applying'
                            : operation.status === 'succeeded'
                              ? 'Applied'
                              : operation.status === 'failed'
                                ? 'Failed'
                                : operation.status === 'cancelled'
                                  ? 'Cancelled'
                                  : 'Applying'}
                      </Badge>
                    )}
                    <Button
                      type="button"
                      variant="default"
                      disabled={!hasChanges || isSaving}
                      onClick={() => form.reset(defaultValues)}
                    >
                      Cancel
                    </Button>
                    <ButtonTooltip
                      type="submit"
                      variant="primary"
                      loading={isSaving}
                      disabled={!hasChanges || !canUpdate}
                      tooltip={{
                        content: {
                          side: 'bottom',
                          text: !canUpdate
                            ? 'You need additional permissions to update this setting'
                            : undefined,
                        },
                      }}
                    >
                      Save
                    </ButtonTooltip>
                  </CardFooter>
                </Card>
              </form>
            </Form>
            {settingsList.length > 0 && (
              <Card>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm">Postgres runtime settings</p>
                    <p className="text-sm text-foreground-light">
                      Current values are read from Postgres and applied through the self-hosted
                      management API.
                    </p>
                  </div>
                  <div className="overflow-x-auto rounded border">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-100 text-foreground-light">
                        <tr>
                          <th className="px-3 py-2 text-left font-normal">Setting</th>
                          <th className="px-3 py-2 text-left font-normal">Value</th>
                          <th className="px-3 py-2 text-left font-normal">Type</th>
                          <th className="px-3 py-2 text-left font-normal">Context</th>
                          <th className="px-3 py-2 text-left font-normal">Restart</th>
                        </tr>
                      </thead>
                      <tbody>
                        {settingsList.map((setting) => (
                          <tr key={setting.name} className="border-t">
                            <td className="px-3 py-2 font-mono">{setting.name}</td>
                            <td className="px-3 py-2 font-mono">
                              {setting.value}
                              {setting.unit ? setting.unit : ''}
                            </td>
                            <td className="px-3 py-2">{setting.vartype ?? '-'}</td>
                            <td className="px-3 py-2">{setting.context ?? '-'}</td>
                            <td className="px-3 py-2">
                              {setting.pendingRestart ? (
                                <Badge variant="destructive">Required</Badge>
                              ) : (
                                <Badge variant="default">No</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </PageSectionContent>
    </PageSection>
  )
}
