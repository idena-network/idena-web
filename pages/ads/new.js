import * as React from 'react'
import {Box} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {useMutation} from 'react-query'
import {Page, PageTitle} from '../../screens/app/components'
import Layout from '../../shared/components/layout'
import {AdForm} from '../../screens/ads/containers'
import {PrimaryButton} from '../../shared/components/button'
import {useFailToast, useSuccessToast} from '../../shared/hooks/use-toast'
import PageFooter, {
  PageHeader,
  PageHeaderCloseButton,
} from '../../screens/ads/components'

export default function NewAdPage() {
  const {t} = useTranslation()

  const router = useRouter()

  const toast = useSuccessToast()
  const failToast = useFailToast()

  const createMutation = useMutation(() => 0) // useCreateAd()

  return (
    <Layout>
      <Page px={0} py={0} overflow="hidden">
        <Box flex={1} w="full" px={20} py={6} overflowY="auto">
          <PageHeader>
            <PageTitle mb={0}>{t('New ad')}</PageTitle>
            <PageHeaderCloseButton href="/ads/list" />
          </PageHeader>

          <AdForm
            id="adForm"
            onSubmit={ad => {
              const hasValues = Object.values(ad).some(value =>
                value instanceof File ? value.size > 0 : Boolean(value)
              )

              if (hasValues) {
                createMutation.mutate(
                  {...ad, createdAt: Date.now()},
                  {
                    onSuccess: () => {
                      toast(t('Ad has been saved'))
                      router.push('/ads/list')
                    },
                    onError: failToast,
                  }
                )
              } else {
                router.push('/ads/list')
              }
            }}
          />
        </Box>

        <PageFooter>
          <PrimaryButton form="adForm" type="submit">
            {t('Save')}
          </PrimaryButton>
        </PageFooter>
      </Page>
    </Layout>
  )
}
