import React from 'react'
import {Box, Flex, Stack, HStack, useDisclosure} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {AdList, EmptyAdList, AdStatNumber} from '../../screens/ads/components'
import Layout from '../../shared/components/layout'
import {Page, PageTitle} from '../../screens/app/components'
import {byId} from '../../shared/utils/utils'
import {
  BlockAdStat,
  AdListItem,
  ReviewAdDrawer,
  PublishAdDrawer,
  BurnDrawer,
} from '../../screens/ads/containers'
import {
  useAds,
  useBalance,
  useDnaFormatter,
  usePersistedAds,
} from '../../screens/ads/hooks'
import {AdStatus} from '../../screens/ads/types'
import {
  Debug,
  FilterButton,
  FilterButtonList,
  VDivider,
} from '../../shared/components/components'
import IconLink from '../../shared/components/icon-link'
import {PlusSolidIcon} from '../../shared/components/icons'
import {filterAdsByStatus} from '../../screens/ads/utils'
import {useAuthState} from '../../shared/providers/auth-context'

export default function AdListPage() {
  const {t} = useTranslation()

  const {format: formatDna} = useDnaFormatter()

  const reviewDisclosure = useDisclosure()
  const publishDisclosure = useDisclosure()
  const burnDisclosure = useDisclosure()

  const {coinbase} = useAuthState()

  const balance = useBalance(coinbase)

  const [filter, setFilter] = React.useState(() =>
    typeof window === 'undefined'
      ? AdStatus.Active
      : localStorage?.getItem('adListFilter') ?? AdStatus.Active
  )

  React.useEffect(() => {
    localStorage.setItem('adListFilter', filter)
  }, [filter])

  const {data: knownAds, status} = useAds()

  const {data: persistedAds} = usePersistedAds()

  const drafts =
    persistedAds?.filter(ad => !knownAds.some(byId({id: ad?.id}))) ?? []

  const ads = filterAdsByStatus([...knownAds, ...drafts], filter)

  const [selectedAd, setSelectedAd] = React.useState({})

  return (
    <Layout>
      <Page as={Stack} spacing={4}>
        <PageTitle>{t('My Ads')}</PageTitle>

        <Stack isInline spacing={20}>
          <BlockAdStat label="My balance" w="2xs">
            <AdStatNumber fontSize="lg" isTruncated>
              {formatDna(balance)}
            </AdStatNumber>
          </BlockAdStat>
        </Stack>

        <Flex align="center" justify="space-between" w="full">
          <FilterButtonList value={filter} onChange={setFilter}>
            <FilterButton value={AdStatus.Active}>{t('Active')}</FilterButton>
            <FilterButton value={AdStatus.Draft}>{t('Drafts')}</FilterButton>
            <FilterButton value={AdStatus.Reviewing}>
              {t('On review')}
            </FilterButton>
            <FilterButton value={AdStatus.Rejected}>
              {t('Rejected')}
            </FilterButton>
          </FilterButtonList>
          <HStack spacing={1} align="center">
            <VDivider />
            <IconLink icon={<PlusSolidIcon boxSize={5} />} href="/ads/new">
              {t('New banner')}
            </IconLink>
          </HStack>
        </Flex>

        {status === 'ready' && ads.length > 0 ? (
          <AdList py={4} spacing={4} alignSelf="stretch">
            {ads.map(ad => (
              <AdListItem
                key={ad.id}
                ad={ad}
                onReview={() => {
                  setSelectedAd(ad)
                  reviewDisclosure.onOpen()
                }}
                onPublish={() => {
                  setSelectedAd(ad)
                  publishDisclosure.onOpen()
                }}
                onBurn={() => {
                  setSelectedAd(ad)
                  burnDisclosure.onOpen()
                }}
              />
            ))}
          </AdList>
        ) : (
          <EmptyAdList />
        )}

        <ReviewAdDrawer ad={selectedAd} {...reviewDisclosure} />
        <PublishAdDrawer ad={selectedAd} {...publishDisclosure} />
        <BurnDrawer ad={selectedAd} {...burnDisclosure} />

        <Box>
          <Debug>{ads}</Debug>
        </Box>
      </Page>
    </Layout>
  )
}
