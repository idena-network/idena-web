import {
  Center,
  Table,
  Tbody,
  Text,
  Thead,
  Tr,
  useDisclosure,
} from '@chakra-ui/react'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {useQueryClient} from 'react-query'
import {
  useApprovedBurntCoins,
  useProtoProfileDecoder,
} from '../../screens/ads/hooks'
import {Page, PageTitle} from '../../screens/app/components'
import {RoundedTh, Tooltip} from '../../shared/components/components'
import Layout from '../../shared/components/layout'
import {PageHeader, PageCloseButton} from '../../screens/ads/components'
import {AdOfferListItem, BurnDrawer} from '../../screens/ads/containers'
import {InfoIcon} from '../../shared/components/icons'
import {calculateTotalAdScore} from '../../screens/ads/utils'

export default function AdOfferList() {
  const {t} = useTranslation()

  const queryClient = useQueryClient()

  const {data: burntCoins, status: burntCoinsStatus} = useApprovedBurntCoins()

  const {decodeAdTarget} = useProtoProfileDecoder()

  const orderedBurntCoins = React.useMemo(
    () =>
      (burntCoins ?? [])
        .map(burn => ({
          ...burn,
          totalScore: calculateTotalAdScore({
            target: decodeAdTarget(burn?.target),
            burnAmount: burn?.amount,
          }),
        }))
        .sort((a, b) => b.totalScore - a.totalScore),
    [burntCoins, decodeAdTarget]
  )

  const isFetched = burntCoinsStatus === 'success'

  const isEmpty = isFetched && burntCoins.length === 0

  const [selectedAd, setSelectedAd] = React.useState({})

  const burnDisclosure = useDisclosure()
  const {
    onOpen: onOpenBurnDisclosure,
    onClose: onCloseBurnDisclosure,
  } = burnDisclosure

  const handlePreviewBurn = React.useCallback(
    ad => {
      setSelectedAd(ad)
      onOpenBurnDisclosure()
    },
    [onOpenBurnDisclosure]
  )

  const handleBurn = React.useCallback(() => {
    onCloseBurnDisclosure()
    queryClient.invalidateQueries(['bcn_burntCoins', []])
  }, [onCloseBurnDisclosure, queryClient])

  return (
    <Layout skipBanner>
      <Page>
        <PageHeader>
          <PageTitle mb={4}>{t('All offers')}</PageTitle>
          <PageCloseButton href="/adn/list" />
        </PageHeader>
        <Table>
          <Thead>
            <Tr>
              <RoundedTh isLeft>{t('Ad')}</RoundedTh>
              <RoundedTh>{t('Website')}</RoundedTh>
              <RoundedTh>
                <Text w="24">
                  {t('Targeting coefficient')}{' '}
                  <Tooltip label="Targeting coefficient increases total score if targeting parameters are set">
                    <InfoIcon cursor="help" flex={1} />
                  </Tooltip>
                </Text>
              </RoundedTh>
              <RoundedTh>{t('Burn')}</RoundedTh>
              <RoundedTh>
                <Text w="14">
                  {t('Total score')}{' '}
                  <Tooltip label="Total score = Burn * Coefficient">
                    <InfoIcon cursor="help" />
                  </Tooltip>
                </Text>
              </RoundedTh>
              <RoundedTh isRight />
            </Tr>
          </Thead>
          <Tbody>
            {isFetched &&
              orderedBurntCoins.map(burn => (
                <AdOfferListItem
                  key={burn.key}
                  burn={burn}
                  onBurn={handlePreviewBurn}
                />
              ))}
          </Tbody>
        </Table>

        {isEmpty && (
          <Center color="muted" mt="4" w="full">
            {t('No active offers')}
          </Center>
        )}

        <BurnDrawer ad={selectedAd} onBurn={handleBurn} {...burnDisclosure} />
      </Page>
    </Layout>
  )
}
