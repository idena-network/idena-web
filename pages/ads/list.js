import React from 'react'
import {Flex, Stack, HStack, useDisclosure} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {AdList, EmptyAdList, AdStatNumber} from '../../screens/ads/components'
import Layout from '../../shared/components/layout'
import {Page, PageTitle} from '../../screens/app/components'
import {
  BlockAdStat,
  AdListItem,
  ReviewAdDrawer,
  PublishAdDrawer,
  BurnDrawer,
} from '../../screens/ads/containers'
import {
  useBalance,
  useCoinbase,
  useDraftAds,
  useFormatDna,
} from '../../screens/ads/hooks'
import {AdStatus} from '../../screens/ads/types'
import {
  Debug,
  FilterButton,
  FilterButtonList,
  VDivider,
} from '../../shared/components/components'
import IconLink from '../../shared/components/icon-link'
import {EditIcon, PlusSolidIcon} from '../../shared/components/icons'
import db from '../../shared/utils/db'

export default function AdListPage() {
  const {t} = useTranslation()

  const formatDna = useFormatDna()

  const reviewDisclosure = useDisclosure()
  const publishDisclosure = useDisclosure()
  const burnDisclosure = useDisclosure()

  const coinbase = useCoinbase()

  const balance = useBalance(coinbase)

  const [filter, setFilter] = React.useState(() =>
    typeof window === 'undefined'
      ? AdStatus.Approved
      : localStorage?.getItem('adListFilter') ?? AdStatus.Approved
  )

  React.useEffect(() => {
    localStorage.setItem('adListFilter', filter)
  }, [filter])

  const {data: profileAds, status} = {data: []} // useProfileAds()

  const {
    data: draftAds,
    status: draftAdsStatus,
    refetch: refetchDraftAds,
  } = useDraftAds()

  const ads = [...profileAds, ...draftAds].filter(ad => ad.status === filter)

  const isLoaded = status === 'success' || draftAdsStatus === 'success'

  const [selectedAd, setSelectedAd] = React.useState()

  const handlePublish = React.useCallback(async () => {
    try {
      await db.table('ads').update(selectedAd.id, {status: AdStatus.Approved})

      refetchDraftAds()
    } catch {
      console.error('Error updating persisted ads', {id: selectedAd?.id})
    } finally {
      publishDisclosure.onClose()
    }
  }, [publishDisclosure, refetchDraftAds, selectedAd])

  const handleReview = React.useCallback(
    async ({cid, contract}) => {
      try {
        await db.table('ads').update(selectedAd.id, {
          status: AdStatus.Reviewing,
          cid,
          contract,
        })

        refetchDraftAds()
      } catch {
        console.error('Error updating persisted ads', {id: selectedAd?.id})
      } finally {
        reviewDisclosure.onClose()
      }
    },
    [refetchDraftAds, reviewDisclosure, selectedAd]
  )

  const handleBurn = React.useCallback(() => {
    refetchDraftAds()
    burnDisclosure.onClose()
  }, [burnDisclosure, refetchDraftAds])

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

        <FilterButtonList value={filter} onChange={setFilter} w="full">
          <Flex align="center" justify="space-between" w="full">
            <HStack>
              <FilterButton value={AdStatus.Approved}>
                {t('Approved')}
              </FilterButton>
              <FilterButton value={AdStatus.Reviewing}>
                {t('On review')}
              </FilterButton>
              <FilterButton value={AdStatus.Rejected}>
                {t('Rejected')}
              </FilterButton>
              <VDivider />
              <FilterButton value={AdStatus.Draft}>
                <HStack>
                  <EditIcon boxSize="5" />
                  <span>{t('Drafts')}</span>
                </HStack>
              </FilterButton>
            </HStack>

            <HStack spacing={1} align="center">
              {/* <VDivider /> */}
              <IconLink icon={<PlusSolidIcon boxSize={5} />} href="/ads/new">
                {t('New ad')}
              </IconLink>
            </HStack>
          </Flex>
        </FilterButtonList>

        {isLoaded && ads.length > 0 ? (
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
                onRemove={refetchDraftAds}
              />
            ))}
          </AdList>
        ) : (
          <EmptyAdList />
        )}

        {selectedAd && (
          <ReviewAdDrawer
            ad={selectedAd}
            onSendToReview={handleReview}
            {...reviewDisclosure}
          />
        )}

        {selectedAd && (
          <PublishAdDrawer
            ad={selectedAd}
            onPublish={handlePublish}
            {...publishDisclosure}
          />
        )}

        {selectedAd && (
          <BurnDrawer ad={selectedAd} onBurn={handleBurn} {...burnDisclosure} />
        )}

        <Debug>{ads}</Debug>
      </Page>
    </Layout>
  )
}
