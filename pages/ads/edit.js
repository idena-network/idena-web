import * as React from 'react'
import {
  Stack,
  TabPanels,
  TabPanel,
  CloseButton,
  Flex,
  Box,
  Tabs,
  HStack,
} from '@chakra-ui/react'
import {useMachine} from '@xstate/react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {Page, PageTitle} from '../../screens/app/components'
import Layout from '../../shared/components/layout'
import {PrimaryButton} from '../../shared/components/button'
import {useSuccessToast} from '../../shared/hooks/use-toast'
import {useEpoch} from '../../shared/providers/epoch-context'
import {eitherState} from '../../shared/utils/utils'
import {createAdDb} from '../../screens/ads/utils'
import {
  AdNumberInput,
  AdFormField,
  NewAdFormTab,
} from '../../screens/ads/components'
import {AdForm} from '../../screens/ads/containers'
import {editAdMachine} from '../../screens/ads/hooks'
import {AdStatus} from '../../screens/ads/types'
import {SuccessAlert} from '../../shared/components/components'

export default function EditAdPage() {
  const {t} = useTranslation()

  const router = useRouter()
  const {id} = router.query

  const toast = useSuccessToast()

  const epoch = useEpoch()

  const db = createAdDb(epoch?.epoch)

  const [current, send] = useMachine(editAdMachine, {
    context: {id},
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
      // eslint-disable-next-line no-shadow
      init: ({id}) => db.get(id),
      submit: async context => {
        await db.put({...context, status: AdStatus.Active})
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
            <PageTitle mb={0}>{t('Edit ad')}</PageTitle>
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
                  {eitherState(current, 'editing') && (
                    <AdForm
                      {...current.context}
                      onChange={ad => {
                        send('UPDATE', {ad})
                      }}
                    />
                  )}
                </TabPanel>
                <TabPanel>
                  <Stack spacing={6} w="480px">
                    <Stack spacing={4} shouldWrapChildren>
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
            onClick={() => send('SUBMIT')}
            isLoading={current.matches('submitting')}
          >
            {t('Save')}
          </PrimaryButton>
        </HStack>
      </Page>
    </Layout>
  )
}
