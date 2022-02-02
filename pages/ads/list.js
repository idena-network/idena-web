import React from 'react'
import {
  Box,
  Flex,
  Stack,
  Link,
  HStack,
  MenuDivider,
  MenuItem,
  useDisclosure,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import dayjs from 'dayjs'
import {useTranslation} from 'react-i18next'
import {useRouter} from 'next/router'
import relativeTime from 'dayjs/plugin/relativeTime'
import {AdList, EmptyAdList, AdStatNumber} from '../../screens/ads/components'
import Layout from '../../shared/components/layout'
import {Page, PageTitle} from '../../screens/app/components'
import {SecondaryButton} from '../../shared/components/button'
import {callRpc, toLocaleDna} from '../../shared/utils/utils'
import {
  AdCoverImage,
  AdOverlayStatus,
  AdStatusFilterButton,
  AdStatusFilterButtonList,
  AdStatusText,
  BlockAdStat,
  InlineAdStatGroup,
  InlineAdStat,
  PublishAdDrawer,
  ReviewAdDrawer,
  SmallInlineAdStat,
  BurnDrawer,
} from '../../screens/ads/containers'
import {
  useAdList,
  useBalance,
  useRecentBurnAmount,
} from '../../screens/ads/hooks'
import {AdStatus} from '../../screens/ads/types'
import {useSuccessToast} from '../../shared/hooks/use-toast'
import {Menu, VDivider} from '../../shared/components/components'
import IconLink from '../../shared/components/icon-link'
import {
  PlusSolidIcon,
  DeleteIcon,
  EditIcon,
} from '../../shared/components/icons'
import {viewVotingHref} from '../../screens/oracles/utils'
import {
  buildAdKeyHex,
  isApprovedAd,
  isReviewingAd,
  fetchVoting,
} from '../../screens/ads/utils'
import {useAuthState} from '../../shared/providers/auth-context'

dayjs.extend(relativeTime)

export default function AdListPage() {
  const {t, i18n} = useTranslation()

  const router = useRouter()

  const {coinbase} = useAuthState()

  const balance = useBalance(coinbase)

  const toast = useSuccessToast()

  const [
    {
      ads,
      selectedAd,
      filter,
      isReady,
      isPublishing,
      isSendingToReview,
      isMining,
    },
    {
      filter: filterList,
      selectAd,
      removeAd,
      publishAd,
      sendAdToReview,
      submitAd,
      cancel,
    },
  ] = useAdList()

  const burnDrawerDisclosure = useDisclosure()

  const lastBurnAmount = 0 // useRecentBurnAmount(dayjs().subtract(4, 'h'))

  const toDna = toLocaleDna(i18n.language)

  return (
    <Layout>
      <Page as={Stack} spacing={4}>
        <PageTitle>{t('My Ads')}</PageTitle>
        <Stack isInline spacing={20}>
          <BlockAdStat label="My balance" w="2xs">
            <AdStatNumber fontSize="lg" isTruncated>
              {toDna(balance)}
            </AdStatNumber>
          </BlockAdStat>
          <BlockAdStat label="Total spent, 4hrs">
            <AdStatNumber fontSize="lg">{toDna(lastBurnAmount)}</AdStatNumber>
          </BlockAdStat>
        </Stack>
        <Flex align="center" justify="space-between" w="full">
          <AdStatusFilterButtonList value={filter} onChange={filterList}>
            <AdStatusFilterButton value={AdStatus.Active}>
              {t('Active')}
            </AdStatusFilterButton>
            <AdStatusFilterButton value={AdStatus.Draft}>
              {t('Drafts')}
            </AdStatusFilterButton>
            <AdStatusFilterButton value={AdStatus.Reviewing}>
              {t('On review')}
            </AdStatusFilterButton>
            <AdStatusFilterButton value={AdStatus.Rejected}>
              {t('Rejected')}
            </AdStatusFilterButton>
          </AdStatusFilterButtonList>
          <HStack spacing={1} align="center">
            <VDivider />
            <IconLink icon={<PlusSolidIcon boxSize={5} />} href="/ads/new">
              New banner
            </IconLink>
          </HStack>
        </Flex>
        <AdList py={4} spacing={4} alignSelf="stretch">
          {ads.map(
            ({
              id,
              cover,
              title,
              location,
              language,
              age,
              os,
              stake,
              burnt: spent = 0,
              lastTxDate,
              status,
              votingAddress,
              isPublished,
              competitorCount,
              maxCompetitorPrice,
            }) => (
              <HStack key={id} spacing="5" align="flex-start">
                <Stack spacing={2} w="16" flexShrink={0}>
                  <Box position="relative">
                    <AdCoverImage ad={{cover}} />
                    {isApprovedAd({status}) && (
                      <AdOverlayStatus status={status} />
                    )}
                  </Box>
                  <AdStatusText status={status} />
                </Stack>
                <Box flex={1}>
                  <Flex justify="space-between">
                    <NextLink href={`/ads/edit?id=${id}`} passHref>
                      <Link
                        fontSize="mdx"
                        fontWeight={500}
                        _hover={{color: 'muted'}}
                      >
                        {title}
                      </Link>
                    </NextLink>
                    <Stack isInline align="center">
                      <Box>
                        <Menu>
                          <MenuItem
                            icon={<EditIcon boxSize={5} color="blue.500" />}
                            onClick={() => {
                              router.push(`/ads/edit?id=${id}`)
                            }}
                          >
                            {t('Edit')}
                          </MenuItem>
                          <MenuDivider />
                          <MenuItem
                            icon={<DeleteIcon boxSize={5} />}
                            color="red.500"
                            onClick={() => {
                              removeAd(id)
                            }}
                          >
                            {t('Delete')}
                          </MenuItem>
                        </Menu>
                      </Box>
                      {isPublished && isApprovedAd({status}) && (
                        <SecondaryButton
                          onClick={() => {
                            selectAd(id)
                            burnDrawerDisclosure.onOpen()
                          }}
                        >
                          {t('Burn')}
                        </SecondaryButton>
                      )}
                      {!isPublished && isApprovedAd({status}) && (
                        <SecondaryButton
                          onClick={() => {
                            publishAd(id)
                          }}
                        >
                          {t('Publish')}
                        </SecondaryButton>
                      )}
                      {status === AdStatus.Draft && (
                        <SecondaryButton
                          onClick={() => {
                            sendAdToReview(id)
                          }}
                        >
                          {t('Review')}
                        </SecondaryButton>
                      )}
                      {isReviewingAd({status}) && (
                        <SecondaryButton
                          onClick={async () => {
                            toast({
                              title: (await fetchVoting(votingAddress)).status,
                              onAction: () => {
                                router.push(viewVotingHref(votingAddress))
                              },
                              actionContent: t('View details'),
                            })
                          }}
                        >
                          {t('Check status')}
                        </SecondaryButton>
                      )}
                    </Stack>
                  </Flex>
                  <Stack isInline spacing={15}>
                    {/* <BlockAdStat label="Spent, 4hrs" value={toDna(spent)} /> */}
                    <BlockAdStat
                      label="Ad key"
                      value="Click to view ad key"
                      onClick={async () => {
                        toast(await buildAdKeyHex({language, age, stake, os}))
                      }}
                    />
                    <BlockAdStat
                      label="Total spent, DNA"
                      value={toDna(spent)}
                    />
                    <BlockAdStat
                      label="Last tx"
                      value={
                        lastTxDate
                          ? dayjs.unix(lastTxDate).fromNow()
                          : 'No burn yet'
                      }
                    />
                  </Stack>
                  <HStack spacing={4} bg="gray.50" p={2} mt="5" rounded="md">
                    <Stack flex={1} isInline px={2} pt={1}>
                      <InlineAdStatGroup spacing="1.5" labelWidth={14} flex={1}>
                        <SmallInlineAdStat label="Location" value={location} />
                        <SmallInlineAdStat label="Language" value={language} />
                        <SmallInlineAdStat label="Stake" value={stake} />
                      </InlineAdStatGroup>
                      <InlineAdStatGroup spacing="1.5" labelWidth={6} flex={1}>
                        <SmallInlineAdStat label="Age" value={age} />
                        <SmallInlineAdStat label="OS" value={os} />
                      </InlineAdStatGroup>
                    </Stack>
                    <VDivider minH={68} h="full" />
                    <Stack flex={1} justify="center">
                      <InlineAdStat
                        label="Competitors"
                        value={competitorCount ?? '--'}
                      />
                      <InlineAdStat
                        label="Max price"
                        value={
                          maxCompetitorPrice
                            ? toLocaleDna(i18n.language)(maxCompetitorPrice)
                            : '--'
                        }
                      />
                    </Stack>
                  </HStack>
                </Box>
              </HStack>
            )
          )}
        </AdList>

        {isReady && ads.length === 0 && <EmptyAdList />}

        <ReviewAdDrawer
          ad={selectedAd}
          isOpen={isSendingToReview}
          isMining={isMining}
          onSubmit={amount => submitAd(amount)}
          onCancel={cancel}
        />

        <PublishAdDrawer
          ad={selectedAd}
          isOpen={isPublishing}
          isMining={isMining}
          onSubmit={submitAd}
          onCancel={cancel}
        />

        <BurnDrawer
          {...burnDrawerDisclosure}
          ad={selectedAd}
          onSubmit={async amount => {
            const {language, age, stake, os} = selectedAd

            await callRpc('dna_burn', {
              from: coinbase,
              amount,
              key: await buildAdKeyHex({
                language,
                age,
                stake,
                os,
              }),
            })

            burnDrawerDisclosure.onClose()

            toast('🔥🔥🔥')
          }}
        />
      </Page>
    </Layout>
  )
}
