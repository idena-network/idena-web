/* eslint-disable react/prop-types */
import React from 'react'
import {useRouter} from 'next/router'
import {Flex} from '@chakra-ui/core'
import Sidebar from './sidebar'
import Notifications from './notifications'
import {useEpochState} from '../providers/epoch-context'
import {shouldStartValidation} from '../../screens/validation/utils'
import {useIdentityState} from '../providers/identity-context'
import {ValidationToast} from '../../screens/validation/components'
import {LayoutContainer} from '../../screens/app/components'
import {useAuthState} from '../providers/auth-context'
import Auth from './auth'

export default function Layout({...props}) {
  const {auth} = useAuthState()

  return (
    <LayoutContainer>
      {auth ? (
        <>
          <Sidebar />
          <NormalApp {...props} />
        </>
      ) : (
        <Auth />
      )}
    </LayoutContainer>
  )
}

function NormalApp({children}) {
  const router = useRouter()

  const epoch = useEpochState()
  const identity = useIdentityState()

  React.useEffect(() => {
    if (shouldStartValidation(epoch, identity)) router.push('/validation')
  }, [epoch, identity, router])

  return (
    <Flex as="section" direction="column" flex={1} h="100vh" overflowY="auto">
      {children}

      {epoch && <ValidationToast epoch={epoch} identity={identity} />}

      <Notifications />
    </Flex>
  )
}
