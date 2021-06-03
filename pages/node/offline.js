import {
  Alert,
  Flex,
  Icon,
  Link,
  Radio,
  RadioGroup,
  Stack,
} from '@chakra-ui/core'
import {useRouter} from 'next/router'
import {padding} from 'polished'
import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {
  checkKey,
  fetchEpoch,
  fetchIdentity,
  getProvider,
} from '../../shared/api'

import {SubHeading, Text} from '../../shared/components'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {Avatar} from '../../shared/components/components'
import Layout from '../../shared/components/layout'
import {useAuthState} from '../../shared/providers/auth-context'
import {
  apiKeyStates,
  useSettingsState,
} from '../../shared/providers/settings-context'
import theme, {rem} from '../../shared/theme'

const options = {
  BUY: 0,
  ENTER_KEY: 1,
  ACTIVATE: 2,
}

export default function Offline() {
  const {t} = useTranslation()
  const {apiKeyState, apiKey} = useSettingsState()
  const auth = useAuthState()
  const router = useRouter()

  const [unavailableProvider, setUnavailableProvider] = useState()
  const [state, setState] = useState(options.BUY)
  const [activateActive, setActivateActive] = useState(false)

  const process = () => {
    if (state === options.ENTER_KEY) {
      return router.push('/settings/node')
    }
    if (state === options.BUY) return router.push('/node/rent')
    return router.push('/node/activate')
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
        const {epoch} = await fetchEpoch(true)
        const result = await checkKey(apiKey)
        if (result.epoch >= epoch - 1) {
          const provider = await getProvider(result.provider)
          setUnavailableProvider(provider.data.ownerName)
        }
      } catch (e) {
        setUnavailableProvider('')
      }
    }

    check()
  }, [apiKey])

  useEffect(() => {
    async function load() {
      try {
        const identity = await fetchIdentity(auth.coinbase, true)
        if (identity.state === 'Undefined') {
          setActivateActive(true)
        }
        // eslint-disable-next-line no-empty
      } catch (e) {}
    }
    load()
  }, [auth.coinbase])

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
            <Avatar address={auth.coinbase} />
            <Flex
              direction="column"
              justify="center"
              flex="1"
              style={{marginLeft: rem(20)}}
            >
              <SubHeading color="white" css={{wordBreak: 'break-word'}}>
                {auth.coinbase}
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
                    isDisabled={!activateActive}
                  >
                    <Text color={theme.colors.white} fontSize={rem(13)}>
                      {t('Activate invite')}
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
                  <Icon name="info-outline" size={4} mr={3}></Icon>
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
              <PrimaryButton onClick={process}>{t('Continue')}</PrimaryButton>
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
