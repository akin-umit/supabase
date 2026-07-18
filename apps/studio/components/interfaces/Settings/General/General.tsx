import { zodResolver } from '@hookform/resolvers/zod'
import { PermissionAction } from '@supabase/shared-types/out/constants'
import { IS_PLATFORM, useParams } from 'common'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  Form,
  FormControl,
  FormField,
  Input,
} from 'ui'
import { Admonition } from 'ui-patterns/admonition'
import { Input as PasswordInput } from 'ui-patterns/DataInputs/Input'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'
import {
  PageSection,
  PageSectionContent,
  PageSectionMeta,
  PageSectionSummary,
  PageSectionTitle,
} from 'ui-patterns/PageSection'
import { GenericSkeletonLoader } from 'ui-patterns/ShimmeringLoader'
import * as z from 'zod'

import { AVAILABLE_REPLICA_REGIONS } from '../Infrastructure/InfrastructureConfiguration/InstanceConfiguration.constants'
import { ProjectAccessSection } from './ProjectAccessSection'
import { InlineLink } from '@/components/ui/InlineLink'
import { useBranchesQuery } from '@/data/branches/branches-query'
import { useProjectUpdateMutation } from '@/data/projects/project-update-mutation'
import { useAsyncCheckPermissions } from '@/hooks/misc/useCheckPermissions'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'

export const General = () => {
  const { ref } = useParams()
  const { data: project } = useSelectedProjectQuery()
  const isBranch = Boolean(project?.parent_project_ref)
  const entityLabel = isBranch ? 'Branch' : 'Project'

  const { data: branches } = useBranchesQuery(
    { projectRef: project?.parent_project_ref },
    { enabled: isBranch }
  )
  const branch = branches?.find((x) => x.project_ref === ref)
  const projectName = isBranch ? branch?.name : project?.name
  const selfHostedProjectName =
    process.env.NEXT_PUBLIC_STUDIO_DEFAULT_PROJECT ?? 'Self-hosted Supabase'
  const fallbackProjectName = projectName ?? selfHostedProjectName
  const fallbackProjectRef = project?.ref ?? ref ?? 'default'
  const fallbackProjectRegion = project?.region ?? 'local'

  const { can: canUpdateProject } = useAsyncCheckPermissions(PermissionAction.UPDATE, 'projects', {
    resource: {
      project_id: project?.id,
    },
  })

  const { mutate: updateProject, isPending: isUpdating } = useProjectUpdateMutation()

  const formSchema = z.object({
    name: z.string().trim().min(3, 'Project name must be at least 3 characters long'),
  })

  const defaultValues = { name: fallbackProjectName }
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
    values: defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
  })

  const regionLabel = AVAILABLE_REPLICA_REGIONS.find((region) =>
    project?.region?.includes(region.region)
  )
  const regionDescription =
    regionLabel?.name ?? (fallbackProjectRegion === 'local' ? 'Self-hosted runtime' : undefined)

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!project?.ref) return console.error('Ref is required')

    updateProject(
      { ref: project.ref, name: values.name.trim() },
      {
        onSuccess: ({ name }) => {
          form.reset({ name })
          toast.success('Successfully saved settings')
        },
      }
    )
  }

  return (
    <>
      <PageSection>
        <PageSectionMeta>
          <PageSectionSummary>
            <PageSectionTitle>General settings</PageSectionTitle>
          </PageSectionSummary>
        </PageSectionMeta>
        <PageSectionContent>
          {isBranch && (
            <Admonition
              type="default"
              className="mb-4"
              title="You are currently on a preview branch of your project"
            >
              Certain settings are not available while you're on a preview branch. To adjust your
              project settings, you may return to your{' '}
              <InlineLink href={`/project/${project?.parent_project_ref}/settings/general`}>
                main branch
              </InlineLink>
              .
            </Admonition>
          )}

          {project === undefined && IS_PLATFORM ? (
            <Card>
              <CardContent>
                <GenericSkeletonLoader />
              </CardContent>
            </Card>
          ) : (
            <>
              {!IS_PLATFORM && project === undefined && (
                <Admonition type="default" className="mb-4" title="Self-hosted project metadata">
                  Project metadata is read from the runtime environment when the hosted project API
                  is not available.
                </Admonition>
              )}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <Card>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItemLayout
                            layout="flex-row-reverse"
                            label={`${entityLabel} name`}
                            description="Displayed throughout the dashboard."
                            className="[&>div]:md:w-1/2"
                          >
                            <FormControl>
                              <Input
                                {...field}
                                readOnly={isBranch || !canUpdateProject || !project}
                                autoComplete="off"
                              />
                            </FormControl>
                          </FormItemLayout>
                        )}
                      />
                    </CardContent>

                  {isBranch && (
                    <CardContent>
                      <FormItemLayout
                        layout="flex-row-reverse"
                        label={`${entityLabel} type`}
                        description="Preview or persistent"
                        className="[&>div]:md:w-1/2 [&>div>div]:md:w-full"
                      >
                        <FormControl>
                          <Input readOnly value={branch?.persistent ? 'Persistent' : 'Preview'} />
                        </FormControl>
                      </FormItemLayout>
                    </CardContent>
                  )}

                  <CardContent>
                    <FormItemLayout
                      layout="flex-row-reverse"
                      label={`${entityLabel} ID`}
                      description="Reference used in APIs and URLs."
                      className="[&>div]:md:w-1/2 [&>div>div]:md:w-full"
                    >
                      <FormControl>
                        <PasswordInput copy readOnly size="small" value={fallbackProjectRef} />
                      </FormControl>
                    </FormItemLayout>
                  </CardContent>

                  <CardContent>
                    <FormItemLayout
                      layout="flex-row-reverse"
                      label={`${entityLabel} region`}
                      description={regionDescription}
                      className="[&>div]:md:w-1/2 [&>div>div]:md:w-full"
                    >
                      <FormControl>
                        <PasswordInput copy readOnly size="small" value={fallbackProjectRegion} />
                      </FormControl>
                    </FormItemLayout>
                  </CardContent>

                  <CardFooter className="justify-end space-x-2">
                    {form.formState.isDirty && (
                      <Button
                        variant="default"
                        type="button"
                        disabled={isUpdating}
                        onClick={() => form.reset({ name: fallbackProjectName })}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={
                        !form.formState.isDirty ||
                        isUpdating ||
                        !canUpdateProject ||
                        isBranch ||
                        !project
                      }
                      loading={isUpdating}
                    >
                      Save changes
                    </Button>
                  </CardFooter>
                </Card>
                </form>
              </Form>
            </>
          )}
        </PageSectionContent>
      </PageSection>

      {IS_PLATFORM && project && <ProjectAccessSection />}
    </>
  )
}
