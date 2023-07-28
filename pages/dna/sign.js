import * as React from 'react'
import {Box, Spinner, useDisclosure} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {Page, PageTitle} from '../../screens/app/components'
import Layout from '../../shared/components/layout'
import {DnaSignDialog} from '../../screens/dna/containers'
import {
  DnaLinkMethod,
  useDnaAppLink,
  useDnaLinkMethod,
} from '../../screens/dna/hooks'
import {useFailToast} from '../../shared/hooks/use-toast'

export default function SignPage() {
  const {t} = useTranslation()

  const failToast = useFailToast()

  const {onOpen, ...dnaSignDisclosure} = useDisclosure()

  const {
    params: {favicon_url: faviconUrl, ...dnaSignParams},
  } = useDnaLinkMethod(DnaLinkMethod.Sign, {
    onReceive: onOpen,
  })

  const [, {dismiss: dismissDnaAppLink}] = useDnaAppLink()

  return (
    <Layout canRedirect={false}>
      <Page>
        <PageTitle>{t('Sign message with Idena')}</PageTitle>
        <Box>
          <Spinner />
          <DnaSignDialog
            faviconUrl={faviconUrl}
            {...dnaSignParams}
            {...dnaSignDisclosure}
            onCompleteSign={dismissDnaAppLink}
            onSignError={failToast}
          />
        </Box>
      </Page>
    </Layout>
  )
}
