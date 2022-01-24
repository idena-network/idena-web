import React from 'react'
import {
  Box,
  Flex,
  Stack,
  Link,
  HStack,
  MenuDivider,
  MenuItem,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import dayjs from 'dayjs'
import {useTranslation} from 'react-i18next'
import {useRouter} from 'next/router'
import {useQuery} from 'react-query'
import {AdList, EmptyAdList, AdStatNumber} from '../../screens/ads/components'
import Layout from '../../shared/components/layout'
import {Page, PageTitle} from '../../screens/app/components'
import {SecondaryButton} from '../../shared/components/button'
import {toLocaleDna} from '../../shared/utils/utils'
import {
  AdBanner,
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
} from '../../screens/ads/containers'
import {useAdList} from '../../screens/ads/hooks'
import {AdStatus} from '../../screens/ads/types'
import {useSuccessToast} from '../../shared/hooks/use-toast'
import {Menu, VDivider} from '../../shared/components/components'
import IconLink from '../../shared/components/icon-link'
import {
  PlusSolidIcon,
  DeleteIcon,
  EditIcon,
} from '../../shared/components/icons'
import db from '../../shared/utils/db'
import {
  fetchVoting,
  mapVoting,
  viewVotingHref,
} from '../../screens/oracles/utils'
import {isApprovedAd, isReviewingAd} from '../../screens/ads/utils'
import {fetchBalance} from '../../shared/api/wallet'
import {useAuthState} from '../../shared/providers/auth-context'

export default function AdListPage() {
  const {t, i18n} = useTranslation()

  const router = useRouter()

  const {coinbase} = useAuthState()

  const {
    data: {balance},
  } = useQuery(['get-balance', coinbase], () => fetchBalance(coinbase), {
    initialData: {balance: 0, stake: 0},
    enabled: !!coinbase,
  })

  const toast = useSuccessToast()

  const [
    {
      ads,
      selectedAd,
      filter,
      totalSpent,
      isReady,
      isPublishing,
      isSendingToReview,
      isMining,
    },
    {filter: filterList, publishAd, removeAd, sendAdToReview, submitAd, cancel},
  ] = useAdList()

  const toDna = toLocaleDna(i18n.language)

  return (
    <Layout>
      <Page as={Stack} spacing={4} mt={14}>
        <PageTitle>{t('My Ads')}</PageTitle>
        <Stack isInline spacing={20}>
          <BlockAdStat label="My balance" w="2xs">
            <AdStatNumber fontSize="lg" isTruncated>
              {toDna(balance)}
            </AdStatNumber>
          </BlockAdStat>
          <BlockAdStat label="Total spent, 4hrs">
            <AdStatNumber fontSize="lg">{toDna(totalSpent)}</AdStatNumber>
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
              lastTx = dayjs(),
              status,
              votingAddress,
            }) => (
              <HStack key={id} spacing="5" align="flex-start">
                <Stack spacing={2} w="16">
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
                      {isApprovedAd({status}) && (
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
                              title: {
                                ...(await db.table('ads').get(id)),
                                ...mapVoting(
                                  await fetchVoting({
                                    contractHash: votingAddress,
                                  }).catch(() => ({}))
                                ),
                              }.status,
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
                  <Stack isInline spacing={60}>
                    <BlockAdStat label="Spent, 4hrs" value={toDna(spent)} />
                    <BlockAdStat
                      label="Total spent, DNA"
                      value={toDna(spent)}
                    />
                    <BlockAdStat
                      label="Last tx"
                      value={`${dayjs().diff(lastTx, 'ms')} ms ago`}
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
                      <InlineAdStat label="Competitors" value="0" />
                      <InlineAdStat
                        label="Max price"
                        value={toLocaleDna(i18n.language)(0)}
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
      </Page>
      <Box position="absolute" left={200} top={0} right={0} zIndex="banner">
        <AdBanner />
      </Box>
    </Layout>
  )
}
