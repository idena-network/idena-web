import React from 'react'
import {Flex, Stack, HStack, useDisclosure} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useRouter} from 'next/router'
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
  useFormatDna,
  usePersistedAds,
  useProfileAds,
} from '../../screens/ads/hooks'
import {AdStatus} from '../../screens/ads/types'
import {
  Debug,
  FilterButton,
  FilterButtonList,
  Skeleton,
  VDivider,
} from '../../shared/components/components'
import IconLink from '../../shared/components/icon-link'
import {PlusSolidIcon, RefreshIcon} from '../../shared/components/icons'
import db from '../../shared/utils/db'
import {IconButton} from '../../shared/components/button'
import {useSuccessToast} from '../../shared/hooks/use-toast'

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

  const {
    data: profileAds,
    status: profileAdsStatus,
    refetch: refetchProfileAds,
  } = useProfileAds()

  const {
    data: persistedAds,
    status: persistedAdsStatus,
    refetch: refetchPersistedAds,
  } = usePersistedAds()

  const ads = [
    ...profileAds,
    ...persistedAds?.filter(
      a => profileAds.findIndex(b => a?.cid === b?.cid) === -1
    ),
  ].filter(ad => ad?.status === filter)

  const isLoaded =
    profileAdsStatus === 'success' || persistedAdsStatus === 'success'

  const [selectedAd, setSelectedAd] = React.useState()

  const refetchAds = React.useCallback(() => {
    refetchProfileAds()
    refetchPersistedAds()
  }, [refetchPersistedAds, refetchProfileAds])

  const toast = useSuccessToast()

  const handlePublish = React.useCallback(async () => {
    try {
      await db.table('ads').update(selectedAd.id, {
        status: AdStatus.Approved,
      })

      refetchAds()

      toast({
        title: t('Ad has been published successfully'),
        actionContent: t('View published ads'),
        onAction: () => {
          setFilter(AdStatus.Published)
        },
      })
    } catch {
      console.error('Error updating persisted ads', {id: selectedAd?.id})
    } finally {
      publishDisclosure.onClose()
    }
  }, [publishDisclosure, refetchAds, selectedAd, t, toast])

  const handleReview = React.useCallback(
    async ({cid, contract}) => {
      try {
        await db.table('ads').update(selectedAd.id, {
          status: AdStatus.Reviewing,
          cid,
          contract,
        })

        refetchAds()

        toast({
          title: t('Ad has been sent to review successfully'),
          actionContent: t('View reviewing ads'),
          onAction: () => {
            setFilter(AdStatus.Reviewing)
          },
        })
      } catch {
        console.error('Error updating persisted ads', {id: selectedAd?.id})
      } finally {
        reviewDisclosure.onClose()
      }
    },
    [refetchAds, reviewDisclosure, selectedAd, t, toast]
  )

  const handleBurn = React.useCallback(() => {
    burnDisclosure.onClose()
    refetchAds()
  }, [burnDisclosure, refetchAds])

  const {query, replace} = useRouter()

  React.useEffect(() => {
    if (query.from === 'new' && query.save) {
      toast({
        title: t('Ad has been saved to drafts'),
        actionContent: t('View drafts'),
        onAction: () => {
          setFilter(AdStatus.Draft)
          replace('/ads/list')
        },
      })
    }
  }, [query, replace, t, toast])

  return (
    <Layout>
      <Page as={Stack} spacing={4}>
        <PageTitle>{t('My Ads')}</PageTitle>

        <Stack isInline spacing={20}>
          <BlockAdStat label="My balance" w="2xs">
            <Skeleton isLoaded={Boolean(balance)}>
              <AdStatNumber fontSize="lg" isTruncated>
                {formatDna(balance)}
              </AdStatNumber>
            </Skeleton>
          </BlockAdStat>
        </Stack>

        <FilterButtonList value={filter} onChange={setFilter} w="full">
          <Flex align="center" justify="space-between" w="full">
            <HStack>
              <FilterButton value={AdStatus.Published}>
                {t('Published')}
              </FilterButton>
              <VDivider />
              <FilterButton value={AdStatus.Draft}>{t('Drafts')}</FilterButton>
              <FilterButton value={AdStatus.Reviewing}>
                {t('On review')}
              </FilterButton>
              <FilterButton value={AdStatus.Approved}>
                {t('Approved')}
              </FilterButton>
              <FilterButton value={AdStatus.Rejected}>
                {t('Rejected')}
              </FilterButton>
            </HStack>

            <HStack spacing={1} align="center">
              <IconButton
                icon={<RefreshIcon boxSize={5} />}
                onClick={refetchAds}
              >
                {t('Refresh')}
              </IconButton>
              <VDivider />
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
                key={`${ad.cid}!!${ad.id}`}
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
                onRemove={refetchPersistedAds}
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
