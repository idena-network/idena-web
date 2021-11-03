import * as React from 'react'
import {Box, Spinner, useDisclosure} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useRouter} from 'next/router'
import {Page, PageTitle} from '../../screens/app/components'
import Layout from '../../shared/components/layout'
import {DnaSignInDialog} from '../../screens/dna/containers'
import {DnaLinkMethod, useDnaLinkMethod} from '../../screens/dna/hooks'
import {useFailToast} from '../../shared/hooks/use-toast'

export default function SigninPage() {
  const router = useRouter()

  const {t} = useTranslation()

  const failToast = useFailToast()

  const {onOpen, ...dnaSignInDisclosure} = useDisclosure()

  const {
    params: {
      nonce_endpoint: nonceEndpoint,
      authentication_endpoint: authenticationEndpoint,
      favicon_url: faviconUrl,
      ...dnaSignInParams
    },
  } = useDnaLinkMethod(DnaLinkMethod.SignIn, {
    onReceive: onOpen,
  })

  return (
    <Layout canRedirect={false}>
      <Page>
        <PageTitle>{t('Sign in with Idena')}</PageTitle>
        <Box>
          <Spinner />
          <DnaSignInDialog
            authenticationEndpoint={authenticationEndpoint}
            nonceEndpoint={nonceEndpoint}
            faviconUrl={faviconUrl}
            {...dnaSignInParams}
            {...dnaSignInDisclosure}
            onCompleteSignIn={() => {
              sessionStorage.removeItem('dnaUrl')
              router.push('/home')
            }}
            onSignInError={failToast}
          />
        </Box>
      </Page>
    </Layout>
  )
}
