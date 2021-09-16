import {DownloadIcon} from '@chakra-ui/icons'
import {Alert, Flex, Link, RadioGroup, Stack, Text} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {ChooseItemRadio} from '../../screens/node/components'
import {
  getCandidateKey,
  checkKey,
  fetchIdentity,
  getAvailableProviders,
  getProvider,
  getRawTx,
  activateKey,
} from '../../shared/api'

import {SubHeading} from '../../shared/components'
import {PrimaryButton} from '../../shared/components/button'
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

export default function Offline() {
  const {t} = useTranslation()
  const {apiKeyState, apiKey} = useSettingsState()
  const {coinbase, privateKey} = useAuthState()
  const router = useRouter()

  const [unavailableProvider, setUnavailableProvider] = useState(null)
  const [state, setState] = useState(options.BUY)

  const [identityState, setIdentityState] = useState('')

  const [submitting, setSubmitting] = useState(false)

  const failToast = useFailToast()

  const {isPurchasing, savePurchase, setRestrictedKey} = useApikeyPurchasing()

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
        if (identityState === IdentityStatus.Invite) {
          return activateInvite()
        }
        return router.push('/node/activate')
      }
      case options.CANDIDATE:
        return getKeyForCandidate()
      case options.RESTRICTED: {
        console.log('go go go')
        setRestrictedKey()
        return router.push('/')
      }
      default:
    }
  }

  useEffect(() => {
    if (
      apiKeyState === apiKeyStates.ONLINE ||
      apiKeyState === apiKeyStates.EXTERNAL
    )
      router.push('/')
  }, [apiKeyState, router])

  useEffect(() => {
    async function check() {
      try {
        const result = await checkKey(apiKey)
        const res = await getProvider(result.provider)
        setUnavailableProvider({name: res.data.ownerName, url: res.data.url})
      } catch (e) {
        setUnavailableProvider(null)
      }
    }

    check()
  }, [apiKey])

  useEffect(() => {
    async function load() {
      try {
        const identity = await fetchIdentity(coinbase, true)
        setIdentityState(identity.state)
        // eslint-disable-next-line no-empty
      } catch (e) {}
    }
    load()
  }, [coinbase])

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
        <Flex flexGrow={1} align="center" justify="center" mt="44px">
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
                    {[IdentityStatus.Undefined, IdentityStatus.Invite].includes(
                      identityState
                    ) && (
                      <ChooseItemRadio
                        isChecked={state === options.ACTIVATE}
                        onChange={() => setState(options.ACTIVATE)}
                      >
                        <Text color="white">{t('Activate invite')}</Text>
                      </ChooseItemRadio>
                    )}
                    {identityState === IdentityStatus.Candidate && (
                      <ChooseItemRadio
                        isChecked={state === options.CANDIDATE}
                        onChange={() => setState(options.CANDIDATE)}
                      >
                        <Text color="white">
                          {t('Get free access (only for Candidates)')}
                        </Text>
                      </ChooseItemRadio>
                    )}
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
            </Flex>
          </Flex>
          {unavailableProvider && (
            <Alert
              status="error"
              bg="red.500"
              borderWidth="1px"
              borderColor="red.050"
              fontWeight={500}
              color="white"
              rounded="md"
              px={6}
              py={4}
              w="480px"
              mt={2}
            >
              <Flex direction="column" fontSize="mdx">
                <Flex>
                  <Flex>
                    {t('The node is unavailable:', {
                      nsSeparator: '|',
                    })}
                  </Flex>
                  <Flex ml={1}>{unavailableProvider.url}</Flex>
                </Flex>
                <Flex>
                  <Flex>
                    {t('Please contact the node owner:', {
                      nsSeparator: '|',
                    })}
                  </Flex>
                  <Link
                    href={`https://t.me/${unavailableProvider.name}`}
                    target="_blank"
                    ml={1}
                  >
                    {unavailableProvider.name}
                    {' >'}
                  </Link>
                </Flex>
              </Flex>
            </Alert>
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
            Download Idena
          </TextLink>
        </Flex>
      </Flex>
    </Layout>
  )
}
