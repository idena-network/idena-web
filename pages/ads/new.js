import React from 'react'
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
import {Page, PageTitle} from '../../screens/app/components'
import Layout from '../../shared/components/layout'
import {buildTargetKey, createAdDb} from '../../screens/ads/utils'
import {
  AdNumberInput,
  AdFormField,
  NewAdFormTab,
} from '../../screens/ads/components'
import {editAdMachine} from '../../screens/ads/hooks'
import {AdForm} from '../../screens/ads/containers'
import {AdStatus} from '../../screens/ads/types'
import {PrimaryButton} from '../../shared/components/button'
import {useEpoch} from '../../shared/providers/epoch-context'
import {useIdentity} from '../../shared/providers/identity-context'
import {useSuccessToast} from '../../shared/hooks/use-toast'
import {SuccessAlert} from '../../shared/components/components'

export default function NewAdPage() {
  const router = useRouter()

  const {t} = useTranslation()

  const toast = useSuccessToast()

  const epoch = useEpoch()
  const [{address, age, stake}] = useIdentity()

  const db = createAdDb(epoch?.epoch)

  const [current, send] = useMachine(editAdMachine, {
    actions: {
      onSuccess: () => {
        router.push('/ads/list')
      },
      onSaveBeforeClose: () => {
        toast(t('Ad has been saved to drafts'))
        router.push('/ads/list')
      },
    },
    services: {
      init: () => Promise.resolve(),
      submit: async context => {
        await db.put({
          ...context,
          issuer: address,
          status: AdStatus.Active,
          key: buildTargetKey({
            locale: context.lang,
            age,
            stake,
          }),
        })
        // await callRpc('dna_changeProfile', {
        //   info: `0x${objectToHex(
        //     // eslint-disable-next-line no-unused-vars
        //     buildProfile({ads: (await db.all()).map(({cover, ...ad}) => ad)})
        //   )}`,
        // })
      },
      saveBeforeClose: context => {
        const {status = AdStatus.Draft} = context
        if (status === AdStatus.Draft) return db.put({...context, status})
        return Promise.resolve()
      },
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
            <PageTitle mb={0}>New ad</PageTitle>
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
