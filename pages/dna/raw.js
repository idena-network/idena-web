import * as React from 'react'
import {Box, Spinner, useDisclosure} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useQuery} from 'react-query'
import {Page, PageTitle} from '../../screens/app/components'
import Layout from '../../shared/components/layout'
import {
  DnaSendFailedDialog,
  DnaSendSucceededDialog,
  DnaRawDialog,
} from '../../screens/dna/containers'
import {useFailToast} from '../../shared/hooks/use-toast'
import {
  DnaLinkMethod,
  useDnaAppLink,
  useDnaLinkMethod,
} from '../../screens/dna/hooks'
import {useAuthState} from '../../shared/providers/auth-context'
import {fetchBalance} from '../../shared/api/wallet'

export default function DnaRawPage() {
  const {t} = useTranslation()

  const failToast = useFailToast()

  const handleInvalidDnaLink = React.useCallback(() => {
    failToast({
      title: t('Invalid DNA link'),
      description: t(`You must provide valid URL including protocol version`),
    })
  }, [failToast, t])

  const dnaRawTxDisclosure = useDisclosure()

  const {params: dnaRawTxParams} = useDnaLinkMethod(DnaLinkMethod.RawTx, {
    onReceive: dnaRawTxDisclosure.onOpen,
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

  const [, {dismiss: dismissDnaAppLink}] = useDnaAppLink()

  return (
    <Layout canRedirect={false}>
      <Page>
        <PageTitle>{t('Send raw transaction')}</PageTitle>
        <Box>
          <Spinner />
          <DnaRawDialog
            balance={balance}
            {...dnaRawTxParams}
            {...dnaRawTxDisclosure}
            onSendSuccess={({hash, url}) => {
              dnaRawTxDisclosure.onClose()
              setDnaSendResponse({hash, url})
              dnaSendSucceededDisclosure.onOpen()
            }}
            onSendError={({error, url}) => {
              dnaRawTxDisclosure.onClose()
              setDnaSendResponse({error, url})
              dnaSendFailedDisclosure.onOpen()
            }}
            onSendRawTxFailed={failToast}
            onCompleteSend={dismissDnaAppLink}
          />

          <DnaSendSucceededDialog
            {...dnaSendResponse}
            {...dnaSendSucceededDisclosure}
            onCompleteSend={() => {
              dismissDnaAppLink()
              dnaSendSucceededDisclosure.onClose()
            }}
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
            onOpenFailUrl={() => {
              dismissDnaAppLink()
              dnaSendFailedDisclosure.onClose()
            }}
          />
        </Box>
      </Page>
    </Layout>
  )
}
