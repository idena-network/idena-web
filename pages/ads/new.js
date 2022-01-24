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
import {useMachine} from '@xstate/react'
import {useTranslation} from 'react-i18next'
import nanoid from 'nanoid'
import {Page, PageTitle} from '../../screens/app/components'
import Layout from '../../shared/components/layout'
import {
  AdNumberInput,
  AdFormField,
  NewAdFormTab,
} from '../../screens/ads/components'
import {editAdMachine} from '../../screens/ads/hooks'
import {AdForm} from '../../screens/ads/containers'
import {PrimaryButton} from '../../shared/components/button'
import {useSuccessToast} from '../../shared/hooks/use-toast'
import {SuccessAlert} from '../../shared/components/components'
import db from '../../shared/utils/db'

export default function NewAdPage() {
  const router = useRouter()

  const {t} = useTranslation()

  const toast = useSuccessToast()

  const persistAd = context => db.table('ads').put({...context, id: nanoid()})

  const [current, send] = useMachine(editAdMachine, {
    actions: {
      onSuccess: () => {
        router.push('/ads/list')
      },
      onBeforeClose: () => {
        toast(t('Ad has been saved to drafts'))
        router.push('/ads/list')
      },
    },
    services: {
      init: () => Promise.resolve(),
      submit: persistAd,
      close: persistAd,
    },
  })

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
                send('CLOSE')
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
                    onChange={ad => {
                      send('UPDATE', {ad})
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
          <PrimaryButton
            onClick={() => {
              send('SUBMIT')
            }}
            isLoading={current.matches('submitting')}
          >
            {t('Save')}
          </PrimaryButton>
        </HStack>
      </Page>
    </Layout>
  )
}
