/* eslint-disable react/prop-types */
import React from 'react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {Flex} from '@chakra-ui/core'
import {rem} from 'polished'
import Sidebar from './sidebar'
import Notifications from './notifications'
import {useEpochState} from '../providers/epoch-context'
import {shouldStartValidation} from '../../screens/validation/utils'
import {useIdentityState} from '../providers/identity-context'
import {ValidationToast} from '../../screens/validation/components'
import {LayoutContainer} from '../../screens/app/components'
import {useAuthState} from '../providers/auth-context'
import Auth from './auth'
import theme from '../theme'

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

export function AuthLayout({children}) {
  return (
    <>
      <section>{children}</section>
      <style jsx>{`
        section {
          background: ${theme.colors.darkGraphite};
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          height: 100vh;
        }
      `}</style>
    </>
  )
}

// eslint-disable-next-line react/display-name
AuthLayout.Normal = function({children}) {
  return (
    <>
      <div>{children}</div>
      <style jsx>{`
        div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-direction: column;
          width: ${rem(480)};
        }
      `}</style>
    </>
  )
}
// eslint-disable-next-line react/display-name
AuthLayout.Small = function({children}) {
  return (
    <>
      <div>{children}</div>
      <style jsx>{`
        div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-direction: column;
          width: ${rem(360)};
          background-color: rgba(0, 0, 0, 0.16);
          padding: 52px 40px 36px;
          border-radius: 8px;
        }
      `}</style>
    </>
  )
}
