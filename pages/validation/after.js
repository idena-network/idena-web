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
import {LayoutContainer} from '../../screens/app/components'
import {ValidationAdPromotion} from '../../screens/validation/components/ads'
import {ValidationCountdown} from '../../screens/validation/components/countdown'
import {usePersistedValidationState} from '../../screens/validation/hooks/use-persisted-state'
import {
  useAutoCloseValidationToast,
  useTrackEpochPeriod,
} from '../../screens/validation/hooks/use-validation-toast'
import {canValidate} from '../../screens/validation/utils'
import Auth from '../../shared/components/auth'
import {ApiStatus, ErrorAlert} from '../../shared/components/components'
import useNodeTiming from '../../shared/hooks/use-node-timing'
import {useAuthState} from '../../shared/providers/auth-context'
import {useEpoch} from '../../shared/providers/epoch-context'
import {useIdentity} from '../../shared/providers/identity-context'
import {EpochPeriod, IdentityStatus} from '../../shared/types'

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

  const {auth} = useAuthState()

  const epoch = useEpoch()
  const currentPeriod = epoch?.currentPeriod

  const isAfterLongSession = currentPeriod === EpochPeriod.AfterLongSession
  const isValidationCeremony = [
    EpochPeriod.ShortSession,
    EpochPeriod.LongSession,
  ].includes(currentPeriod)

  const timing = useNodeTiming()

  const [identity] = useIdentity()

  const isEligible = canValidate(identity)

  const isValidated = [
    IdentityStatus.Newbie,
    IdentityStatus.Verified,
    IdentityStatus.Human,
  ].includes(identity.state)

  const validationEnd = dayjs(epoch?.nextValidation)
    .add(timing?.shortSession, 'second')
    .add(timing?.longSession, 'second')

  useAutoCloseValidationToast()

  useTrackEpochPeriod({
    onChangeCurrentPeriod: period => {
      if ([EpochPeriod.None, EpochPeriod.FlipLottery].includes(period)) {
        router.push('/home')
      }
    },
  })

  if (!auth) {
    return (
      <LayoutContainer>
        <Auth />
      </LayoutContainer>
    )
  }

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
        <Stack spacing="12" w={['xs', '2xl']}>
          <Stack spacing="6">
            <Stack spacing="2">
              <Heading fontSize="lg" fontWeight={500}>
                {isAfterLongSession
                  ? t('Waiting for the Idena validation results')
                  : t('Waiting for the end of the long session')}
              </Heading>

              {isAfterLongSession && (
                <Text color="xwhite.050" fontSize="mdx">
                  {t('Network is reaching consensus on validated identities')}
                </Text>
              )}

              {isValidationCeremony && (
                <>
                  {isEligible &&
                    isPending &&
                    t('Please wait. Your answers are being submitted...')}
                  {isEligible &&
                    !isPending &&
                    t('Your answers are successfully submitted')}
                </>
              )}
            </Stack>
            {isAfterLongSession ? null : (
              <ValidationCountdown duration={validationEnd.diff(dayjs())} />
            )}

            {!isEligible && (
              <ErrorAlert>
                {isValidated
                  ? t(
                      'Can not start validation session because you did not submit flips'
                    )
                  : t(
                      'Can not start validation session because you did not activate invite'
                    )}
              </ErrorAlert>
            )}
          </Stack>
          <ValidationAdPromotion />
        </Stack>
      </Center>
    </Box>
  )
}
