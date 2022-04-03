import NextLink from 'next/link'
import {HStack, Link, Stack, Table, Td, Text, Thead, Tr} from '@chakra-ui/react'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {useFormatDna, useRotatingAds} from '../../screens/ads/hooks'
import {Page, PageTitle} from '../../screens/app/components'
import {Avatar, RoundedTh} from '../../shared/components/components'
import Layout from '../../shared/components/layout'
import {
  AdImage,
  PageHeader,
  PageCloseButton,
} from '../../screens/ads/components'

export default function AdOfferList() {
  const {t} = useTranslation()

  const ads = useRotatingAds()

  // TODO: check for all offerings
  // const burntCoins = useBurntCoins()

  const formatDna = useFormatDna()

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
              <RoundedTh>{t('Status')}</RoundedTh>
              <RoundedTh>{t('Burn')}</RoundedTh>
            </Tr>
          </Thead>
          {ads.filter(Boolean).map(ad => (
            <Tr key={ad.id} fontWeight={500}>
              <Td>
                <HStack>
                  <AdImage src={ad.thumb} boxSize="10" />
                  <Stack>
                    <Text lineHeight={4} isTruncated>
                      {ad.title}
                    </Text>
                    <HStack spacing={1}>
                      <Avatar
                        address={ad.author}
                        size={4}
                        borderWidth={1}
                        borderColor="brandGray.016"
                        rounded="sm"
                      />
                      <Text color="muted" fontSize="sm" fontWeight={500}>
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
              <Td>{t('Showing')}</Td>
              <Td>{formatDna(ad.amount ?? 0)}</Td>
            </Tr>
          ))}
        </Table>
      </Page>
    </Layout>
  )
}
