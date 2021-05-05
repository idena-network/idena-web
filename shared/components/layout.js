/* eslint-disable react/prop-types */
import React from 'react'
import {useRouter} from 'next/router'
import {Flex} from '@chakra-ui/core'
import Sidebar from './sidebar'
import Notifications from './notifications'
import {shouldStartValidation} from '../../screens/validation/utils'
import {ValidationToast} from '../../screens/validation/components'
import {LayoutContainer} from '../../screens/app/components'
import {useAuthState} from '../providers/auth-context'
import Auth from './auth'

import {apiKeyStates, useSettingsState} from '../providers/settings-context'
import {useIdentity} from '../providers/identity-context'
import {useEpoch} from '../providers/epoch-context'

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

function NormalApp({children, canRedirect = true}) {
  const router = useRouter()

  const epoch = useEpoch()
  const [identity] = useIdentity()
  const settings = useSettingsState()

  React.useEffect(() => {
    if (!canRedirect) return
    if (settings.apiKeyState === apiKeyStates.OFFLINE) {
      router.push('/node/offline')
    } else if (shouldStartValidation(epoch, identity))
      router.push('/validation')
  }, [canRedirect, epoch, identity, router, settings.apiKeyState])

  return (
    <Flex as="section" direction="column" flex={1} h="100vh" overflowY="auto">
      {children}

      {epoch && <ValidationToast epoch={epoch} identity={identity} />}

      <Notifications />
    </Flex>
  )
}
