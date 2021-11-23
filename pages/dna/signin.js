import * as React from 'react'
import {Box, Spinner, useDisclosure} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {Page, PageTitle} from '../../screens/app/components'
import Layout from '../../shared/components/layout'
import {DnaSignInDialog} from '../../screens/dna/containers'
import {
  DnaLinkMethod,
  useDnaAppLink,
  useDnaLinkMethod,
} from '../../screens/dna/hooks'
import {useFailToast} from '../../shared/hooks/use-toast'

export default function SigninPage() {
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

  const [, {dismiss: dimissDnaAppLink}] = useDnaAppLink()

  return (
    <Layout canRedirect={false}>
      <Page>
        <PageTitle>{t('Sign in with Idena')}</PageTitle>
        <Box>
          <Spinner />
          {Boolean(authenticationEndpoint) && (
            <DnaSignInDialog
              authenticationEndpoint={authenticationEndpoint}
              nonceEndpoint={nonceEndpoint}
              faviconUrl={faviconUrl}
              {...dnaSignInParams}
              {...dnaSignInDisclosure}
              onCompleteSignIn={dimissDnaAppLink}
              onSignInError={failToast}
            />
          )}
        </Box>
      </Page>
    </Layout>
  )
}
