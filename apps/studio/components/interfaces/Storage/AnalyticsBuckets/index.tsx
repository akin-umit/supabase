import { useQuery } from '@tanstack/react-query'
import { useParams } from 'common'
import { AnalyticsBucket as AnalyticsBucketIcon } from 'icons'
import { ChevronRight, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { parseAsBoolean, useQueryState } from 'nuqs'
import { useState } from 'react'
import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from 'ui'
import { Input } from 'ui-patterns/DataInputs/Input'
import { PageContainer } from 'ui-patterns/PageContainer'
import { PageSection, PageSectionContent, PageSectionTitle } from 'ui-patterns/PageSection'
import { GenericSkeletonLoader } from 'ui-patterns/ShimmeringLoader'
import { TimestampInfo } from 'ui-patterns/TimestampInfo'

import { EmptyBucketState } from '../EmptyBucketState'
import { CreateBucketButton } from '../NewBucketButton'
import { CreateAnalyticsBucketModal } from './CreateAnalyticsBucketModal'
import { AlertError } from '@/components/ui/AlertError'
import { AlphaNotice } from '@/components/ui/AlphaNotice'
import { useProjectStorageConfigQuery } from '@/data/config/project-storage-config-query'
import { useAnalyticsBucketsQuery } from '@/data/storage/analytics-buckets-query'
import type { RuntimeConfigStatus } from '@/lib/api/self-hosted/runtime-config'
import { IS_PLATFORM } from '@/lib/constants'
import { createNavigationHandler } from '@/lib/navigation'

async function fetchSelfHostedStorageRuntime(projectRef: string, signal?: AbortSignal) {
  const response = await fetch(`/api/platform/projects/${projectRef}/runtime/storage`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!response.ok) throw new Error('Failed to load storage runtime config')
  return (await response.json()) as RuntimeConfigStatus
}

export const AnalyticsBuckets = () => {
  if (!IS_PLATFORM) {
    return <SelfHostedAnalyticsBuckets />
  }

  const { ref } = useParams()
  const router = useRouter()

  const [filterString, setFilterString] = useState('')

  const [visible, setVisible] = useQueryState(
    'new',
    parseAsBoolean.withDefault(false).withOptions({ history: 'push', clearOnDefault: true })
  )

  const { data: config } = useProjectStorageConfigQuery({ projectRef: ref })
  const maxAnalyticsBuckets = config?.features.icebergCatalog.maxCatalogs ?? 2

  const {
    data: buckets = [],
    error: bucketsError,
    isError: isErrorBuckets,
    isPending: isLoadingBuckets,
    isSuccess: isSuccessBuckets,
  } = useAnalyticsBucketsQuery({
    projectRef: ref,
  })

  const analyticsBuckets = buckets.filter((bucket) =>
    filterString.length === 0
      ? true
      : bucket.name.toLowerCase().includes(filterString.toLowerCase())
  )
  const hasNoBuckets = buckets.length === 0

  return (
    <>
      <PageContainer>
        <PageSection>
          <PageSectionContent className="flex flex-col gap-y-8">
            <AlphaNotice
              entity="Analytics buckets"
              feedbackUrl="https://github.com/orgs/supabase/discussions/40116"
            />

            {isLoadingBuckets && <GenericSkeletonLoader />}

            {isErrorBuckets && (
              <AlertError error={bucketsError} subject="Failed to retrieve analytics buckets" />
            )}

            {isSuccessBuckets && (
              <>
                {hasNoBuckets ? (
                  <EmptyBucketState
                    bucketType="analytics"
                    onCreateBucket={() => setVisible(true)}
                  />
                ) : (
                  <div className="flex flex-col gap-y-4">
                    <div className="flex flex-row items-center gap-x-2">
                      <PageSectionTitle>Buckets</PageSectionTitle>
                      {analyticsBuckets.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="bg-surface-200 rounded-full px-2 py-1 leading-none text-xs text-foreground-lighter tracking-widest">
                              {analyticsBuckets.length}/{maxAnalyticsBuckets}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="w-72 text-center">
                            Each project can only have up to {maxAnalyticsBuckets} buckets while
                            analytics buckets are in alpha{' '}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="flex grow justify-between gap-x-2 items-center">
                      <Input
                        size="tiny"
                        className="grow lg:grow-0 w-52"
                        placeholder="Search for a bucket"
                        value={filterString}
                        onChange={(e) => setFilterString(e.target.value)}
                        icon={<Search />}
                      />
                      <CreateBucketButton onClick={() => setVisible(true)} />
                    </div>

                    {isLoadingBuckets ? (
                      <GenericSkeletonLoader />
                    ) : (
                      <Card>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {analyticsBuckets.length > 0 && (
                                <TableHead className="w-2 pr-1">
                                  <span className="sr-only">Icon</span>
                                </TableHead>
                              )}
                              <TableHead>Name</TableHead>
                              <TableHead>Created at</TableHead>
                              <TableHead>
                                <span className="sr-only">Actions</span>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {analyticsBuckets.length === 0 && filterString.length > 0 && (
                              <TableRow className="[&>td]:hover:bg-inherit">
                                <TableCell colSpan={3}>
                                  <p className="text-sm text-foreground">No results found</p>
                                  <p className="text-sm text-foreground-light">
                                    Your search for "{filterString}" did not return any results
                                  </p>
                                </TableCell>
                              </TableRow>
                            )}
                            {analyticsBuckets.map((bucket) => {
                              const handleBucketNavigation = createNavigationHandler(
                                `/project/${ref}/storage/analytics/buckets/${encodeURIComponent(bucket.name)}`,
                                router
                              )

                              return (
                                <TableRow
                                  key={bucket.name}
                                  className="relative cursor-pointer h-16 inset-focus"
                                  onClick={handleBucketNavigation}
                                  onAuxClick={handleBucketNavigation}
                                  onKeyDown={handleBucketNavigation}
                                  tabIndex={0}
                                >
                                  <TableCell className="w-2 pr-1">
                                    <AnalyticsBucketIcon
                                      size={16}
                                      className="text-foreground-muted"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <p className="whitespace-nowrap max-w-[512px] truncate">
                                      {bucket.name}
                                    </p>
                                  </TableCell>

                                  <TableCell>
                                    <p className="text-foreground-light">
                                      <TimestampInfo
                                        utcTimestamp={bucket.created_at}
                                        className="text-sm text-foreground-light"
                                      />
                                    </p>
                                  </TableCell>

                                  <TableCell>
                                    <div className="flex justify-end items-center h-full">
                                      <ChevronRight
                                        size={14}
                                        className="text-foreground-muted/60"
                                      />
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </Card>
                    )}
                  </div>
                )}
              </>
            )}
          </PageSectionContent>
        </PageSection>
      </PageContainer>
      <CreateAnalyticsBucketModal open={visible} onOpenChange={setVisible} />
    </>
  )
}

function SelfHostedAnalyticsBuckets() {
  const { ref } = useParams()
  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['self-hosted-storage-runtime', ref],
    queryFn: ({ signal }) => fetchSelfHostedStorageRuntime(ref!, signal),
    enabled: typeof ref === 'string' && ref.length > 0,
    refetchOnWindowFocus: false,
  })

  return (
    <PageContainer>
      <PageSection>
        <PageSectionContent className="flex flex-col gap-y-8">
          <Card>
            <div className="space-y-4 p-6">
              <div className="space-y-1">
                <p className="text-xl text-foreground">Analytics buckets</p>
                <p className="max-w-3xl text-sm text-foreground-light">
                  Analytics and vector buckets are enabled from the self-hosted Storage runtime,
                  object storage backend and database extensions. Studio does not call Supabase
                  Cloud bucket provisioning APIs in self-hosted mode.
                </p>
              </div>

              {isPending ? (
                <GenericSkeletonLoader />
              ) : isError ? (
                <div className="flex flex-col items-start gap-3">
                  <div>
                    <p className="text-sm text-foreground">Storage runtime status unavailable</p>
                    <p className="text-sm text-foreground-light">
                      The management API could not provide storage configuration evidence.
                    </p>
                  </div>
                  <button
                    className="text-sm text-foreground underline"
                    type="button"
                    onClick={() => refetch()}
                    disabled={isFetching}
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="overflow-hidden rounded border">
                  {data.settings.map((setting) => (
                    <div
                      key={setting.name}
                      className="grid grid-cols-[minmax(0,1fr)_160px] gap-4 border-b px-4 py-3 text-sm last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-foreground">{setting.name}</p>
                        <p className="truncate text-foreground-light">
                          {(setting.activeSource ?? setting.sources.join(', ')) || 'runtime'}
                        </p>
                      </div>
                      <p className="text-right font-mono text-foreground-light">{setting.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </PageSectionContent>
      </PageSection>
    </PageContainer>
  )
}
