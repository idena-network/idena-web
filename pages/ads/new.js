import * as React from 'react'
import {Box, HStack, Text, useDisclosure} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import nanoid from 'nanoid'
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
import {AdStatus} from '../../screens/ads/types'
import {useCoinbase} from '../../screens/ads/hooks'
import {useFailToast, useSuccessToast} from '../../shared/hooks/use-toast'

export default function NewAdPage() {
  const {t} = useTranslation()

  const router = useRouter()

  const coinbase = useCoinbase()

  const adFormRef = React.useRef()

  const previewAdRef = React.useRef()

  const previewDisclosure = useDisclosure()

  const toast = useSuccessToast()

  const failToast = useFailToast()

  return (
    <Layout>
      <Page px={0} py={0} overflow="hidden">
        <Box flex={1} w="full" px={20} py={6} overflowY="auto">
          <PageHeader>
            <PageTitle mb={0}>{t('New ad')}</PageTitle>
            <PageCloseButton
              href="/ads/list"
              onClick={async () => {
                const formData = new FormData(adFormRef.current)
                const draftAd = Object.fromEntries(formData.entries())

                const hasValues = Object.values(draftAd).some(value =>
                  value instanceof File ? value.size > 0 : Boolean(value)
                )

                if (hasValues) {
                  await db
                    .table('ads')
                    .add({...draftAd, id: nanoid(), status: AdStatus.Draft})

                  toast(t('Ad has been saved to drafts'))
                }
              }}
            />
          </PageHeader>

          <AdForm
            ref={adFormRef}
            id="adForm"
            onSubmit={async ad => {
              const hasValues = Object.values(ad).some(value =>
                value instanceof File ? value.size > 0 : Boolean(value)
              )

              const imageLimit = 1024 * 1024

              if (hasValues) {
                if (ad.thumb.size > imageLimit || ad.media.size > imageLimit) {
                  failToast(t('Ad image is too large'))
                } else {
                  await db
                    .table('ads')
                    .add({...ad, id: nanoid(), status: AdStatus.Draft})

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
              const ad = Object.fromEntries(
                new FormData(adFormRef.current).entries()
              )

              previewAdRef.current = {
                ...ad,
                author: coinbase,
                thumb: ad.thumb && URL.createObjectURL(ad.thumb),
                media: ad.media && URL.createObjectURL(ad.media),
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
