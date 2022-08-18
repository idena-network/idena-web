import {DownloadIcon} from '@chakra-ui/icons'
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogCloseButton,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Heading,
  Button,
  Flex,
  RadioGroup,
  Stack,
  Text,
  useBreakpointValue,
  useDisclosure,
  useMediaQuery,
  Divider,
} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import React, {useEffect, useRef, useState} from 'react'
import {Trans, useTranslation} from 'react-i18next'
import {useQuery} from 'react-query'
import {
  ChooseItemRadio,
  KeyExpiredAlert,
  NodeOfflineAlert,
  ProviderOfflineAlert,
} from '../../screens/node/components'
import {checkRestoringConnection} from '../../screens/node/utils'
import {
  getCandidateKey,
  checkKey,
  fetchIdentity,
  getAvailableProviders,
  getProvider,
  getRawTx,
  activateKey,
  checkProvider,
  checkSavedKey,
} from '../../shared/api'

import {PrimaryButton} from '../../shared/components/button'
import {Avatar, TextLink} from '../../shared/components/components'
import Layout from '../../shared/components/layout'
import useApikeyPurchasing from '../../shared/hooks/use-apikey-purchasing'
import {useFailToast} from '../../shared/hooks/use-toast'
import {Transaction} from '../../shared/models/transaction'
import {useAuthState} from '../../shared/providers/auth-context'
import {
  ApiKeyStates,
  useSettingsDispatch,
  useSettingsState,
} from '../../shared/providers/settings-context'
import {IdentityStatus} from '../../shared/types'
import {sendActivateInvitation} from '../../shared/utils/analytics'
import {hexToUint8Array, toHexString} from '../../shared/utils/buffers'
import {
  privateKeyToAddress,
  privateKeyToPublicKey,
  signMessage,
} from '../../shared/utils/crypto'
import {promiseTimeout} from '../../shared/utils/utils'

const options = {
  BUY: 0,
  ENTER_KEY: 1,
  ACTIVATE: 2,
  CANDIDATE: 3,
  RESTRICTED: 4,
  RESTORE: 5,
}

const steps = {
  INITIAL: 0,
  CONNECT: 1,
}

const errorType = {
  NONE: 0,
  NODE_UNAVAILABLE: 1,
  PROVIDER_UNAVAILABLE: 2,
  KEY_EXPIRED: 3,
}

