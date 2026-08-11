import { useRouter } from 'next/router'
import type { PropsWithChildren } from 'react'

import { ProjectLayout } from '../ProjectLayout'
import { useGenerateDatabaseMenu } from './DatabaseMenu.utils'
import { ProductMenu } from '@/components/ui/ProductMenu'
import { ProductMenuShortcuts } from '@/components/ui/ProductMenu/ProductMenuShortcuts'
import { withAuth } from '@/hooks/misc/withAuth'

export interface DatabaseLayoutProps {
  title: string
}

export const DatabaseProductMenu = () => {
  const router = useRouter()
  const page = getActiveDatabasePage(router.asPath || router.pathname)
  const menu = useGenerateDatabaseMenu()

  return <ProductMenu page={page} menu={menu} />
}

function getActiveDatabasePage(pathname: string) {
  const path = pathname.split('?')[0]
  const databaseIndex = path.split('/').findIndex((segment) => segment === 'database')
  return databaseIndex >= 0 ? path.split('/')[databaseIndex + 1] : undefined
}

const DatabaseLayout = ({ children, title }: PropsWithChildren<DatabaseLayoutProps>) => {
  const router = useRouter()
  const page = getActiveDatabasePage(router.asPath || router.pathname)
  const menu = useGenerateDatabaseMenu()

  return (
    <ProjectLayout
      product="Database"
      browserTitle={{ section: title }}
      productMenu={<ProductMenu page={page} menu={menu} />}
      isBlocking={false}
    >
      <ProductMenuShortcuts menu={menu} />
      {children}
    </ProjectLayout>
  )
}

export default withAuth(DatabaseLayout)
