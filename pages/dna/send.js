import * as React from 'react'
import {Box, Spinner, useDisclosure} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useQuery} from 'react-query'
import {Page, PageTitle} from '../../screens/app/components'
import Layout from '../../shared/components/layout'
import {
  DnaSendDialog,
  DnaSendFailedDialog,
  DnaSendSucceededDialog,
} from '../../screens/dna/components'
import {useFailToast} from '../../shared/hooks/use-toast'
import {DnaLinkMethod, useDnaLinkMethod} from '../../screens/dna/hooks'
import {useAuthState} from '../../shared/providers/auth-context'
import {fetchBalance} from '../../shared/api/wallet'

export default function DnaSendPage() {
  const {t} = useTranslation()

  const failToast = useFailToast()

  const handleInvalidDnaLink = React.useCallback(() => {
    failToast({
      title: t('Invalid DNA link'),
      description: t(`You must provide valid URL including protocol version`),
    })
  }, [failToast, t])

  const dnaSendDisclosure = useDisclosure()

  const {params: dnaSendParams} = useDnaLinkMethod(DnaLinkMethod.Send, {
    onReceive: dnaSendDisclosure.onOpen,
    onInvalidLink: handleInvalidDnaLink,
  })

  const dnaSendSucceededDisclosure = useDisclosure()

  const dnaSendFailedDisclosure = useDisclosure()

  const [dnaSendResponse, setDnaSendResponse] = React.useState()

  const {coinbase} = useAuthState()

  const {
    data: {balance},
  } = useQuery(['get-balance', coinbase], () => fetchBalance(coinbase), {
    initialData: {balance: 0},
    enabled: !!coinbase,
  })

  return (
    <Layout canRedirect={false}>
      <Page>
        <PageTitle>{t('Send iDNA')}</PageTitle>
        <Box>
          <Spinner />

          <DnaSendDialog
            balance={balance}
            {...dnaSendParams}
            {...dnaSendDisclosure}
            onDepositSuccess={({hash, url}) => {
              setDnaSendResponse({hash, url})
              dnaSendSucceededDisclosure.onOpen()
            }}
            onDepositError={({error, url}) => {
              setDnaSendResponse({error, url})
              dnaSendFailedDisclosure.onOpen()
            }}
            onSendTxFailed={failToast}
          />

          <DnaSendSucceededDialog
            {...dnaSendResponse}
            {...dnaSendSucceededDisclosure}
          />

          <DnaSendFailedDialog
            onRetrySucceeded={({hash, url}) => {
              setDnaSendResponse({hash, url})
              dnaSendFailedDisclosure.onClose()
              dnaSendSucceededDisclosure.onOpen()
            }}
            onRetryFailed={({error, url}) => {
              setDnaSendResponse({error, url})
            }}
            {...dnaSendResponse}
            {...dnaSendFailedDisclosure}
          />
        </Box>
      </Page>
    </Layout>
  )
}
