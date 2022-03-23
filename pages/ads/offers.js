import NextLink from 'next/link'
import {HStack, Link, Stack, Table, Td, Text, Thead, Tr} from '@chakra-ui/react'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {PlainAdCoverImage} from '../../screens/ads/containers'
import {useRotatingAdList, useRpc} from '../../screens/ads/hooks'
import {Page, PageTitle} from '../../screens/app/components'
import {Avatar, RoundedTh} from '../../shared/components/components'
import Layout from '../../shared/components/layout'
import {toLocaleDna} from '../../shared/utils/utils'

export default function AdOfferList() {
  const {t, i18n} = useTranslation()

  const ads = useRotatingAdList()

  const {data: burningAds} = useRpc('bcn_burntCoins', [])

  const dna = toLocaleDna(i18n.language)

  return (
    <Layout skipBanner>
      <Page>
        <PageTitle mb={4}>{t('All offers')}</PageTitle>
        <Table>
          <Thead>
            <Tr>
              <RoundedTh>{t('Banner/author')}</RoundedTh>
              <RoundedTh>{t('Website')}</RoundedTh>
              <RoundedTh>{t('Status')}</RoundedTh>
              <RoundedTh>{t('Burn')}</RoundedTh>
            </Tr>
          </Thead>
          {ads.map((ad, idx) => (
            <Tr key={ad?.id} fontWeight={500}>
              <Td>
                <HStack>
                  <PlainAdCoverImage src={ad?.cover} boxSize="10" />
                  <Stack>
                    <Text lineHeight={4} isTruncated>
                      {ad?.title}
                    </Text>
                    <HStack spacing={1}>
                      <Avatar
                        address={ad?.author}
                        size={4}
                        borderWidth={1}
                        borderColor="brandGray.016"
                        rounded="sm"
                      />
                      <Text color="muted" fontSize="sm" fontWeight={500}>
                        {ad?.author}
                      </Text>
                    </HStack>
                  </Stack>
                </HStack>
              </Td>
              <Td>
                <NextLink href={String(ad?.url)} passHref>
                  <Link target="_blank" color="blue.500">
                    {ad?.url}
                  </Link>
                </NextLink>
              </Td>
              <Td>{t('Showing')}</Td>
              <Td>{dna(burningAds[idx]?.amount ?? 0)}</Td>
            </Tr>
          ))}
        </Table>
      </Page>
    </Layout>
  )
}
