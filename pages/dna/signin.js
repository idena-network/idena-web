import * as React from 'react'
import {Box, Spinner, useToast} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useRouter} from 'next/router'
import {Page, PageTitle} from '../../screens/app/components'
import Layout from '../../shared/components/layout'
import {Toast} from '../../shared/components/components'
import {DnaSignInDialog} from '../../screens/dna/containers'
import {validDnaUrl} from '../../shared/utils/dna-link'

export default function SigninPage() {
  const router = useRouter()
  const {route, query} = router

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
    <Layout canRedirect={false}>
      <Page>
        <PageTitle>{t('Sign in with Idena')}</PageTitle>
        <Box>
          <Spinner />
          <DnaSignInDialog
            isOpen={Boolean(dnaUrl)}
            closeOnOverlayClick={false}
            query={query}
            onDone={() => {
              sessionStorage.removeItem('dnaUrl')
              router.push('/')
            }}
            onError={error =>
              toast({
                status: 'error',
                // eslint-disable-next-line react/display-name
                render: () => <Toast status="error" title={error} />,
              })
            }
            onClose={() => null}
          />
        </Box>
      </Page>
    </Layout>
  )
}
