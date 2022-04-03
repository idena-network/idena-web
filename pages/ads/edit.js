import * as React from 'react'
import {Box, HStack, Text, useDisclosure} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {TriangleUpIcon} from '@chakra-ui/icons'
import {Page, PageTitle} from '../../screens/app/components'
import Layout from '../../shared/components/layout'
import {AdForm, AdPreview} from '../../screens/ads/containers'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {
  PageHeader,
  PageCloseButton,
  PageFooter,
} from '../../screens/ads/components'
import db from '../../shared/utils/db'
import {useCoinbase, useDraftAds} from '../../screens/ads/hooks'

export default function EditAdPage() {
  const {t} = useTranslation()

  const router = useRouter()

  const {id} = router.query

  const {data: ads} = useDraftAds()

  // eslint-disable-next-line no-shadow
  const ad = ads.find(ad => ad.id === id)

  const coinbase = useCoinbase()

  const [previewAd, setPreviewAd] = React.useState({
    ...ad,
    author: coinbase,
    thumb: URL.createObjectURL(ad.thumb),
    media: URL.createObjectURL(ad.media),
  })

  const previewDisclosure = useDisclosure()

  return (
    <Layout>
      <Page px={0} py={0} overflow="hidden">
        <Box flex={1} w="full" px={20} py={6} overflowY="auto">
          <PageHeader>
            <PageTitle mb={0}>{t('Edit ad')}</PageTitle>
            <PageCloseButton href="/ads/list" />
          </PageHeader>

          <AdForm
            id="adForm"
            ad={ad}
            onBlur={e => {
              const nextAd = Object.fromEntries(
                new FormData(e.currentTarget).entries()
              )

              setPreviewAd({
                ...ad,
                author: coinbase,
                thumb: URL.createObjectURL(
                  nextAd.thumb.size > 0 ? nextAd.thumb : ad.thumb
                ),
                media: URL.createObjectURL(
                  nextAd.media.size > 0 ? nextAd.media : ad.media
                ),
              })
            }}
            onSubmit={async nextAd => {
              const hasValues = Object.values(nextAd).some(value =>
                value instanceof File ? value.size > 0 : Boolean(value)
              )

              if (hasValues) {
                await db.table('ads').update(id, {
                  ...nextAd,
                  thumb: nextAd.thumb.size > 0 ? nextAd.thumb : ad.thumb,
                  media: nextAd.media.size > 0 ? nextAd.media : ad.thumb,
                })
              }

              router.push('/ads/list')
            }}
          />
        </Box>

        <PageFooter>
          <SecondaryButton
            onClick={() => {
              previewDisclosure.onOpen()
            }}
          >
            <HStack>
              <TriangleUpIcon boxSize="3" transform="rotate(90deg)" />
              <Text>{t('Show preview')}</Text>
            </HStack>
          </SecondaryButton>
          <PrimaryButton form="adForm" type="submit">
            {t('Save')}
          </PrimaryButton>
        </PageFooter>
      </Page>

      <AdPreview ad={previewAd} {...previewDisclosure} />
    </Layout>
  )
}
