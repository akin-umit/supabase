import { UseFormReturn } from 'react-hook-form'
import { CloudProvider } from 'shared-data'
import {
  FormField,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'ui'
import { ComputeBadge } from 'ui-patterns/ComputeBadge'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'

import { sizes } from './ProjectCreation.constants'
import { CreateProjectForm } from './ProjectCreation.schema'
import { InlineLink } from '@/components/ui/InlineLink'
import Panel from '@/components/ui/Panel'
import { instanceSizeSpecs } from '@/data/projects/new-project.constants'
import { getCloudProviderArchitecture } from '@/lib/cloudprovider-utils'
import { DOCS_URL } from '@/lib/constants'

interface ComputeSizeSelectorProps {
  form: UseFormReturn<CreateProjectForm>
  isSelfHosted?: boolean
}

export const ComputeSizeSelector = ({ form, isSelfHosted = false }: ComputeSizeSelectorProps) => {
  return (
    <Panel.Content>
      <FormField
        control={form.control}
        name="instanceSize"
        render={({ field }) => (
          <FormItemLayout
            id="instanceSize"
            layout="horizontal"
            label="Compute size"
            description={
              isSelfHosted ? (
                <p>Select the VPS resource profile reserved for this self-hosted runtime.</p>
              ) : (
                <p>
                  The size for your dedicated database. You can change this later. Learn more about{' '}
                  <InlineLink href={`${DOCS_URL}/guides/platform/compute-add-ons`}>
                    compute add-ons
                  </InlineLink>{' '}
                  and{' '}
                  <InlineLink href={`${DOCS_URL}/guides/platform/manage-your-usage/compute`}>
                    compute billing
                  </InlineLink>
                  .
                </p>
              )
            }
          >
            <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
              <SelectTrigger
                id="instanceSize"
                className="[&>span>div>div>[data-field=instance-details]]:hidden"
              >
                <SelectValue placeholder="Select a compute size" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {sizes
                    .filter((option) =>
                      instanceSizeSpecs[option].cloud_providers.includes(
                        form.getValues('cloudProvider') as CloudProvider
                      )
                    )
                    .map((option) => {
                      const computeLabel = `${instanceSizeSpecs[option].ram} RAM / ${
                        instanceSizeSpecs[option].cpu
                      } ${getCloudProviderArchitecture(
                        form.getValues('cloudProvider') as CloudProvider
                      )} CPU`
                      const computeDetails = isSelfHosted
                        ? 'Reserved from your VPS capacity'
                        : `$${instanceSizeSpecs[option].priceHourly}/hour (~$${instanceSizeSpecs[option].priceMonthly}/month)`

                      return (
                        <SelectItem
                          key={option}
                          value={option}
                          textValue={`${computeLabel} ${computeDetails}`}
                        >
                          <div className="flex flex-row gap-4 items-center">
                            <div className="w-14 flex items-center">
                              <ComputeBadge infraComputeSize={option} />
                            </div>

                            <div className="text-sm">
                              <span className="text-foreground">{computeLabel}</span>
                              <p
                                translate="no"
                                className="text-xs text-foreground-light"
                                data-field="instance-details"
                              >
                                {computeDetails}
                              </p>
                            </div>
                          </div>
                        </SelectItem>
                      )
                    })}
                  <SelectItem key={'disabled'} value={'disabled'} disabled>
                    <div className="flex items-center justify-center w-full">
                      <span>
                        {isSelfHosted
                          ? 'Larger VPS profiles can be enabled in your runtime configuration'
                          : 'Larger instance sizes available after creation'}
                      </span>
                    </div>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </FormItemLayout>
        )}
      />
    </Panel.Content>
  )
}
