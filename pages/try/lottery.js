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
import {ValidationCountdown} from '../../screens/validation/components/countdown'
import {ApiStatus} from '../../shared/components/components'
import {useAuthState} from '../../shared/providers/auth-context'
import {LayoutContainer} from '../../screens/app/components'
import Auth from '../../shared/components/auth'
import {useAutoCloseTestValidationToast} from '../../screens/try/hooks/use-test-validation-toast'
import {useTestValidationState} from '../../shared/providers/test-validation-context'
import {useAutoStartTestValidation} from '../../screens/try/hooks/use-start-test-validation'

export default function LotteryPage() {
  const {t} = useTranslation()

  const {auth} = useAuthState()

  const {current, epoch} = useTestValidationState()

  useAutoStartTestValidation()

  useAutoCloseTestValidationToast()

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
        <NextLink href="/try" passHref>
          <CloseButton boxSize={4} color="white" />
        </NextLink>
      </Flex>

      <Center bg="graphite.500" color="white" minH="100vh">
        <Stack spacing="12" w={['xs', '640px']}>
          <Stack spacing="6">
            <Stack spacing="2">
              <Heading fontSize="lg" fontWeight={500}>
                {t('Idena training validation will start soon')}
              </Heading>
              <Text color="xwhite.050" fontSize="mdx">
                {t(
                  'Get ready! Make sure you have a stable internet connection'
                )}
              </Text>
            </Stack>

            {epoch ? (
              <ValidationCountdown
                duration={Math.floor(
                  Math.max(dayjs(current?.startTime).diff(), 0)
                )}
              />
            ) : null}
          </Stack>
          <ValidationAdPromotion />
        </Stack>
      </Center>
    </Box>
  )
}
