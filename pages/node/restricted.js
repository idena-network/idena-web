import {DownloadIcon} from '@chakra-ui/icons'
import {
  Checkbox,
  Flex,
  Button,
  RadioGroup,
  Stack,
  Text,
  useBreakpointValue,
  useDisclosure,
  Box,
} from '@chakra-ui/react'
import dayjs from 'dayjs'
import {useRouter} from 'next/router'
import React, {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useQuery} from 'react-query'
import {
  BuySharedNodeForm,
  ChooseItemRadio,
  NotNowDialog,
  ValidationCountdown,
} from '../../screens/node/components'
import {
  checkRestoringConnection,
  GetProviderPrice,
} from '../../screens/node/utils'
import {
  checkSavedKey,
  getAvailableProviders,
  getCandidateKey,
  getProvider,
} from '../../shared/api'

import {SubHeading} from '../../shared/components'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {Avatar, TextLink} from '../../shared/components/components'
import Layout from '../../shared/components/layout'
import useApikeyPurchasing from '../../shared/hooks/use-apikey-purchasing'
import {FORCE_SHOW_BEFORE_VALIDATION_MINUTES} from '../../shared/hooks/use-expired'
import {useFailToast} from '../../shared/hooks/use-toast'
import {useAppContext} from '../../shared/providers/app-context'
import {useAuthState} from '../../shared/providers/auth-context'
import {useEpoch} from '../../shared/providers/epoch-context'
import {useIdentity} from '../../shared/providers/identity-context'
import {
  ApiKeyStates,
  useSettings,
  useSettingsDispatch,
} from '../../shared/providers/settings-context'
import {IdentityStatus} from '../../shared/types'
import {hexToUint8Array, toHexString} from '../../shared/utils/buffers'
import {signMessage} from '../../shared/utils/crypto'

const options = {
  PROLONG: 0,
  BUY: 1,
  ENTER_KEY: 2,
  CANDIDATE: 3,
  RESTORE: 4,
}

const steps = {
  INITIAL: 0,
  CONNECT: 1,
  VALIDATION: 2,
}

