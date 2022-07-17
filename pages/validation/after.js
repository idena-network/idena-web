import {
  Box,
  Center,
  CloseButton,
  Flex,
  Heading,
  Stack,
  Text,
  useBoolean,
} from '@chakra-ui/react'
import dayjs from 'dayjs'
import NextLink from 'next/link'
import {useRouter} from 'next/router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {useTrackTx} from '../../screens/ads/hooks'
import {ValidationAdPromotion} from '../../screens/validation/components/ads'
import {ValidationCountdown} from '../../screens/validation/components/countdown'
import {usePersistedValidationState} from '../../screens/validation/hooks/use-persisted-state'
import {
  useAutoCloseValidationStatusToast,
  useTrackEpochPeriod,
} from '../../screens/validation/hooks/use-status-toast'
import {ApiStatus} from '../../shared/components/components'
import useNodeTiming from '../../shared/hooks/use-node-timing'
import {useEpoch} from '../../shared/providers/epoch-context'
import {EpochPeriod} from '../../shared/types'

export default function AfterValidationPage() {
  const {t} = useTranslation()

  const router = useRouter()

  const [{isPending}, setIsPending] = useBoolean()

  const {data: validationState} = usePersistedValidationState()

  useTrackTx(validationState?.submitLongAnswersHash, {
    onMined: () => {
      setIsPending.off()
    },
  })

  const epoch = useEpoch()
  const currentPeriod = epoch?.currentPeriod

  const isAfterLongSession = currentPeriod === EpochPeriod.AfterLongSession

  const timing = useNodeTiming()

  const validationEnd = dayjs(epoch?.nextValidation)
    .add(timing?.shortSession, 'second')
    .add(timing?.longSession, 'second')

  useAutoCloseValidationStatusToast()

  useTrackEpochPeriod({
    onChangeCurrentPeriod: period => {
      if ([EpochPeriod.None, EpochPeriod.FlipLottery].includes(period)) {
        router.push('/home')
      }
    },
  })

  return (
    <Box color="white" fontSize="md" position="relative" w="full">
      <Flex
        justifyContent="space-between"
        alignItems="center"
        position="absolute"
        top="2"
        left="4"
        right="4"
      >
        <ApiStatus position="relative" />
        <NextLink href="/home" passHref>
          <CloseButton boxSize={4} color="white" />
        </NextLink>
      </Flex>

      <Center bg="graphite.500" color="white" minH="100vh">
        <Stack spacing="12">
          <Stack spacing="6" w={['xs', '2xl']}>
            <Stack spacing="2">
              <Heading fontSize="lg" fontWeight={500}>
                {isAfterLongSession
                  ? t('Waiting for the Idena validation results')
                  : t('Waiting for the end of the long session')}
              </Heading>
              <Text color="xwhite.050" fontSize="mdx">
                {isAfterLongSession ? (
                  t('Network is reaching consensus on validated identities')
                ) : (
                  <>
                    {isPending
                      ? t('Please wait. You answers are being submitted...')
                      : t('You answers are successfully submitted')}
                  </>
                )}
              </Text>
            </Stack>
            {isAfterLongSession ? null : (
              <ValidationCountdown duration={validationEnd.diff(dayjs())} />
            )}
          </Stack>
          <ValidationAdPromotion />
        </Stack>
      </Center>
    </Box>
  )
}
