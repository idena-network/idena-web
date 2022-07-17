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
import {useAutoStartValidation} from '../../screens/validation/hooks/use-auto-start'
import {ValidationCountdown} from '../../screens/validation/components/countdown'
import {ApiStatus} from '../../shared/components/components'
import {useEpoch} from '../../shared/providers/epoch-context'
import {useAutoCloseValidationStatusToast} from '../../screens/validation/hooks/use-status-toast'
import {EpochPeriod} from '../../shared/types'

export default function LotteryPage() {
  const {t} = useTranslation()

  useAutoCloseValidationStatusToast()

  const epoch = useEpoch()

  useAutoStartValidation()

  const msUntilValidation = dayjs(
    epoch.nextValidation || epoch.validationStart
  ).diff(dayjs())

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
                    ? msUntilValidation
                    : 0
                }
              />
            ) : null}
          </Stack>
          <ValidationAdPromotion />
        </Stack>
      </Center>
    </Box>
  )
}