export default function Restricted() {
  const [{apiKeyState, apiKeyData, apiKey}] = useSettings()
  const {saveConnection} = useSettingsDispatch()
  const {coinbase, privateKey} = useAuthState()
  const [{state: identityState, age}] = useIdentity()
  const auth = useAuthState()
  const router = useRouter()
  const {t} = useTranslation()
  const epochState = useEpoch()

  const [, {updateRestrictedNotNow}] = useAppContext()

  const [step, setStep] = useState(steps.INITIAL)
  const [state, setState] = useState(options.PROLONG)
  const [dontShow, setDontShow] = useState(false)

  const buySharedNodeDisclosure = useDisclosure()

  const notNowDisclosure = useDisclosure()

  const [submitting, setSubmitting] = useState(false)

  const failToast = useFailToast()

  const {isPurchasing, savePurchase} = useApikeyPurchasing()

  const [savedApiKey, setSavedApiKey] = useState()

  const size = useBreakpointValue(['lg', 'md'])
  const variantRadio = useBreakpointValue(['mobileDark', 'initial'])
  const variantSecondary = useBreakpointValue(['primaryFlat', 'secondary'])

  const notNow = forceDialog => {
    if (dontShow || forceDialog) {
      return notNowDisclosure.onOpen()
    }

    router.back()
  }

  const getKeyForCandidate = async () => {
    setSubmitting(true)

    try {
      const providers = await getAvailableProviders()
      const signature = signMessage(hexToUint8Array(coinbase), privateKey)
      const result = await getCandidateKey(
        coinbase,
        toHexString(signature, true),
        providers
      )
      savePurchase(result.id, result.provider)
    } catch (e) {
      failToast(
        `Failed to get API key for Candidate: ${
          e.response ? e.response.data : 'unknown error'
        }`
      )
    } finally {
      setSubmitting(false)
    }
  }

  const process = async () => {
    if (state === options.PROLONG) {
      buySharedNodeDisclosure.onOpen()
    } else if (state === options.ENTER_KEY) {
      return router.push('/settings/node')
    } else if (state === options.CANDIDATE) {
      return getKeyForCandidate()
    } else if (state === options.RESTORE) {
      return saveConnection(savedApiKey.url, savedApiKey.key, false)
    } else return router.push('/node/rent')
  }

  const {data: provider, isError} = useQuery(
    ['get-provider-by-id', apiKeyData && apiKeyData.provider],
    () => getProvider(apiKeyData && apiKeyData.provider),
    {
      enabled: !!apiKeyData && !!apiKeyData.provider,
      retry: false,
      refetchOnWindowFocus: false,
    }
  )

  useEffect(() => {
    if (
      epochState &&
      dayjs(epochState.nextValidation).diff(dayjs(), 'minute') <
        FORCE_SHOW_BEFORE_VALIDATION_MINUTES
    ) {
      setStep(steps.VALIDATION)
    }
  }, [epochState])

  useEffect(() => {
    async function checkSaved() {
      try {
        const signature = signMessage(hexToUint8Array(coinbase), privateKey)
        const savedKey = await checkSavedKey(
          coinbase,
          toHexString(signature, true)
        )
        if (await checkRestoringConnection(savedKey.url, savedKey.key))
          setSavedApiKey(savedKey)
        // eslint-disable-next-line no-empty
      } catch (e) {}
    }
    checkSaved()
  }, [apiKey, coinbase, privateKey])

  useEffect(() => {
    if (
      apiKeyState === ApiKeyStates.ONLINE ||
      apiKeyState === ApiKeyStates.EXTERNAL
    )
      router.push('/home')
  }, [apiKeyState, router])

  useEffect(() => {
    if (identityState === IdentityStatus.Candidate) {
      setState(options.CANDIDATE)
    } else if (savedApiKey) {
      setState(options.RESTORE)
    } else if ((provider && !provider.slots) || isError) {
      setState(options.BUY)
    }
  }, [identityState, isError, provider, savedApiKey])

  const waiting = submitting || isPurchasing

  const canProlong = provider && provider.slots && !waiting

  return (
    <Layout canRedirect={false}>
      <Flex
        bg={['gray.500', 'graphite.500']}
        alignItems="center"
        justifyContent="center"
        height="100%"
        direction="column"
        justify="center"
        flex="1"
      >
        <Flex
          flexGrow={1}
          align="center"
          justify={['flex-start', 'center']}
          mt="44px"
          mx={[3, 0]}
          direction="column"
        >
          <Flex
            direction="column"
            align={['center', 'initial']}
            maxWidth={['100%', '480px']}
          >
            <Flex
              direction={['column', 'row']}
              align="center"
              textAlign={['center', 'initial']}
              w={['60%', 'auto']}
            >
              <Avatar address={coinbase} />
              <Flex
                direction="column"
                justify="center"
                flex="1"
                ml={[0, 5]}
                mt={[5, 0]}
              >
                <SubHeading
                  fontSize={['mdx', 'lg']}
                  fontWeight={[400, 500]}
                  color={['muted', 'white']}
                  wordBreak="break-word"
                >
                  {auth.coinbase}
                </SubHeading>
              </Flex>
            </Flex>
            <Flex
              direction="column"
              mt={6}
              bg="xwhite.010"
              borderRadius="lg"
              px={[6, 10]}
              py={7}
              w={['100%', 'auto']}
            >
              {step === steps.INITIAL && (
                <Flex direction="column" alignItems="center" mt={6}>
                  <Flex>
                    <Text color="white" fontSize="lg">
                      {t('Restricted access')}
                    </Text>
                  </Flex>

                  <Flex mt={4}>
                    <Text fontSize="mdx" color="muted" textAlign="center">
                      {t(
                        'Restricted access does not allow you to participate in the upcoming validation. To get full access please connect to a shared node.'
                      )}
                    </Text>
                  </Flex>
                  <Flex justifyContent="center" mt={4}>
                    <PrimaryButton
                      onClick={() => {
                        setDontShow(false)
                        setStep(steps.CONNECT)
                      }}
                    >
                      {t('Get full access')}
                    </PrimaryButton>
                  </Flex>
                  <Flex
                    mt={10}
                    justifyContent="space-between"
                    alignSelf="normal"
                  >
                    <Flex>
                      <Checkbox
                        textAlign={['left', 'initial']}
                        value={dontShow}
                        isChecked={dontShow}
                        onChange={e => setDontShow(e.target.checked)}
                        color="white"
                      >
                        {t('Don’t show again')}
                      </Checkbox>
                    </Flex>
                    <Flex>
                      <SecondaryButton onClick={() => notNow(false)}>
                        {t('Not now')}
                      </SecondaryButton>
                    </Flex>
                  </Flex>
                </Flex>
              )}
              {step === steps.VALIDATION && (
                <Stack spacing={4} mt={6} mb={4}>
                  <Flex>
                    <Text color="white" fontSize="lg">
                      {t('Restricted access')}
                    </Text>
                  </Flex>

                  <Text fontSize="mdx" color="muted">
                    {t(
                      'Restricted access does not allow you to participate in the upcoming validation. To get full access please connect to a shared node.'
                    )}{' '}
                    {t('Left before validation:')}
                  </Text>
                  <Box pt={4}>
                    <ValidationCountdown />
                  </Box>
                  <Flex justifyContent="flex-end">
                    <PrimaryButton
                      onClick={() => {
                        setDontShow(false)
                        setStep(steps.CONNECT)
                      }}
                    >
                      {t('Get full access')}
                    </PrimaryButton>
                  </Flex>
                </Stack>
              )}
              {step === steps.CONNECT && (
                <>
                  <Flex justify={['center', ' flex-start']}>
                    <Text color="white" fontSize="lg">
                      {t('Connect to a shared node')}
                    </Text>
                  </Flex>

                  <Flex mt={7}>
                    <Text color="muted" fontSize="sm">
                      {t('Choose an option')}
                    </Text>
                  </Flex>
                  <Flex mt={[2, 4]}>
                    <RadioGroup w={['100%', 'auto']}>
                      <Stack direction="column" spacing={[1, 3]}>
                        {savedApiKey && savedApiKey.url !== apiKey.url && (
                          <ChooseItemRadio
                            variant={variantRadio}
                            px={[4, 0]}
                            isChecked={state === options.RESTORE}
                            onChange={() => setState(options.RESTORE)}
                            alignItems={['center', 'flex-start']}
                          >
                            <Flex direction="column" mt={['auto', '-2px']}>
                              <Text color="white">
                                {t('Restore connection')}
                              </Text>
                              <Text color="muted" fontSize="sm">
                                {savedApiKey.url}
                              </Text>
                            </Flex>
                          </ChooseItemRadio>
                        )}
                        {identityState === IdentityStatus.Candidate && (
                          <ChooseItemRadio
                            variant={variantRadio}
                            px={[4, 0]}
                            isChecked={state === options.CANDIDATE}
                            onChange={() => setState(options.CANDIDATE)}
                          >
                            <Text color="white">{t('Get free access')}</Text>
                          </ChooseItemRadio>
                        )}
                        {canProlong && (
                          <ChooseItemRadio
                            variant={variantRadio}
                            px={[4, 0]}
                            isChecked={state === options.PROLONG}
                            onChange={() => setState(options.PROLONG)}
                            alignItems={['center', 'flex-start']}
                          >
                            <Flex direction="column" mt={['auto', '-2px']}>
                              <Text color="white">
                                {t('Prolong node access')}{' '}
                                {`(${GetProviderPrice(
                                  provider.data,
                                  identityState,
                                  age
                                )} iDNA)`}
                              </Text>
                              <Text color="muted" fontSize="sm">
                                {provider.data.url}
                              </Text>
                            </Flex>
                          </ChooseItemRadio>
                        )}
                        <ChooseItemRadio
                          variant={variantRadio}
                          px={[4, 0]}
                          isChecked={state === options.BUY}
                          onChange={() => setState(options.BUY)}
                        >
                          <Text color="white">
                            {canProlong
                              ? t('Rent another shared node')
                              : t('Rent a shared node')}
                          </Text>
                        </ChooseItemRadio>
                        <ChooseItemRadio
                          variant={variantRadio}
                          px={[4, 0]}
                          isChecked={state === options.ENTER_KEY}
                          onChange={() => setState(options.ENTER_KEY)}
                        >
                          <Text color="white">
                            {t('Enter shared node API key')}
                          </Text>
                        </ChooseItemRadio>
                      </Stack>
                    </RadioGroup>
                  </Flex>
                  <Flex mt={[4, 10]} justifyContent="space-between">
                    <Flex
                      direction={['column', 'row']}
                      ml="auto"
                      w={['100%', 'auto']}
                    >
                      <Button
                        variant={variantSecondary}
                        order={[2, 1]}
                        size={size}
                        w={['100%', 'auto']}
                        onClick={() => notNow(true)}
                        mr={[0, 2]}
                        mt={[2, 0]}
                      >
                        {t('Not now')}
                      </Button>
                      <PrimaryButton
                        order={[1, 2]}
                        size={size}
                        w={['100%', 'auto']}
                        onClick={process}
                        isDisabled={waiting}
                        isLoading={waiting}
                        loadingText="Waiting..."
                      >
                        {t('Continue')}
                      </PrimaryButton>
                    </Flex>
                  </Flex>
                </>
              )}
            </Flex>
          </Flex>
        </Flex>
        <Flex
          justify="center"
          mb={8}
          direction="column"
          justifyContent="center"
        >
          <Text color="white" fontSize="mdx" opacity="0.5" mb={1}>
            {t('You can run your own node at your desktop computer.')}
          </Text>
          <TextLink
            href="https://idena.io/download"
            target="_blank"
            color="white"
            textAlign="center"
          >
            <DownloadIcon boxSize={4} mx={2} />
            {t('Download Idena')}
          </TextLink>
        </Flex>
      </Flex>
      {provider && (
        <BuySharedNodeForm
          {...buySharedNodeDisclosure}
          providerId={provider.id}
          url={provider.data.url}
          from={coinbase}
          amount={GetProviderPrice(provider.data, identityState, age)}
          to={provider.data.address}
        />
      )}
      <NotNowDialog
        {...notNowDisclosure}
        onContinue={() => {
          updateRestrictedNotNow(dontShow)
          router.back()
        }}
      />
    </Layout>
  )
}
