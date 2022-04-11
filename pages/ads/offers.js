import NextLink from 'next/link'
import {
  Button,
  Center,
  HStack,
  Link,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Thead,
  Tr,
} from '@chakra-ui/react'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {useQueries} from 'react-query'
import {ChevronRightIcon} from '@chakra-ui/icons'
import {
  useBurntCoins,
  useFormatDna,
  useProtoProfileDecoder,
  useRpcFetcher,
} from '../../screens/ads/hooks'
import {Page, PageTitle} from '../../screens/app/components'
import {
  Avatar,
  RoundedTh,
  Skeleton,
  Tooltip,
} from '../../shared/components/components'
import Layout from '../../shared/components/layout'
import {
  AdImage,
  PageHeader,
  PageCloseButton,
} from '../../screens/ads/components'
import {
  InlineAdStatGroup,
  SmallInlineAdStat,
} from '../../screens/ads/containers'
import {pick} from '../../shared/utils/utils'
import {adImageThumbSrc} from '../../screens/ads/utils'

export default function AdOfferList() {
  const {t} = useTranslation()

  const rpcFetcher = useRpcFetcher()

  const {decodeAdBurnKey, decodeAd, decodeAdTarget} = useProtoProfileDecoder()

  const {data: burntCoins, status: burntCoinsStatus} = useBurntCoins({
    select: data =>
      data?.map(({address, key, amount}) => ({
        address,
        ...decodeAdBurnKey(key),
        amount,
      })) ?? [],
    initialData: [],
    staleTime: 0,
    notifyOnChangeProps: 'tracked',
  })

  const adQueries = useQueries(
    burntCoins.map(({cid, target, address, ...burnRecord}) => ({
      queryKey: ['ipfs_get', [cid]],
      queryFn: params => rpcFetcher(params).catch(() => ''),
      enabled: Boolean(cid),
      staleTime: Infinity,
      select: data => ({
        ...decodeAd(data),
        ...decodeAdTarget(target),
        cid,
        author: address,
        ...burnRecord,
      }),
    }))
  )

  const formatDna = useFormatDna()

  const ads = adQueries.map(({data}) => data)

  const isFetched =
    burntCoinsStatus === 'success' &&
    adQueries.every(adQuery => adQuery.isFetched)

  const isEmpty = isFetched && ads.length === 0

  const isLoading =
    burntCoinsStatus === 'loading' ||
    adQueries.some(adQuery => adQuery.status === 'loading')

  return (
    <Layout skipBanner>
      <Page>
        <PageHeader>
          <PageTitle mb={4}>{t('All offers')}</PageTitle>
          <PageCloseButton href="/ads/list" />
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
              ads.map(ad => (
                <Tr key={ad.cid} fontWeight={500}>
                  <Td>
                    <HStack>
                      <AdImage src={adImageThumbSrc(ad)} boxSize="10" />
                      <Stack spacing="1.5">
                        <Text lineHeight={4} isTruncated>
                          {ad.title}
                        </Text>
                        <HStack spacing={1}>
                          <Avatar
                            address={ad.author}
                            boxSize="4"
                            borderWidth={1}
                            borderColor="brandGray.016"
                            borderRadius={['mobile', 'sm']}
                          />
                          <Text
                            color="muted"
                            fontSize="sm"
                            fontWeight={500}
                            lineHeight="shorter"
                          >
                            {ad.author}
                          </Text>
                        </HStack>
                      </Stack>
                    </HStack>
                  </Td>
                  <Td>
                    <NextLink href={String(ad.url)} passHref>
                      <Link target="_blank" color="blue.500">
                        {ad.url}
                      </Link>
                    </NextLink>
                  </Td>
                  <Td>
                    {Object.values(
                      pick(ad, ['language', 'os', 'age', 'stake'])
                    ).some(Boolean) ? (
                      <>
                        {t('Set')}{' '}
                        <Tooltip
                          label={
                            <InlineAdStatGroup labelWidth="16">
                              <SmallInlineAdStat
                                label={t('Language')}
                                value={ad.language || 'Any'}
                              />
                              <SmallInlineAdStat
                                label={t('OS')}
                                value={ad.os || 'Any'}
                              />
                              <SmallInlineAdStat
                                label={t('Age')}
                                value={ad.age ?? 'Any'}
                              />
                              <SmallInlineAdStat
                                label={t('Stake')}
                                value={ad.stake ?? 'Any'}
                              />
                            </InlineAdStatGroup>
                          }
                          placement="right-start"
                          arrowSize={8}
                          offset={[-8, 6]}
                        >
                          <Button
                            variant="link"
                            rightIcon={<ChevronRightIcon />}
                            iconSpacing="0"
                            color="blue.500"
                            cursor="pointer"
                            _hover={{
                              textDecoration: 'none',
                            }}
                          >
                            {t('{{count}} targets', {
                              count: Object.values(
                                pick(ad, ['language', 'os', 'age', 'stake'])
                              ).filter(Boolean).length,
                            })}
                          </Button>
                        </Tooltip>
                      </>
                    ) : (
                      t('Not set')
                    )}
                  </Td>
                  <Td>{formatDna(ad.amount)}</Td>
                </Tr>
              ))}
          </Tbody>
        </Table>

        {isLoading && (
          <Stack spacing="4" w="full" mt="4">
            {[...Array(3)].map((_, idx) => (
              <Skeleton key={idx} h="10" />
            ))}
          </Stack>
        )}

        {isEmpty && (
          <Center color="muted" mt="4" w="full">
            {t('No active offers')}
          </Center>
        )}
      </Page>
    </Layout>
  )
}
