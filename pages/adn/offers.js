import {Center, Table, Tbody, Thead, Tr} from '@chakra-ui/react'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {useBurntCoins, useProtoProfileDecoder} from '../../screens/ads/hooks'
import {Page, PageTitle} from '../../screens/app/components'
import {RoundedTh} from '../../shared/components/components'
import Layout from '../../shared/components/layout'
import {PageHeader, PageCloseButton} from '../../screens/ads/components'
import {AdOfferListItem} from '../../screens/ads/containers'

export default function AdOfferList() {
  const {t} = useTranslation()

  const {decodeAdBurnKey} = useProtoProfileDecoder()

  const {data: burntCoins, status: burntCoinsStatus} = useBurntCoins({
    select: data =>
      data?.map(({address, key, amount}) => ({
        address,
        key,
        ...decodeAdBurnKey(key),
        amount,
      })) ?? [],
    initialData: [],
    staleTime: 0,
    notifyOnChangeProps: 'tracked',
  })

  const isFetched = burntCoinsStatus === 'success'

  const isEmpty = isFetched && burntCoins.length === 0

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
              <RoundedTh>{t('Banner/author')}</RoundedTh>
              <RoundedTh>{t('Website')}</RoundedTh>
              <RoundedTh>{t('Target')}</RoundedTh>
              <RoundedTh>{t('Burn')}</RoundedTh>
            </Tr>
          </Thead>
          <Tbody>
            {isFetched &&
              burntCoins.map(burn => (
                <AdOfferListItem key={burn.key} burn={burn} />
              ))}
          </Tbody>
        </Table>

        {isEmpty && (
          <Center color="muted" mt="4" w="full">
            {t('No active offers')}
          </Center>
        )}
      </Page>
    </Layout>
  )
}
