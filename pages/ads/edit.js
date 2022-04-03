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
import {useCoinbase, useDraftAd} from '../../screens/ads/hooks'
import {useFailToast} from '../../shared/hooks/use-toast'

export default function EditAdPage() {
  const {t} = useTranslation()

  const router = useRouter()

  const {data: ad} = useDraftAd(router.query.id)

  const coinbase = useCoinbase()

  const adFormRef = React.useRef()

  const previewAdRef = React.useRef()

  const previewDisclosure = useDisclosure()

  const failToast = useFailToast()

  return (
    <Layout>
      <Page px={0} py={0} overflow="hidden">
        <Box flex={1} w="full" px={20} py={6} overflowY="auto">
          <PageHeader>
            <PageTitle mb={0}>{t('Edit ad')}</PageTitle>
            <PageCloseButton href="/ads/list" />
          </PageHeader>

          <AdForm
            ref={adFormRef}
            id="adForm"
            ad={ad}
            onSubmit={async nextAd => {
              const hasValues = Object.values(nextAd).some(value =>
                value instanceof File ? value.size > 0 : Boolean(value)
              )

              const imageLimit = 1024 * 1024

              if (hasValues) {
                if (
                  nextAd.thumb.size > imageLimit ||
                  nextAd.media.size > imageLimit
                ) {
                  failToast(t('Ad image is too large'))
                } else {
                  await db.table('ads').update(ad.id, {
                    ...nextAd,
                    thumb: nextAd.thumb.size > 0 ? nextAd.thumb : ad.thumb,
                    media: nextAd.media.size > 0 ? nextAd.media : ad.thumb,
                  })

                  router.push('/ads/list')
                }
              } else {
                failToast(t('Nothing to submit. Please fill in the form'))
              }
            }}
          />
        </Box>

        <PageFooter>
          <SecondaryButton
            onClick={() => {
              const nextAd = Object.fromEntries(
                new FormData(adFormRef.current).entries()
              )

              previewAdRef.current = {
                ...ad,
                ...nextAd,
                author: coinbase,
                thumb: URL.createObjectURL(
                  nextAd.thumb.size > 0 ? nextAd.thumb : ad.thumb
                ),
                media: URL.createObjectURL(
                  nextAd.media.size > 0 ? nextAd.media : ad.media
                ),
              }

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

      <AdPreview ad={previewAdRef.current} {...previewDisclosure} />
    </Layout>
  )
}
