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

export default function NewAdPage() {
  const {t} = useTranslation()

  const router = useRouter()

  const previewDisclosure = useDisclosure()

  const [previewAd, setPreviewAd] = React.useState()

  const coinbase = useCoinbase()

  return (
    <Layout>
      <Page px={0} py={0} overflow="hidden">
        <Box flex={1} w="full" px={20} py={6} overflowY="auto">
          <PageHeader>
            <PageTitle mb={0}>{t('New ad')}</PageTitle>
            <PageCloseButton href="/ads/list" />
          </PageHeader>

          <AdForm
            id="adForm"
            onBlur={e => {
              const ad = Object.fromEntries(
                new FormData(e.currentTarget).entries()
              )

              setPreviewAd({
                ...ad,
                author: coinbase,
                thumb: URL.createObjectURL(ad.thumb),
                media: URL.createObjectURL(ad.media),
              })
            }}
            onSubmit={async ad => {
              const hasValues = Object.values(ad).some(value =>
                value instanceof File ? value.size > 0 : Boolean(value)
              )

              if (hasValues) {
                await db
                  .table('ads')
                  .add({...ad, id: nanoid(), status: AdStatus.Draft})
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
