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
import React from 'react'
import {useTranslation} from 'react-i18next'
import {State} from 'xstate'
import {useTrackTx} from '../../screens/ads/hooks'
import {ValidationAdPromotion} from '../../screens/validation/ads/components'
import {ValidationCountdown} from '../../screens/validation/pending/components'
import {loadValidationState} from '../../screens/validation/utils'
import {ApiStatus} from '../../shared/components/components'
import useNodeTiming from '../../shared/hooks/use-node-timing'
import {useEpoch} from '../../shared/providers/epoch-context'

export default function AfterValidationPage() {
  const {t} = useTranslation()

  const validationStateDefinition = loadValidationState()
  const validationState = validationStateDefinition
    ? State.create(validationStateDefinition).done
    : {done: false, submitHash: null}

  const [isPending, setIsPending] = useBoolean(validationState?.done)

  useTrackTx(validationState?.submitHash, {onMined: setIsPending.off})

  const epoch = useEpoch()
  const timing = useNodeTiming()
  const validationEnd = dayjs(epoch?.nextValidation)
    .add(timing?.shortSession, 'second')
    .add(timing?.longSession, 'second')

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
                {t('Waiting for the end of the long session')}
              </Heading>
              <Text color="xwhite.050" fontSize="mdx">
                {isPending
                  ? t('Please wait. You answers are being submitted...')
                  : t('You answers are successfully submitted')}
              </Text>
            </Stack>
            <ValidationCountdown
              duration={Math.max(validationEnd.diff(dayjs()), 0)}
            />
          </Stack>
          <ValidationAdPromotion />
        </Stack>
      </Center>
    </Box>
  )
}
