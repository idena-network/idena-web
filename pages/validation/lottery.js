import {
  Box,
  Center,
  CloseButton,
  Flex,
  Heading,
  Stack,
  Text,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  LotteryCountdown,
  LotteryAdPromotion,
} from '../../screens/validation/lottery/components'
import {ApiStatus} from '../../shared/components/components'

export default function LotteryPage() {
  const {t} = useTranslation()

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
                {t('Get ready!')}
              </Heading>
              <Text color="xwhite.050" fontSize="mdx">
                {t('Idena validation will start soon')}
              </Text>
            </Stack>
            <LotteryCountdown duration={5 * 60 * 1000} />
          </Stack>

          <LotteryAdPromotion />
        </Stack>
      </Center>
    </Box>
  )
}
