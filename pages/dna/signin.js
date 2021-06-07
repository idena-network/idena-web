import * as React from 'react'
import {Box, Spinner, useToast} from '@chakra-ui/core'
import {useTranslation} from 'react-i18next'
import {useRouter} from 'next/router'
import {Page, PageTitle} from '../../screens/app/components'
import {Toast} from '../../shared/components/components'
import {DnaSignInDialog} from '../../screens/dna/containers'

export const DNA_LINK_VERSION = `v1`
export const DNA_NONCE_PREFIX = 'signin-'

export const DNA_SEND_CONFIRM_TRESHOLD = 0.05

export function validDnaUrl(url) {
  try {
    return typeof url === 'string' && url.startsWith('/dna')
  } catch {
    return false
  }
}

export default function SigninPage() {
  const {route, query} = useRouter()

  const {t} = useTranslation()

  const toast = useToast()

  const [dnaUrl, setDnaUrl] = React.useState()

  React.useEffect(() => {
    if (validDnaUrl(route)) {
      setDnaUrl(route)
    } else
      toast({
        // eslint-disable-next-line react/display-name
        render: () => (
          <Toast
            title={t('Invalid DNA link')}
            description={t(
              `You must provide valid URL including protocol version`
            )}
          />
        ),
      })
  }, [route, t, toast])

  return (
    <Page>
      <PageTitle>{t('Sign in with Idena')}</PageTitle>
      <Box>
        <Spinner />
        {/* eslint-disable-next-line no-restricted-globals */}
        <DnaSignInDialog isOpen={Boolean(dnaUrl)} query={query} />
      </Box>
    </Page>
  )
}