export default function Offline() {
  const {t} = useTranslation()
  const {apiKeyState, apiKey, url} = useSettingsState()
  const {saveConnection} = useSettingsDispatch()
  const {coinbase, privateKey} = useAuthState()
  const router = useRouter()

  const {isOpen, onOpen, onClose} = useDisclosure()
  const cancelRef = useRef()

  const [error, setError] = useState({type: errorType.NONE})
  const [state, setState] = useState(options.BUY)
  const [step, setStep] = useState(steps.INITIAL)

  const [savedApiKey, setSavedApiKey] = useState()

  const [submitting, setSubmitting] = useState(false)

  const failToast = useFailToast()

  const {isPurchasing, savePurchase, setRestrictedKey} = useApikeyPurchasing()

  const [isDesktop] = useMediaQuery('(min-width: 481px)')
  const size = useBreakpointValue(['lg', 'md'])
  const variant = useBreakpointValue(['mobile', 'initial'])
  const variantRadio = useBreakpointValue(['mobileDark', 'initial'])
  const variantPrimary = useBreakpointValue(['primaryFlat', 'primary'])
  const variantSecondary = useBreakpointValue(['secondaryFlat', 'secondary'])

  const {data: identity} = useQuery(
    ['fetch-identity', coinbase],
    () => fetchIdentity(coinbase, true),
    {
      enabled: !!coinbase,
    }
  )

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

  const activateInvite = async () => {
    setSubmitting(true)

    try {
      const from = privateKeyToAddress(privateKey)

      const rawTx = await getRawTx(
        1,
        from,
        coinbase,
        0,
        0,
        privateKeyToPublicKey(privateKey),
        0,
        true
      )

      const tx = new Transaction().fromHex(rawTx)
      tx.sign(privateKey)

      const providers = await getAvailableProviders()

      const result = await activateKey(coinbase, `0x${tx.toHex()}`, providers)
      savePurchase(result.id, result.provider)
      sendActivateInvitation(coinbase)
    } catch (e) {
      failToast(
        `Failed to activate invite: ${
          e.response ? e.response.data : 'invitation is invalid'
        }`
      )
    } finally {
      setSubmitting(false)
    }
  }

  const process = async () => {
    switch (state) {
      case options.ENTER_KEY:
        return router.push('/settings/node')
      case options.BUY:
        return router.push('/node/rent')
      case options.ACTIVATE: {
        if (identity?.state === IdentityStatus.Invite) {
          return activateInvite()
        }
        return router.push('/node/activate')
      }
      case options.CANDIDATE:
        return getKeyForCandidate()
      case options.RESTRICTED: {
        return onOpen()
      }
      case options.RESTORE: {
        return saveConnection(savedApiKey.url, savedApiKey.key, false)
      }
      default:
    }
  }

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
    async function check() {
      try {
        const result = await checkKey(apiKey)
        const res = await getProvider(result.provider)

        if (new URL(url).host !== new URL(res.data.url).host) {
          throw new Error()
        }

        try {
          await promiseTimeout(checkProvider(url), 2000)
          setError({type: errorType.KEY_EXPIRED})
        } catch (e) {
          setError({
            type: errorType.PROVIDER_UNAVAILABLE,
            provider: res.data.ownerName,
          })
        }
      } catch (e) {
        setError({type: errorType.NODE_UNAVAILABLE})
      }
    }

    check()
  }, [apiKey, url])

  useEffect(() => {
    if (identity?.state === IdentityStatus.Candidate) {
      setState(options.CANDIDATE)
    } else if (savedApiKey) {
      setState(options.RESTORE)
    }
  }, [identity, savedApiKey])

  const waiting = submitting || isPurchasing

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
              align={['center', 'flex-start']}
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
                <Heading
                  fontSize={['mdx', 'lg']}
                  fontWeight={[400, 500]}
                  color={['muted', 'white']}
                  wordBreak="break-word"
                >
                  {coinbase}
                </Heading>
              </Flex>
            </Flex>
            <Flex
              direction="column"
              mt={6}
              bg="gray.500"
              borderRadius="lg"
              px={[6, 10]}
              py={7}
              w={['100%', 'auto']}
            >
              {step === steps.INITIAL && (
                <Flex direction="column" alignItems="center" mt={6}>
                  <Flex>
                    <Text color="white" fontSize="lg">
                      {t('Offline')}
                    </Text>
                  </Flex>

                  <Flex mt={4}>
                    <Text fontSize="mdx" color="muted" textAlign="center">
                      {t('Please connect to a shared node')}
                    </Text>
                  </Flex>
                  <Flex justifyContent="center" mt={6}>
                    <PrimaryButton onClick={() => setStep(steps.CONNECT)}>
                      {t('New connection')}
                    </PrimaryButton>
                  </Flex>
                </Flex>
              )}
              {step === steps.CONNECT && (
                <>
                  <Flex justify={['center', ' flex-start']}>
                    <Text color="white" fontSize="lg">
                      {t('Connect to Idena node')}
                    </Text>
                  </Flex>

                  <Flex mt={7}>
                    <Text color="white" fontSize="sm" opacity={0.5}>
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
                        {identity?.state === IdentityStatus.Candidate && (
                          <ChooseItemRadio
                            variant={variantRadio}
                            px={[4, 0]}
                            isChecked={state === options.CANDIDATE}
                            onChange={() => setState(options.CANDIDATE)}
                          >
                            <Text color="white">{t('Get free access')}</Text>
                          </ChooseItemRadio>
                        )}
                        <ChooseItemRadio
                          variant={variantRadio}
                          px={[4, 0]}
                          isChecked={state === options.BUY}
                          onChange={() => setState(options.BUY)}
                        >
                          <Text color="white">{t('Rent a shared node')}</Text>
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
                        {[
                          IdentityStatus.Undefined,
                          IdentityStatus.Invite,
                        ].includes(identity?.state) && (
                          <ChooseItemRadio
                            variant={variantRadio}
                            px={[4, 0]}
                            isChecked={state === options.ACTIVATE}
                            onChange={() => setState(options.ACTIVATE)}
                          >
                            <Text color="white">
                              {t('Activate invitation')}
                            </Text>
                          </ChooseItemRadio>
                        )}
                        {identity?.state !== IdentityStatus.Candidate && (
                          <ChooseItemRadio
                            variant={variantRadio}
                            px={[4, 0]}
                            isChecked={state === options.RESTRICTED}
                            onChange={() => setState(options.RESTRICTED)}
                          >
                            <Text
                              lineHeight={['16px', 'initial']}
                              color="white"
                            >
                              {`${t('Get restricted access')}${
                                isDesktop
                                  ? ` (${t(
                                      'Can not be used for validation'
                                    ).toLocaleLowerCase()})`
                                  : ''
                              }`}
                            </Text>
                            <Text
                              display={['inline-block', 'none']}
                              color="xwhite.050"
                              fontSize="sm"
                            >
                              {t('Can not be used for validation')}
                            </Text>
                          </ChooseItemRadio>
                        )}
                      </Stack>
                    </RadioGroup>
                  </Flex>
                  <Flex mt={[4, '30px']} mb={2}>
                    <PrimaryButton
                      size={size}
                      ml="auto"
                      w={['100%', 'auto']}
                      onClick={process}
                      isDisabled={waiting}
                      isLoading={waiting}
                      loadingText="Waiting..."
                    >
                      {t('Continue')}
                    </PrimaryButton>
                  </Flex>
                </>
              )}
            </Flex>
          </Flex>

          {step === steps.INITIAL &&
            error.type === errorType.PROVIDER_UNAVAILABLE && (
              <ProviderOfflineAlert url={url} provider={error.provider} />
            )}
          {step === steps.INITIAL && error.type === errorType.KEY_EXPIRED && (
            <KeyExpiredAlert url={url} apiKey={apiKey} />
          )}
          {step === steps.INITIAL &&
            error.type === errorType.NODE_UNAVAILABLE && (
              <NodeOfflineAlert url={url} />
            )}
        </Flex>
        <Flex
          display={['none', 'flex']}
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
      <AlertDialog
        variant={variant}
        motionPreset="slideInBottom"
        leastDestructiveRef={cancelRef}
        onClose={onClose}
        isOpen={isOpen}
        isCentered
      >
        <AlertDialogOverlay />

        <AlertDialogContent mx={[3, 'auto']}>
          <AlertDialogHeader fontSize="lg">
            {t('Are you sure?')}
          </AlertDialogHeader>
          <AlertDialogCloseButton />
          <AlertDialogBody fontSize={['mobile', 'md']}>
            <Trans i18nKey="confirmRestrictedNodeDialog" t={t}>
              Your current API key{' '}
              <Text fontWeight="700" as="span">
                {{apiKey}}
              </Text>{' '}
              for the shared node{' '}
              <Text fontWeight="700" as="span">
                {{url}}
              </Text>{' '}
              will be lost
            </Trans>
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button
              variant={variantSecondary}
              size={size}
              w={['100%', 'auto']}
              onClick={() => {
                setRestrictedKey()
                onClose()
                router.push('/home')
              }}
            >
              {t('Yes')}
            </Button>
            <Divider
              display={['block', 'none']}
              h={10}
              orientation="vertical"
              color="gray.100"
            />
            <Button
              variant={variantPrimary}
              w={['100%', 'auto']}
              size={size}
              ref={cancelRef}
              onClick={onClose}
              ml={2}
            >
              {t('Cancel')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  )
}
