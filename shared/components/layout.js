/* eslint-disable react/prop-types */
import React from 'react'
import {useRouter} from 'next/router'
import {Flex, useDisclosure} from '@chakra-ui/react'
import Sidebar from './sidebar'
import {shouldStartValidation} from '../../screens/validation/utils'
import {Hamburger, LayoutContainer} from '../../screens/app/components'
import {useAuthState} from '../providers/auth-context'
import Auth from './auth'
import {ApiKeyStates, useSettingsState} from '../providers/settings-context'
import {useIdentity} from '../providers/identity-context'
import {useEpoch} from '../providers/epoch-context'
import {useTestValidationState} from '../providers/test-validation-context'
import {EpochPeriod} from '../types'
import {useInterval} from '../hooks/use-interval'
import {DeferredVotes} from '../../screens/oracles/components'
import {useRotatingAds} from '../../screens/ads/hooks'
import {AdBanner} from '../../screens/ads/containers'
import {useHamburgerTop} from '../hooks/use-hamburger-top'
import {useIsDesktop} from '../utils/utils'
import {useValidationToast} from '../../screens/validation/hooks/use-validation-toast'
import {useTestValidationToast} from '../../screens/try/hooks/use-test-validation-toast'
import {useStartTestValidation} from '../../screens/try/hooks/use-start-test-validation'

export default function Layout({
  showHamburger = true,
  didConnectIdenaBot,
  ...props
}) {
  const {auth} = useAuthState()

  const sidebarDisclosure = useDisclosure()

  const ads = useRotatingAds()
  const hasRotatingAds = ads?.length > 0

  const hamburgerTop = useHamburgerTop({didConnectIdenaBot})

  return (
    <LayoutContainer>
      {auth ? (
        <>
          {showHamburger && (
            <Hamburger onClick={sidebarDisclosure.onOpen} top={hamburgerTop} />
          )}
          <Sidebar {...sidebarDisclosure} />
          <NormalApp hasRotatingAds={hasRotatingAds} {...props} />
        </>
      ) : (
        <Auth />
      )}
    </LayoutContainer>
  )
}

function NormalApp({children, canRedirect = true, skipBanner, hasRotatingAds}) {
  const router = useRouter()

  const epoch = useEpoch()
  const [identity] = useIdentity()
  const settings = useSettingsState()

  const {current: currentTrainingValidation} = useTestValidationState()

  useInterval(() => {
    if (shouldStartValidation(epoch, identity)) router.push('/validation')
  }, 1000)

  const isOffline = settings.apiKeyState === ApiKeyStates.OFFLINE

  const startTestValidation = useStartTestValidation()

  React.useEffect(() => {
    if (!canRedirect) return
    if (isOffline) {
      router.push('/node/offline')
    } else if (currentTrainingValidation?.period === EpochPeriod.ShortSession)
      startTestValidation()
  }, [
    canRedirect,
    currentTrainingValidation,
    isOffline,
    router,
    startTestValidation,
  ])

  const isDesktop = useIsDesktop()

  useValidationToast()

  useTestValidationToast()

  return (
    <Flex
      as="section"
      direction="column"
      flex={1}
      h={['auto', '100vh']}
      overflowY="auto"
    >
      {hasRotatingAds && !skipBanner && !isOffline && isDesktop && <AdBanner />}

      {children}

      <DeferredVotes />
    </Flex>
  )
}
