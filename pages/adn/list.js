import React from 'react'
import {Flex, Stack, HStack, useDisclosure, Box} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useRouter} from 'next/router'
import {useQueryClient} from 'react-query'
import {AdList, EmptyAdList, AdStatNumber} from '../../screens/ads/components'
import Layout from '../../shared/components/layout'
import {Page, PageTitle} from '../../screens/app/components'
import {
  BlockAdStat,
  AdListItem,
  ReviewAdDrawer,
  PublishAdDrawer,
  BurnDrawer,
  AdPreview,
  AdDebug,
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
  Drawer,
  DrawerBody,
  FilterButton,
  FilterButtonList,
  Skeleton,
  VDivider,
} from '../../shared/components/components'
import IconLink from '../../shared/components/icon-link'
import {PlusSolidIcon, RefreshIcon} from '../../shared/components/icons'
import db from '../../shared/utils/db'
import {IconButton, SecondaryButton} from '../../shared/components/button'
import {useClosableToast} from '../../shared/hooks/use-toast'

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
    refetch: refetchProfileAds,
    status: profileAdsStatus,
  } = useProfileAds()

  const {
    data: persistedAds,
    refetch: refetchPersistedAds,
    status: persistedAdsStatus,
  } = usePersistedAds()

  const loadingStatus =
    profileAdsStatus === 'loading' || persistedAdsStatus === 'loading'
      ? 'loading'
      : 'done'

  const ads = [
    ...profileAds,
    ...(persistedAds?.filter(
      a => profileAds.findIndex(b => a?.cid === b?.cid) < 0
    ) ?? []),
  ].filter(ad => ad?.status === filter)

  const [selectedAd, setSelectedAd] = React.useState()

  const refetchAds = React.useCallback(() => {
    refetchProfileAds()
    refetchPersistedAds()
  }, [refetchPersistedAds, refetchProfileAds])

  const {toast, close: closeToast} = useClosableToast()

  const handlePublish = React.useCallback(async () => {
    try {
      await db.table('ads').update(selectedAd.id, {
        status: AdStatus.Published,
      })

      refetchAds()

      toast({
        title: t('Ad campaign is successfully created'),
        actionContent: t(`View 'Campaigns'`),
        onAction: () => {
          setFilter(AdStatus.Published)
          closeToast()
        },
      })
    } catch {
      console.error('Error updating persisted ads', {id: selectedAd?.id})
    } finally {
      publishDisclosure.onClose()
    }
  }, [closeToast, publishDisclosure, refetchAds, selectedAd, t, toast])

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
          title: t('Ad has been sent to oracles review'),
          actionContent: t(`View 'On review'`),
          onAction: () => {
            setFilter(AdStatus.Reviewing)
            closeToast()
          },
        })
      } catch {
        console.error('Error updating persisted ads', {id: selectedAd?.id})
      } finally {
        reviewDisclosure.onClose()
      }
    },
    [closeToast, refetchAds, reviewDisclosure, selectedAd, t, toast]
  )

  const queryClient = useQueryClient()

  const handleBurn = React.useCallback(() => {
    burnDisclosure.onClose()
    queryClient.invalidateQueries(['bcn_burntCoins', []])
  }, [burnDisclosure, queryClient])

  const {query, replace} = useRouter()

  React.useEffect(() => {
    if (query.from === 'new' && query.save) {
      toast({
        title: t('Ad has been saved to drafts'),
        actionContent: t(`View 'Drafts'`),
        onAction: () => {
          setFilter(AdStatus.Draft)
          closeToast()
          replace('/adn/list')
        },
      })
    }
  }, [closeToast, query, replace, t, toast])

  const handleDeploy = React.useCallback(
    ({storeToIpfsData, estimateDeployData}) => {
      db.table('ads').update(selectedAd?.id, {
        status: AdStatus.Reviewing,
        cid: storeToIpfsData?.cid,
        contract: estimateDeployData?.receipt?.contract,
      })
      refetchPersistedAds()
    },
    [refetchPersistedAds, selectedAd]
  )

  const previewAdDisclosure = useDisclosure()

  const devToolsDisclosure = useDisclosure()

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
                {t('Campaigns')}
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
              <IconLink icon={<PlusSolidIcon boxSize={5} />} href="/adn/new">
                {t('New ad')}
              </IconLink>
            </HStack>
          </Flex>
        </FilterButtonList>

        {loadingStatus === 'done' && (
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
                onPreview={() => {
                  setSelectedAd(ad)
                  previewAdDisclosure.onOpen()
                }}
              />
            ))}
          </AdList>
        )}

        {loadingStatus === 'done' && ads.length === 0 && <EmptyAdList />}

        {selectedAd && (
          <ReviewAdDrawer
            ad={selectedAd}
            onSendToReview={handleReview}
            onDeploy={handleDeploy}
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

        {selectedAd && <AdPreview ad={selectedAd} {...previewAdDisclosure} />}

        {typeof window !== 'undefined' &&
          window.location.hostname.includes('localhost') && (
            <>
              <Box position="absolute" bottom="10" right="10">
                <SecondaryButton onClick={devToolsDisclosure.onOpen}>
                  Debug ads
                </SecondaryButton>
              </Box>

              <Drawer title="Debug ads" size="xl" {...devToolsDisclosure}>
                <DrawerBody>
                  <Stack spacing="10">
                    <Box>
                      <h4>Current ads</h4>
                      <Debug>{ads}</Debug>
                    </Box>
                    <Box>
                      <h4>Decoders</h4>
                      <AdDebug />
                    </Box>
                  </Stack>
                </DrawerBody>
              </Drawer>
            </>
          )}
      </Page>
    </Layout>
  )
}
