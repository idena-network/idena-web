import {Alert, AlertIcon, Flex, Radio, RadioGroup, Stack} from '@chakra-ui/core'
import {useRouter} from 'next/router'
import {padding} from 'polished'
import {useEffect, useState} from 'react'
import {checkKey, fetchEpoch, getProvider} from '../../shared/api'

import {SubHeading, Text} from '../../shared/components'
import {PrimaryButton} from '../../shared/components/button'
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
}

export default function Offline() {
  const {apiKeyState, apiKey} = useSettingsState()
  const auth = useAuthState()
  const router = useRouter()

  const [error, setError] = useState('')
  const [state, setState] = useState(options.BUY)

  const process = () => {
    if (state === options.ENTER_KEY) {
      return router.push('/settings/node')
    }
    return router.push('/node/rent')
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
          setError(
            `The node is unavailable. Please contact the node owner: ${provider.data.ownerName}`
          )
        }
      } catch (e) {
        setError('')
      }
    }

    check()
  }, [apiKey])

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
                Connect to Idena node
              </Text>
            </Flex>

            <Flex marginTop={rem(28)}>
              <Text
                color={theme.colors.white}
                fontSize={rem(11)}
                css={{opacity: 0.5}}
              >
                Choose an option
              </Text>
            </Flex>
            <Flex marginTop={rem(15)}>
              <RadioGroup>
                <Stack direction="column">
                  <Radio
                    isChecked={state === options.BUY}
                    onClick={() => setState(options.BUY)}
                    borderColor="white"
                  >
                    <Text color={theme.colors.white} fontSize={rem(13)}>
                      Rent a shared node
                    </Text>
                  </Radio>
                  <Radio
                    isChecked={state === options.ENTER_KEY}
                    onClick={() => setState(options.ENTER_KEY)}
                    borderColor="white"
                  >
                    <Text color={theme.colors.white} fontSize={rem(13)}>
                      Enter shared node API key
                    </Text>
                  </Radio>
                </Stack>
              </RadioGroup>
            </Flex>
            <Flex marginTop={rem(20)}>
              <Text
                color={theme.colors.white}
                fontSize={rem(14)}
                css={{opacity: 0.5, marginTop: rem(theme.spacings.small12)}}
              >
                You can run your own node for free at your desktop computer.
                Download it{' '}
                <a
                  href="https://idena.io.download"
                  target="_blank"
                  rel="noreferrer"
                >
                  here
                </a>
                .
              </Text>
            </Flex>
            <Flex marginTop={rem(30)} style={{marginLeft: 'auto'}}>
              <PrimaryButton onClick={process}>Continue</PrimaryButton>
            </Flex>
          </Flex>
        </Flex>
        {error && (
          <Alert
            status="error"
            bg="red.500"
            borderWidth="1px"
            borderColor="red.050"
            fontWeight={500}
            color="white"
            rounded="md"
            px={3}
            py={2}
            maxWidth={rem(480)}
            mt={2}
          >
            <AlertIcon name="info" color="white" size={5} mr={3}></AlertIcon>
            {error}
          </Alert>
        )}
      </Flex>
    </Layout>
  )
}
