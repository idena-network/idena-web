/* eslint-disable react/prop-types */
import React, {useState} from 'react'
import {useRouter} from 'next/router'
import {Flex, Radio, RadioGroup, Stack} from '@chakra-ui/core'
import {padding} from 'polished'
import Sidebar from './sidebar'
import Notifications from './notifications'
import {useEpochState} from '../providers/epoch-context'
import {shouldStartValidation} from '../../screens/validation/utils'
import {useIdentityState} from '../providers/identity-context'
import {ValidationToast} from '../../screens/validation/components'
import {LayoutContainer} from '../../screens/app/components'
import {useAuthState} from '../providers/auth-context'
import Auth from './auth'

import {Avatar} from './components'
import {SubHeading, Text} from './typo'
import {apiKeyStates, useSettingsState} from '../providers/settings-context'
import {PrimaryButton} from './button'

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

  const epoch = useEpochState()
  const identity = useIdentityState()
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
