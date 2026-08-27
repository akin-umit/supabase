import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import type { ProjectStorageConfigData } from '@/data/config/project-storage-config-query'
import type { ProjectDetail } from '@/data/projects/project-detail-query'
import { API_URL } from '@/lib/constants'
import StorageVectorsPage from '@/pages/project/[ref]/storage/vectors'
import { customRender } from '@/tests/lib/custom-render'
import { addAPIMock, mswServer } from '@/tests/lib/msw'

const { mockIsPlatform } = vi.hoisted(() => ({
  mockIsPlatform: { value: true },
}))

// `IS_PLATFORM` is a build-time constant, so it can't be driven over the
// network — mock it in both modules that read it (the page imports from
// `common`; the data hooks read from `@/lib/constants`). Everything else the
// page branches on comes from real queries via MSW.
vi.mock('common', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useParams: () => ({ ref: 'default' }),
    get IS_PLATFORM() {
      return mockIsPlatform.value
    },
  }
})

vi.mock('@/lib/constants', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    get IS_PLATFORM() {
      return mockIsPlatform.value
    },
  }
})

// Stub the heavy leaf children. Keep the region contract without importing
// the icon-heavy implementation.
vi.mock('@/components/interfaces/Storage/VectorBuckets/RegionLimitation', () => ({
  RegionLimitation: () => <div>region-limitation</div>,
  VECTOR_BUCKETS_AVAILABLE_REGIONS: ['us-east-1'],
}))

vi.mock('@/components/interfaces/Storage/VectorBuckets', () => ({
  VectorsBuckets: () => <div>vectors-buckets</div>,
}))

vi.mock('@/components/interfaces/Storage/BucketsUpgradePlan', () => ({
  BucketsUpgradePlan: ({ type }: { type: string }) => <div>buckets-upgrade-plan-{type}</div>,
}))

const AVAILABLE_REGION = 'us-east-1'
const UNAVAILABLE_REGION = 'ap-south-1'

const mockProject = (region: string) => {
  addAPIMock({
    method: 'get',
    path: '/platform/projects/:ref',
    // The page only reads `region` off the project
    response: () =>
      HttpResponse.json<ProjectDetail>({
        region,
        status: 'ACTIVE_HEALTHY',
      } as unknown as ProjectDetail),
  })
}

const mockStorageConfig = (vectorBucketsEnabled: boolean) => {
  addAPIMock({
    method: 'get',
    path: '/platform/projects/:ref/config/storage',
    response: () =>
      HttpResponse.json<ProjectStorageConfigData>({
        capabilities: { iceberg_catalog: false, list_v2: false },
        databasePoolMode: 'transaction',
        external: { upstreamTarget: 'main' },
        features: {
          icebergCatalog: { enabled: false, maxCatalogs: 0, maxNamespaces: 0, maxTables: 0 },
          imageTransformation: { enabled: false },
          s3Protocol: { enabled: false },
          vectorBuckets: { enabled: vectorBucketsEnabled, maxBuckets: 0, maxIndexes: 0 },
        },
        fileSizeLimit: 0,
        migrationVersion: 'v1',
      } as ProjectStorageConfigData),
  })
}

const mockDeploymentMode = (isCli: boolean) => {
  mswServer.use(
    http.get(`${API_URL}/platform/deployment-mode`, () => HttpResponse.json({ is_cli_mode: isCli }))
  )
}

const mockVectorBuckets = (status = 200) => {
  mswServer.use(
    http.get(`${API_URL}/platform/storage/:ref/vector-buckets`, () =>
      status === 200
        ? HttpResponse.json({ vectorBuckets: [] })
        : HttpResponse.json({ error: { message: 'Unavailable' } }, { status })
    )
  )
}

describe('StorageVectorsPage', () => {
  beforeEach(() => {
    mockIsPlatform.value = true
    mockProject(AVAILABLE_REGION)
    mockDeploymentMode(true)
  })

  test('platform + region not supported: shows region limitation', async () => {
    mockProject(UNAVAILABLE_REGION)
    mockStorageConfig(true)

    customRender(<StorageVectorsPage dehydratedState={undefined} />)

    expect(await screen.findByText('region-limitation')).toBeInTheDocument()
    expect(screen.queryByText('vectors-buckets')).not.toBeInTheDocument()
  })

  test('platform + supported region + not enabled: shows upgrade plan', async () => {
    mockStorageConfig(false)

    customRender(<StorageVectorsPage dehydratedState={undefined} />)

    expect(await screen.findByText('buckets-upgrade-plan-vector')).toBeInTheDocument()
    expect(screen.queryByText('vectors-buckets')).not.toBeInTheDocument()
  })

  test('platform + supported region + enabled: shows vector buckets', async () => {
    mockStorageConfig(true)

    customRender(<StorageVectorsPage dehydratedState={undefined} />)

    expect(await screen.findByText('vectors-buckets')).toBeInTheDocument()
  })

  test('CLI (non-platform, enabled): shows vector buckets, skips region/upgrade gates', async () => {
    mockIsPlatform.value = false
    // Even an unsupported region shouldn't gate off-platform
    mockProject(UNAVAILABLE_REGION)
    mockDeploymentMode(true)

    customRender(<StorageVectorsPage dehydratedState={undefined} />)

    expect(await screen.findByText('vectors-buckets')).toBeInTheDocument()
    expect(screen.queryByText('region-limitation')).not.toBeInTheDocument()
  })

  test('self-hosted (non-platform): shows vector buckets when the Storage API is available', async () => {
    mockIsPlatform.value = false
    mockDeploymentMode(false)
    mockVectorBuckets()

    customRender(<StorageVectorsPage dehydratedState={undefined} />)

    expect(await screen.findByText('vectors-buckets')).toBeInTheDocument()
  })

  test('self-hosted (non-platform): delegates Storage API failures to the vector buckets surface', async () => {
    mockIsPlatform.value = false
    mockDeploymentMode(false)
    mockVectorBuckets(503)

    customRender(<StorageVectorsPage dehydratedState={undefined} />)

    expect(await screen.findByText('vectors-buckets')).toBeInTheDocument()
  })
})
