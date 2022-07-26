import {
  Box,
  Center,
  CloseButton,
  Flex,
  Heading,
  Stack,
  Text,
} from '@chakra-ui/react'
import dayjs from 'dayjs'
import NextLink from 'next/link'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {ValidationAdPromotion} from '../../screens/validation/components/ads'
import {
  useAutoStartValidation,
  useCloseLotteryScreen,
} from '../../screens/validation/hooks/use-auto-start'
import {ValidationCountdown} from '../../screens/validation/components/countdown'
import {ApiStatus, ErrorAlert} from '../../shared/components/components'
import {useEpoch} from '../../shared/providers/epoch-context'
import {useAutoCloseValidationToast} from '../../screens/validation/hooks/use-validation-toast'
import {EpochPeriod, IdentityStatus} from '../../shared/types'
import {useAuthState} from '../../shared/providers/auth-context'
import {LayoutContainer} from '../../screens/app/components'
import Auth from '../../shared/components/auth'
import {canValidate} from '../../screens/validation/utils'
import {useIdentity} from '../../shared/providers/identity-context'

export default function LotteryPage() {
  const {t} = useTranslation()

  const {auth} = useAuthState()
  const epoch = useEpoch()
  const [identity] = useIdentity()

  const isIneligible = !canValidate(identity)

  const isValidated = [
    IdentityStatus.Newbie,
    IdentityStatus.Verified,
    IdentityStatus.Human,
  ].includes(identity.state)

  useAutoStartValidation()

  useAutoCloseValidationToast()

  const [, setCloseLotteryScreen] = useCloseLotteryScreen()

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
          <CloseButton
            boxSize={4}
            color="white"
            onClick={() => {
              setCloseLotteryScreen(true)
            }}
          />
        </NextLink>
      </Flex>

      <Center bg="graphite.500" color="white" minH="100vh">
        <Stack spacing="12">
          <Stack spacing="6" w={['xs', '2xl']}>
            <Stack spacing="2">
              <Heading fontSize="lg" fontWeight={500}>
                {t('Idena validation will start soon')}
              </Heading>
              <Text color="xwhite.050" fontSize="mdx">
                {t(
                  'Get ready! Make sure you have a stable internet connection'
                )}
              </Text>
            </Stack>

            {epoch ? (
              <ValidationCountdown
                duration={
                  epoch.currentPeriod === EpochPeriod.FlipLottery
                    ? dayjs(epoch.nextValidation).diff(dayjs())
                    : 0
                }
              />
            ) : null}

            {isIneligible && (
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
