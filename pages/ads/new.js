import * as React from 'react'
import {
  CloseButton,
  Flex,
  Stack,
  Tabs,
  TabPanel,
  TabPanels,
  HStack,
  Box,
} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {Page, PageTitle} from '../../screens/app/components'
import Layout from '../../shared/components/layout'
import {
  AdNumberInput,
  AdFormField,
  NewAdFormTab,
} from '../../screens/ads/components'
import {useCreateAd} from '../../screens/ads/hooks'
import {AdForm} from '../../screens/ads/containers'
import {PrimaryButton} from '../../shared/components/button'
import {useFailToast, useSuccessToast} from '../../shared/hooks/use-toast'
import {SuccessAlert} from '../../shared/components/components'

export default function NewAdPage() {
  const {t} = useTranslation()

  const router = useRouter()

  const toast = useSuccessToast()
  const failToast = useFailToast()

  const createMutation = useCreateAd()

  return (
    <Layout>
      <Page px={0} py={0} overflow="hidden">
        <Box flex={1} w="full" px={20} py={6} overflowY="auto">
          <Flex
            justify="space-between"
            align="center"
            alignSelf="stretch"
            mb={4}
          >
            <PageTitle mb={0}>{t('New ad')}</PageTitle>
            <CloseButton
              onClick={() => {
                router.push('/ads/list')
              }}
            />
          </Flex>

          <Tabs defaultIndex={0}>
            <Stack spacing={6}>
              <HStack>
                <NewAdFormTab>{t('Parameters')}</NewAdFormTab>
                <NewAdFormTab>{t('Publish options')}</NewAdFormTab>
              </HStack>

              <SuccessAlert>
                {t('You must publish this banner after creating')}
              </SuccessAlert>

              <TabPanels>
                <TabPanel>
                  <AdForm
                    id="adForm"
                    onSubmit={ad => {
                      const hasValues = Object.values(ad).some(value =>
                        value instanceof File ? value.size > 0 : Boolean(value)
                      )

                      if (hasValues) {
                        createMutation.mutate(ad, {
                          onSuccess: () => {
                            toast(t('Ad has been saved'))
                            router.push('/ads/list')
                          },
                          onError: failToast,
                        })
                      } else {
                        router.push('/ads/list')
                      }
                    }}
                  />
                </TabPanel>
                <TabPanel>
                  <Stack spacing={6}>
                    <Stack spacing={4}>
                      <AdFormField label="Max burn rate" id="maxBurnRate">
                        <AdNumberInput />
                      </AdFormField>
                      <AdFormField label="Max burn rate" id="minBurnRate">
                        <AdNumberInput />
                      </AdFormField>
                      <AdFormField label="Total banner budget" id="totalBudget">
                        <AdNumberInput />
                      </AdFormField>
                      <AdFormField label="Total burnt" id="totalBurnt">
                        <AdNumberInput isDisabled />
                      </AdFormField>
                    </Stack>
                  </Stack>
                </TabPanel>
              </TabPanels>
            </Stack>
          </Tabs>
        </Box>
        <HStack
          spacing={2}
          justify="flex-end"
          bg="white"
          borderTop="1px"
          borderTopColor="gray.100"
          px={4}
          py={3}
          h={14}
          w="full"
        >
          <PrimaryButton form="adForm" type="submit">
            {t('Save')}
          </PrimaryButton>
        </HStack>
      </Page>
    </Layout>
  )
}
