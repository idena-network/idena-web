import React from 'react'
import {Box, Flex, Stack, Link, HStack} from '@chakra-ui/react'
import NextLink from 'next/link'
import dayjs from 'dayjs'
import {useTranslation} from 'react-i18next'
import {
  AdList,
  AdEntry,
  NoAds,
  AdStatNumber,
} from '../../screens/ads/components'
import {useIdentity} from '../../shared/providers/identity-context'
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
  InlineAdGroup,
  InlineAdStat,
  PublishAdDrawer,
  ReviewAdDrawer,
  SmallInlineAdStat,
} from '../../screens/ads/containers'
import {useAdList} from '../../screens/ads/hooks'
import {AdStatus} from '../../screens/ads/types'
import {useSuccessToast} from '../../shared/hooks/use-toast'
import {
  HDivider,
  IconMenuItem,
  MenuDivider,
  VDivider,
} from '../../shared/components/components'
import IconLink from '../../shared/components/icon-link'
import {Menu} from '../../shared/components/menu'
import {PlusSolidIcon} from '../../shared/components/icons'

export default function AdListPage() {
  const {t, i18n} = useTranslation()

  const [{balance}] = useIdentity()

  const toast = useSuccessToast()

  const [
    {
      ads,
      selectedAd,
      filter: currentFilter,
      totalSpent,
      isReady,
      isPublishing,
      isSendingToReview,
      isMining,
    },
    {filter, selectAd, removeAd, sendAdToReview, submitAd, cancel},
  ] = useAdList()

  const toDna = toLocaleDna(i18n.language)

  React.useEffect(() => {
    console.log(currentFilter)
  }, [currentFilter])

  return (
    <Layout>
      <Page as={Stack} spacing={4} mt={0 ?? 24}>
        <PageTitle>My Ads</PageTitle>
        <Stack isInline spacing={20}>
          <BlockAdStat label="My balance">
            <AdStatNumber fontSize="lg">{toDna(balance)}</AdStatNumber>
          </BlockAdStat>
          <BlockAdStat label="Total spent, 4hrs">
            <AdStatNumber fontSize="lg">{toDna(totalSpent)}</AdStatNumber>
          </BlockAdStat>
        </Stack>
        <Flex align="center" justify="space-between" w="full">
          <AdStatusFilterButtonList
            currentStatus={currentFilter}
            onChangeStatus={filter}
          >
            <AdStatusFilterButton status={AdStatus.Active}>
              {t('Active')}
            </AdStatusFilterButton>
            <AdStatusFilterButton status={AdStatus.Draft}>
              {t('Drafts')}
            </AdStatusFilterButton>
            <AdStatusFilterButton status={AdStatus.Reviewing}>
              {t('On review')}
            </AdStatusFilterButton>
            <AdStatusFilterButton status={AdStatus.Rejected}>
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
              lang,
              age,
              os,
              stake,
              burnt: spent = 0,
              lastTx = dayjs(),
              // eslint-disable-next-line no-shadow
              status,
              contractHash,
              issuer,
            }) => (
              <AdEntry key={id}>
                <Stack isInline spacing={5}>
                  <Stack spacing={3} w={60}>
                    <Box position="relative">
                      <AdCoverImage ad={{cover}} alt={title} />
                      {status === AdStatus.Idle && (
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
                            <NextLink href={`/ads/edit?id=${id}`}>
                              <IconMenuItem icon="edit">Edit</IconMenuItem>
                            </NextLink>
                            <MenuDivider />
                            <IconMenuItem
                              icon="delete"
                              color="red.500"
                              onClick={() => removeAd(id)}
                            >
                              Delete
                            </IconMenuItem>
                          </Menu>
                        </Box>
                        {status === AdStatus.Approved && (
                          <SecondaryButton
                            onClick={() => {
                              selectAd(id)
                            }}
                          >
                            Publish
                          </SecondaryButton>
                        )}
                        {status === AdStatus.Active && (
                          <SecondaryButton
                            onClick={() => {
                              sendAdToReview(id)
                            }}
                          >
                            Review
                          </SecondaryButton>
                        )}
                        {status === AdStatus.Reviewing && (
                          <SecondaryButton
                            onClick={async () => {
                              toast('STATUS')
                              // toast(
                              //   {
                              //     ...(await createVotingDb(epoch?.epoch).get(
                              //       contractHash
                              //     )),
                              //     ...mapVoting(
                              //       await fetchVoting({
                              //         contractHash,
                              //         address: issuer,
                              //       }).catch(() => ({}))
                              //     ),
                              //   }.status
                              // )
                            }}
                          >
                            Check status
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
                    <Stack
                      isInline
                      spacing={4}
                      bg="gray.50"
                      p={2}
                      my={5}
                      rounded="md"
                    >
                      <Stack flex={1} isInline px={2} pt={1}>
                        <InlineAdGroup spacing="3/2" labelWidth={55} flex={1}>
                          <SmallInlineAdStat
                            label="Location"
                            value={location}
                          />
                          <SmallInlineAdStat label="Language" value={lang} />
                          <SmallInlineAdStat label="Stake" value={stake} />
                        </InlineAdGroup>
                        <InlineAdGroup labelWidth={24} flex={1}>
                          <SmallInlineAdStat label="Age" value={age} />
                          <SmallInlineAdStat label="OS" value={os} />
                        </InlineAdGroup>
                      </Stack>
                      <VDivider minH={68} h="full" />
                      <Stack flex={1} justify="center">
                        <InlineAdStat label="Competitors" value={10} />
                        <InlineAdStat
                          label="Max price"
                          value={toLocaleDna(i18n.language)(0.000000000123)}
                        />
                      </Stack>
                    </Stack>
                  </Box>
                </Stack>

                {ads.length > 1 && <HDivider />}
              </AdEntry>
            )
          )}
        </AdList>
        {isReady && ads.length === 0 && <NoAds />}

        <PublishAdDrawer
          isOpen={isPublishing}
          onClose={cancel}
          ad={selectedAd}
        />

        <ReviewAdDrawer
          isOpen={isSendingToReview}
          isMining={isMining}
          ad={selectedAd}
          onSend={submitAd}
          onClose={cancel}
        />
      </Page>

      {/* <Box position="fixed" top={4} left={48} w="full">
        <AdBanner />
      </Box> */}
    </Layout>
  )
}
