import {InfoOutlineIcon} from '@chakra-ui/icons'
import {Alert, Flex, Link, Radio, RadioGroup, Stack} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {padding} from 'polished'
import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useQuery} from 'react-query'
import {
  getCandidateKey,
  checkKey,
  fetchIdentity,
  getAvailableProviders,
  getProvider,
  getKeyById,
} from '../../shared/api'

import {SubHeading, Text} from '../../shared/components'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {Avatar} from '../../shared/components/components'
import Layout from '../../shared/components/layout'
import {useAuthState} from '../../shared/providers/auth-context'
import {useNotificationDispatch} from '../../shared/providers/notification-context'
import {
  apiKeyStates,
  useSettingsDispatch,
  useSettingsState,
} from '../../shared/providers/settings-context'
import theme, {rem} from '../../shared/theme'
import {IdentityStatus} from '../../shared/types'
import {hexToUint8Array, toHexString} from '../../shared/utils/buffers'
import {signMessage} from '../../shared/utils/crypto'

const options = {
  BUY: 0,
  ENTER_KEY: 1,
  ACTIVATE: 2,
  CANDIDATE: 3,
}

export default function Offline() {
  const {t} = useTranslation()
  const {apiKeyState, apiKey} = useSettingsState()
  const {coinbase, privateKey} = useAuthState()
  const router = useRouter()

  const [unavailableProvider, setUnavailableProvider] = useState()
  const [state, setState] = useState(options.BUY)

  const [identityState, setIdentityState] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const {addError} = useNotificationDispatch()

  const {apiKeyId, apiKeyData} = useSettingsState()

  const {addPurchase, addPurchasedKey} = useSettingsDispatch()

  const {isLoading, data} = useQuery(
    ['get-key-by-id', apiKeyId],
    () => getKeyById(apiKeyId),
    {
      enabled: !!apiKeyId,
      retry: true,
      retryDelay: 5000,
    }
  )

  const {data: provider} = useQuery(
    ['get-provider-by-id', apiKeyData?.provider],
    () => getProvider(apiKeyData?.provider),
    {
      enabled: !!data && !!apiKeyData?.provider,
      retry: true,
    }
  )

  useEffect(() => {
    if (provider && data) {
      addPurchasedKey(provider.data.url, data.key, data.epoch)
      router.push('/')
    }
  }, [addPurchasedKey, data, provider, router])

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
      addPurchase(result.id, result.provider)
    } catch (e) {
      addError({
        title: `Failed to get API key for Candidate`,
        body: e.response ? e.response.data : 'unknown error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const process = async () => {
    if (state === options.ENTER_KEY) {
      return router.push('/settings/node')
    }
    if (state === options.BUY) return router.push('/node/rent')
    if (state === options.ACTIVATE) return router.push('/node/activate')

    await getKeyForCandidate()
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
        setUnavailableProvider(res.data.ownerName)
      } catch (e) {
        setUnavailableProvider('')
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

  const waiting = submitting || isLoading

  return (
    <Layout canRedirect={false}>
      <Flex
        style={{backgroundColor: theme.colors.darkGraphite}}
        alignItems="center"
        justifyContent="center"
        height="100%"
        direction="column"
        justify="center"
        flex="1"
      >
        <Flex direction="column" maxWidth={rem(480)}>
          <Flex>
            <Avatar address={coinbase} />
            <Flex
              direction="column"
              justify="center"
              flex="1"
              style={{marginLeft: rem(20)}}
            >
              <SubHeading color="white" css={{wordBreak: 'break-word'}}>
                {coinbase}
              </SubHeading>
            </Flex>
          </Flex>
          <Flex
            direction="column"
            marginTop={rem(theme.spacings.medium24)}
            style={{
              backgroundColor: theme.colors.primary2,
              borderRadius: rem(6),
              ...padding(rem(27), rem(40)),
            }}
          >
            <Flex>
              <Text color={theme.colors.white} fontSize={rem(18)}>
                {t('Connect to Idena node')}
              </Text>
            </Flex>

            <Flex marginTop={rem(28)}>
              <Text
                color={theme.colors.white}
                fontSize={rem(11)}
                css={{opacity: 0.5}}
              >
                {t('Choose an option')}
              </Text>
            </Flex>
            <Flex marginTop={rem(15)}>
              <RadioGroup>
                <Stack direction="column" spacing={3}>
                  <Radio
                    isChecked={state === options.BUY}
                    onChange={() => setState(options.BUY)}
                    borderColor="white"
                  >
                    <Text color={theme.colors.white} fontSize={rem(13)}>
                      {t('Rent a shared node')}
                    </Text>
                  </Radio>
                  <Radio
                    isChecked={state === options.ENTER_KEY}
                    onChange={() => setState(options.ENTER_KEY)}
                    borderColor="white"
                  >
                    <Text color={theme.colors.white} fontSize={rem(13)}>
                      {t('Enter shared node API key')}
                    </Text>
                  </Radio>
                  <Radio
                    isChecked={state === options.ACTIVATE}
                    onChange={() => setState(options.ACTIVATE)}
                    borderColor="white"
                    isDisabled={identityState !== IdentityStatus.Undefined}
                  >
                    <Text color={theme.colors.white} fontSize={rem(13)}>
                      {t('Activate invite')}
                    </Text>
                  </Radio>
                  <Radio
                    isChecked={state === options.CANDIDATE}
                    onChange={() => setState(options.CANDIDATE)}
                    borderColor="white"
                    isDisabled={identityState !== IdentityStatus.Candidate}
                  >
                    <Text color={theme.colors.white} fontSize={rem(13)}>
                      {t('Get free access (only for Candidates)')}
                    </Text>
                  </Radio>
                </Stack>
              </RadioGroup>
            </Flex>
            <Flex marginTop={rem(20)}>
              <Text
                color={theme.colors.white}
                fontSize={rem(14)}
                css={{marginTop: rem(theme.spacings.small12)}}
              >
                <Flex style={{opacity: 0.5}} alignItems="center">
                  <InfoOutlineIcon boxSize={4} mr={3}></InfoOutlineIcon>
                  <Flex>
                    {t('You can run your own node at your desktop computer.')}
                  </Flex>
                </Flex>
              </Text>
            </Flex>
            <Flex marginTop={rem(30)}>
              <Link
                href="https://idena.io/download"
                target="_blank"
                ml="auto"
                mr={2}
              >
                <SecondaryButton>{t('Download desktop app')}</SecondaryButton>
              </Link>
              <PrimaryButton
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
            maxWidth={rem(480)}
            mt={2}
          >
            <Flex direction="column" w={rem(480)}>
              <Flex fontSize={rem(14)}>
                {t('The node is unavailable. Please contact the node owner:', {
                  nsSeparator: '|',
                })}
              </Flex>
              <Link
                href={`https://t.me/${unavailableProvider}`}
                target="_blank"
              >
                {unavailableProvider}
                {' >'}
              </Link>
            </Flex>
          </Alert>
        )}
      </Flex>
    </Layout>
  )
}
