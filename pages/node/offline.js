import {DownloadIcon} from '@chakra-ui/icons'
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogCloseButton,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Flex,
  RadioGroup,
  Stack,
  Text,
  useDisclosure,
} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useEffect, useRef, useState} from 'react'
import {Trans, useTranslation} from 'react-i18next'
import {useQuery} from 'react-query'
import {
  ChooseItemRadio,
  KeyExpiredAlert,
  NodeOfflineAlert,
  ProviderOfflineAlert,
} from '../../screens/node/components'
import {
  getCandidateKey,
  checkKey,
  fetchIdentity,
  getAvailableProviders,
  getProvider,
  getRawTx,
  activateKey,
  checkProvider,
} from '../../shared/api'

import {SubHeading} from '../../shared/components'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {Avatar, TextLink} from '../../shared/components/components'
import Layout from '../../shared/components/layout'
import useApikeyPurchasing from '../../shared/hooks/use-apikey-purchasing'
import {useFailToast} from '../../shared/hooks/use-toast'
import {Transaction} from '../../shared/models/transaction'
import {useAuthState} from '../../shared/providers/auth-context'
import {
  apiKeyStates,
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

const options = {
  BUY: 0,
  ENTER_KEY: 1,
  ACTIVATE: 2,
  CANDIDATE: 3,
  RESTRICTED: 4,
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
  const {coinbase, privateKey} = useAuthState()
  const router = useRouter()

  const {isOpen, onOpen, onClose} = useDisclosure()
  const cancelRef = useRef()

  const [error, setError] = useState({type: errorType.NONE})
  const [state, setState] = useState(options.BUY)
  const [step, setStep] = useState(steps.INITIAL)

  const [submitting, setSubmitting] = useState(false)

  const failToast = useFailToast()

  const {isPurchasing, savePurchase, setRestrictedKey} = useApikeyPurchasing()

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
      default:
    }
  }

  useEffect(() => {
    if (
      apiKeyState === apiKeyStates.ONLINE ||
      apiKeyState === apiKeyStates.EXTERNAL
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
          await checkProvider(url)
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
    }
  }, [identity])

  const waiting = submitting || isPurchasing

  return (
    <Layout canRedirect={false}>
      <Flex
        bg="graphite.500"
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
          justify="center"
          mt="44px"
          direction="column"
        >
          <Flex direction="column" maxWidth="480px">
            <Flex>
              <Avatar address={coinbase} />
              <Flex direction="column" justify="center" flex="1" ml={5}>
                <SubHeading color="white" css={{wordBreak: 'break-word'}}>
                  {coinbase}
                </SubHeading>
              </Flex>
            </Flex>
            <Flex
              direction="column"
              mt={6}
              bg="gray.500"
              borderRadius="lg"
              px={10}
              py={7}
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
                  <Flex>
                    <Text color="white" fontSize="lg">
                      {t('Connect to Idena node')}
                    </Text>
                  </Flex>

                  <Flex mt={7}>
                    <Text color="white" fontSize="sm" opacity={0.5}>
                      {t('Choose an option')}
                    </Text>
                  </Flex>
                  <Flex mt={4}>
                    <RadioGroup>
                      <Stack direction="column" spacing={3}>
                        {identity?.state === IdentityStatus.Candidate && (
                          <ChooseItemRadio
                            isChecked={state === options.CANDIDATE}
                            onChange={() => setState(options.CANDIDATE)}
                          >
                            <Text color="white">{t('Get free access')}</Text>
                          </ChooseItemRadio>
                        )}
                        <ChooseItemRadio
                          isChecked={state === options.BUY}
                          onChange={() => setState(options.BUY)}
                        >
                          <Text color="white">{t('Rent a shared node')}</Text>
                        </ChooseItemRadio>
                        <ChooseItemRadio
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
                            isChecked={state === options.RESTRICTED}
                            onChange={() => setState(options.RESTRICTED)}
                          >
                            <Text color="white">
                              {t(
                                'Get restricted access (can not be used for validation)'
                              )}
                            </Text>
                          </ChooseItemRadio>
                        )}
                      </Stack>
                    </RadioGroup>
                  </Flex>
                  <Flex mt="30px" mb={2}>
                    <PrimaryButton
                      ml="auto"
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
          {error.type === errorType.PROVIDER_UNAVAILABLE && (
            <ProviderOfflineAlert url={error.url} provider={error.provider} />
          )}
          {error.type === errorType.KEY_EXPIRED && (
            <KeyExpiredAlert url={error.url} apiKey={apiKey} />
          )}
          {error.type === errorType.NODE_UNAVAILABLE && (
            <NodeOfflineAlert url={url} />
          )}
        </Flex>
        <Flex
          justify="center"
          mb={8}
          direction="column"
          justifyContent="center"
        >
          <Text color="white" fontSize="mdx" opacity="0.5" mb={1}>
            You can run your own node at your desktop computer.
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
        motionPreset="slideInBottom"
        leastDestructiveRef={cancelRef}
        onClose={onClose}
        isOpen={isOpen}
        isCentered
      >
        <AlertDialogOverlay />

        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg">
            {t('Are you sure?')}
          </AlertDialogHeader>
          <AlertDialogCloseButton />
          <AlertDialogBody fontSize="md">
            <Trans i18nKey="confirmRestrictedNodeDialog" t={t}>
              Your current API key{' '}
              <Text fontWeight="700" as="span">
                {apiKey}
              </Text>{' '}
              for the shared node{' '}
              <Text fontWeight="700" as="span">
                {url}
              </Text>{' '}
              will be lost
            </Trans>
          </AlertDialogBody>
          <AlertDialogFooter>
            <SecondaryButton
              onClick={() => {
                setRestrictedKey()
                onClose()
                router.push('/home')
              }}
            >
              {t('Yes')}
            </SecondaryButton>
            <PrimaryButton ref={cancelRef} onClick={onClose} ml={2}>
              {t('Cancel')}
            </PrimaryButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  )
}
