/* eslint-disable react/prop-types */
import React from 'react'
import {useRouter} from 'next/router'
import {Flex, useDisclosure} from '@chakra-ui/react'
import Sidebar from './sidebar'
import Notifications from './notifications'
import {shouldStartValidation} from '../../screens/validation/utils'
import {ValidationToast} from '../../screens/validation/components'
import {Hamburger, LayoutContainer} from '../../screens/app/components'
import {useAuthState} from '../providers/auth-context'
import Auth from './auth'

import {apiKeyStates, useSettingsState} from '../providers/settings-context'
import {useIdentity} from '../providers/identity-context'
import {useEpoch} from '../providers/epoch-context'
import {useTestValidationState} from '../providers/test-validation-context'
import {EpochPeriod} from '../types'

export default function Layout(props) {
  const {auth} = useAuthState()
  const {isOpen, onOpen, onClose} = useDisclosure()

  return (
    <LayoutContainer>
      {auth ? (
        <>
          <Hamburger onClick={onOpen} />
          <Sidebar isOpen={isOpen} onClose={onClose} />
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

  const {current, epoch: testValidationEpoch} = useTestValidationState()

  React.useEffect(() => {
    if (!canRedirect) return
    if (settings.apiKeyState === apiKeyStates.OFFLINE) {
      router.push('/node/offline')
    } else if (shouldStartValidation(epoch, identity))
      router.push('/validation')
    else if (current?.period === EpochPeriod.ShortSession)
      router.push('/try/validation')
  }, [canRedirect, current, epoch, identity, router, settings.apiKeyState])

  return (
    <Flex as="section" direction="column" flex={1} h="100vh" overflowY="auto">
      {children}

      {current && (
        <ValidationToast epoch={testValidationEpoch} isTestValidation />
      )}
      {epoch && <ValidationToast epoch={epoch} identity={identity} />}

      <Notifications />
    </Flex>
  )
}
