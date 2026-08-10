import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { LogoLoader } from 'ui'

import { useSignOut } from '@/lib/auth'
import { IS_PLATFORM } from '@/lib/constants'
import type { NextPageWithLayout } from '@/types'

const LogoutPage: NextPageWithLayout = () => {
  const router = useRouter()
  const signOut = useSignOut()

  useEffect(() => {
    const logout = async () => {
      if (!IS_PLATFORM) {
        await signOut()
        window.location.assign('/_auth/logout')
        return
      }

      await signOut()
      toast('Successfully logged out')
      await router.push('/sign-in')
    }
    logout()
  }, [router, signOut])

  return (
    <div className="w-full h-screen flex items-center justify-center">
      <LogoLoader />
    </div>
  )
}

export default LogoutPage
