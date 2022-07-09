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
import {useRouter} from 'next/router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {ValidationAdPromotion} from '../../screens/validation/ads/components'
import {ValidationCountdown} from '../../screens/validation/pending/components'
import {shouldStartValidation} from '../../screens/validation/utils'
import {ApiStatus} from '../../shared/components/components'
import {useInterval} from '../../shared/hooks/use-interval'
import {useEpoch} from '../../shared/providers/epoch-context'
import {useIdentity} from '../../shared/providers/identity-context'

export default function LotteryPage() {
  const {t} = useTranslation()

  const router = useRouter()

  const epoch = useEpoch()
  const [identity] = useIdentity()

  const msUntilValidation = dayjs(epoch?.nextValidation).diff(dayjs())

  useInterval(() => {
    if (shouldStartValidation(epoch, identity)) {
      router.push('/validation')
    }
  }, 1000)

  return (
    <Box color="white" fontSize="md" position="relative" w="full">
      <Flex
        justifyContent="space-between"
        alignItems="center"
        position="absolute"
        top="3"
        left="3"
        right="3"
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
            <ValidationCountdown duration={Math.max(msUntilValidation, 0)} />
          </Stack>
          <ValidationAdPromotion />
        </Stack>
      </Center>
    </Box>
  )
}
