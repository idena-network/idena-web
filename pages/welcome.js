import {
  Button,
  Flex,
  HStack,
  Image,
  Stack,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {AuthLayout} from '../shared/components/auth'
import {PrimaryButton} from '../shared/components/button'
import {Avatar} from '../shared/components/components'
import {FlagIcon, HandIcon} from '../shared/components/icons'
import {useAuthState} from '../shared/providers/auth-context'
import {useTestValidationDispatch} from '../shared/providers/test-validation-context'
import {CertificateType} from '../shared/types'

export default function Welcome() {
  const {t} = useTranslation()
  const router = useRouter()
  const {scheduleValidation} = useTestValidationDispatch()
  const {auth, coinbase} = useAuthState()

  useEffect(() => {
    if (!auth) router.push('/home')
  }, [auth, router])

  const buttonSize = useBreakpointValue(['lg', 'md'])

  const [step, setStep] = useState(1)
  const [next, setNext] = useState(true)

  return (
    <AuthLayout>
      <AuthLayout.New>
        <Button
          variant="link"
          color="blue.500"
          fontSize="16px"
          display={['flex', 'none']}
          alignSelf="flex-end"
          mb={10}
          onClick={() => router.push('/home')}
        >
          {t('Skip')}
        </Button>
        <Flex direction="column" display={step === 1 ? 'flex' : 'none'}>
          <Text fontSize={['20px', '18px']} fontWeight={500}>
            {t('Welcome to Idena!')}
          </Text>
          <HStack mt={3} spacing={4} alignItems="center">
            <Avatar
              size={['48px', 9]}
              address="0x1"
              borderRadius={['12px', '10px']}
            />
            <Flex
              color="muted"
              wordBreak="break-word"
              fontSize={['16px', '14px']}
            >
              {coinbase}
            </Flex>
          </HStack>
          <Image mt={8} src="/static/welcome/step-1.png" />
        </Flex>
        <Flex direction="column" display={step === 2 ? 'flex' : 'none'}>
          <Text fontSize={['20px', '18px']} fontWeight={500}>
            {t('Use Idena wallet')}
          </Text>
          <Text mt={2} color="muted" fontSize={['16px', '14px']}>
            {t('Send and receive iDNA coins with instant confirmation')}
          </Text>
          <Image mt={8} src="/static/welcome/step-2.png" />
        </Flex>
        <Flex direction="column" display={step === 3 ? 'flex' : 'none'}>
          <Text fontSize={['20px', '18px']} fontWeight={500}>
            {t('Start democratic Oracle votes')}
          </Text>
          <Text mt={2} color="muted" fontSize={['16px', '14px']}>
            {t(
              'Run polls and democratic votes driven by “one person - one vote” principle'
            )}
          </Text>
          <Image mt={8} src="/static/welcome/step-3.png" />
        </Flex>
        <Flex direction="column" display={step === 4 ? 'flex' : 'none'}>
          <Text fontSize={['20px', '18px']} fontWeight={500}>
            {t('Run onchain ads')}
          </Text>
          <Text mt={2} color="muted" fontSize={['16px', '14px']}>
            {t('Advertise your goods and services onchain anonymously.')}
          </Text>
          <Image mt={8} src="/static/welcome/step-4.png" />
        </Flex>
        <Flex direction="column" display={step === 5 ? 'flex' : 'none'}>
          <Text fontSize={['20px', '18px']} fontWeight={500}>
            {t('Earn Idena rewards')}
          </Text>
          <HStack mt={3} spacing={4} alignItems="center">
            <Avatar
              size={['48px', 9]}
              address="0x1"
              borderRadius={['12px', '10px']}
            />
            <Flex
              color="muted"
              wordBreak="break-word"
              fontSize={['16px', '14px']}
            >
              {coinbase}
            </Flex>
          </HStack>
          <Stack spacing={3} mt={[8, 9]}>
            <Flex
              p={4}
              border="solid"
              borderWidth={next ? '2px' : '1px'}
              borderColor={next ? 'blue.500' : 'xwhite.024'}
              borderRadius="lg"
              justifyContent="space-between"
              onClick={() => setNext(true)}
              cursor="pointer"
            >
              <Flex direction="column">
                <Text color="white" fontSize={['16px', '14px']}>
                  {t('Become an Idena validator')}
                </Text>
                <Text color="muted" fontSize={['14px', 'md']}>
                  {t('Run Idena node, vote, invite other participants')}
                </Text>
              </Flex>
              <Flex>
                <FlagIcon mt={1} boxSize={5} />
              </Flex>
            </Flex>
            <Flex
              p={4}
              border="solid"
              borderWidth={!next ? '2px' : '1px'}
              borderColor={!next ? 'blue.500' : 'xwhite.024'}
              borderRadius="lg"
              justifyContent="space-between"
              onClick={() => setNext(false)}
              cursor="pointer"
            >
              <Flex direction="column">
                <Text color="white" fontSize={['16px', '14px']}>
                  {t('Do it later')}
                </Text>
              </Flex>
              <Flex>
                <HandIcon mt={1} boxSize={5} />
              </Flex>
            </Flex>
          </Stack>
        </Flex>
        <Flex direction="column" display={step === 6 ? 'flex' : 'none'}>
          <Text fontSize={['20px', '18px']} fontWeight={500}>
            {t('Earn quadratic staking rewards')}
          </Text>
          <Text mt={2} color="muted" fontSize={['16px', '14px']}>
            {t('Participate in the democratic rewards distribution.')}
          </Text>
          <Image mt={8} src="/static/welcome/step-6.png" />
        </Flex>
        <Flex direction="column" display={step === 7 ? 'flex' : 'none'}>
          <Text fontSize={['20px', '18px']} fontWeight={500}>
            {t('Validate your account')}
          </Text>
          <Text mt={2} color="muted" fontSize={['16px', '14px']}>
            {t(
              'Prove you’re human by participating in the validation ceremony'
            )}
          </Text>
          <Image mt={8} src="/static/welcome/step-7.png" />
        </Flex>
        <Flex mt={['auto', 5]} justifyContent="space-between" w="full">
          <Button
            variant="link"
            color="blue.500"
            display={['none', 'flex']}
            onClick={() => router.push('/home')}
          >
            {t('Skip')}
          </Button>
          <PrimaryButton
            w={['full', 'auto']}
            size={buttonSize}
            onClick={async () => {
              if (step === 5) {
                if (next) {
                  return setStep(step + 1)
                }
                return router.push('/home')
              }
              if (step === 7) {
                await scheduleValidation(CertificateType.Sample)
                return router.push('/try/lottery')
              }
              return setStep(step + 1)
            }}
          >
            {step === 7 ? t('Start training') : t('Next')}
          </PrimaryButton>
        </Flex>
      </AuthLayout.New>
    </AuthLayout>
  )
}
