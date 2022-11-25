import {
  Box,
  Center,
  chakra,
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
import {isValidMotionProp, motion} from 'framer-motion'
import {ValidationAdPromotion} from '../../screens/validation/components/ads'
import {ValidationCountdown} from '../../screens/validation/components/countdown'
import {ApiStatus} from '../../shared/components/components'
import {useAuthState} from '../../shared/providers/auth-context'
import {LayoutContainer} from '../../screens/app/components'
import Auth from '../../shared/components/auth'
import {useAutoCloseTestValidationToast} from '../../screens/try/hooks/use-test-validation-toast'
import {useTestValidationState} from '../../shared/providers/test-validation-context'
import {useAutoStartTestValidation} from '../../screens/try/hooks/use-start-test-validation'
import {useRotatingAds} from '../../screens/ads/hooks'
import {CertificateType} from '../../shared/types'

const shouldForwardProp = prop =>
  isValidMotionProp(prop) || ['children'].includes(prop)

const MotionBox = chakra(motion.div, {
  shouldForwardProp,
})

export default function LotteryPage() {
  const {t} = useTranslation()

  const {auth, coinbase} = useAuthState()

  const {current, epoch} = useTestValidationState()

  useAutoStartTestValidation()

  useAutoCloseTestValidationToast()

  const ads = useRotatingAds()
  const isRotatingAds = ads.length > 0

  if (!auth) {
    return (
      <LayoutContainer>
        <Auth />
      </LayoutContainer>
    )
  }

  const isSample = current?.type === CertificateType.Sample

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
              if (coinbase && epoch) {
                sessionStorage.setItem(
                  'didCloseTestLotteryScreen',
                  JSON.stringify({
                    address: coinbase,
                  })
                )
              }
            }}
          />
        </NextLink>
      </Flex>

      <Center minH="100vh">
        <Stack spacing="12" w={['xs', '640px']}>
          <Box>
            <MotionBox
              initial={{
                y: isRotatingAds && !isSample ? 180 : 0,
              }}
              animate={{
                y: 0,
              }}
              transition={{
                delay: 2.5,
                duration: 0.5,
              }}
            >
              <Stack spacing="6">
                <Stack spacing="2">
                  {isSample ? (
                    <>
                      <Heading fontSize="lg" fontWeight={500}>
                        {t('Get ready for the training validation')}
                      </Heading>
                      <Text color="xwhite.050" fontSize="mdx">
                        {t(
                          'To get validated you need to prove that you are a human. No personal data is required. Solve the flip-puzzles within a limited time frame.'
                        )}
                      </Text>
                      <Text color="xwhite.050" fontSize="mdx">
                        {t(
                          'For a successful validation, it’s important to be online a few minutes before the ceremony starts. Get ready!'
                        )}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Heading fontSize="lg" fontWeight={500}>
                        {t('Idena training validation will start soon')}
                      </Heading>
                      <Text color="xwhite.050" fontSize="mdx">
                        {t(
                          'Get ready! Make sure you have a stable internet connection'
                        )}
                      </Text>
                    </>
                  )}
                </Stack>

                {epoch ? (
                  <ValidationCountdown
                    duration={Math.floor(
                      Math.max(dayjs(current?.startTime).diff(), 0)
                    )}
                  />
                ) : null}
              </Stack>
            </MotionBox>
          </Box>
          {!isSample && (
            <Box>
              <MotionBox
                initial={{
                  x: isRotatingAds ? 1499 : 0,
                }}
                animate={{
                  x: 0,
                }}
                transition={{
                  duration: 1,
                  delay: 3,
                }}
              >
                <ValidationAdPromotion />
              </MotionBox>
            </Box>
          )}
        </Stack>
      </Center>
    </Box>
  )
}
