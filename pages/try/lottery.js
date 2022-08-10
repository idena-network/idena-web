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
import {
  useAutoStartTestValidation,
  useCloseTestLotteryScreen,
} from '../../screens/try/hooks/use-start-test-validation'

export default function LotteryPage() {
  const {t} = useTranslation()

  const {auth} = useAuthState()

  const {current, epoch} = useTestValidationState()

  useAutoStartTestValidation()

  useAutoCloseTestValidationToast()

  const [, setCloseTestLotteryScreen] = useCloseTestLotteryScreen()

  if (!auth) {
    return (
      <LayoutContainer>
        <Auth />
      </LayoutContainer>
    )
  }

  return (
    <Box
      bg="graphite.500"
      color="white"
      fontSize="md"
      p={['8', 0]}
      pt={['2', 0]}
      position="relative"
      w="full"
    >
      <Flex
        justifyContent="space-between"
        alignItems="center"
        position={['relative', 'absolute']}
        insetX={[0, '4']}
        top={[null, '2']}
        mx={['-4', 0]}
        mb={['8', 0]}
      >
        <ApiStatus position="relative" />
        <NextLink href="/try" passHref>
          <CloseButton
            boxSize={4}
            color="white"
            onClick={() => {
              setCloseTestLotteryScreen(true)
            }}
          />
        </NextLink>
      </Flex>

      <Center minH="100vh">
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
