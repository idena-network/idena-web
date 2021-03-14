import {Flex, Icon, Link, Text} from '@chakra-ui/core'
import {margin, rem} from 'polished'
import Router from 'next/router'
import axios from 'axios'
import {useEffect, useState} from 'react'
import {FiChevronRight} from 'react-icons/fi'
import {Label, SubHeading} from '../../shared/components'
import {AuthLayout} from '../../shared/components/auth'
import {
  useSettingsDispatch,
  useSettingsState,
} from '../../shared/providers/settings-context'
import theme from '../../shared/theme'
import {Avatar, Input, PasswordInput} from '../../shared/components/components'
import Button, {
  FlatButton,
  PrimaryButton,
  SecondaryButton,
} from '../../shared/components/button'
import {
  privateKeyToAddress,
  privateKeyToPublicKey,
} from '../../shared/utils/crypto'
import useTx from '../../shared/hooks/use-tx'
import {getRawTx, sendRawTx} from '../../shared/api'
import {Transaction} from '../../shared/models/transaction'

// eslint-disable-next-line react/prop-types
export default function NodeConnectionSetup({onBack, onNext}) {
  const settings = useSettingsState()
  const [state, setState] = useState({
    url: '',
    apiKey: '',
  })
  const [error, setError] = useState('')
  const {saveConnection} = useSettingsDispatch()

  useEffect(() => {
    setState(prevState => ({
      ...prevState,
      url: settings.url,
      apiKey: settings.apiKey,
    }))
  }, [settings.apiKey, settings.url])

  const save = async () => {
    try {
      const {data} = await axios.post(state.url, {
        key: state.apiKey,
        method: 'dna_epoch',
        params: [],
        id: 1,
      })
      if (data.error) {
        setError('API key is invalid.')
      } else {
        saveConnection(state.url, state.apiKey)
        if (onNext) onNext()
        Router.push('/')
      }
    } catch (e) {
      setError('Node is unreachable.')
    }
  }

  return (
    <AuthLayout>
      <AuthLayout.Normal>
        <Flex width="100%">
          <img
            src="/static/idena_white.svg"
            alt="logo"
            style={{width: rem(80), height: rem(80)}}
          />
          <Flex
            direction="column"
            justify="center"
            flex="1"
            style={{marginLeft: rem(20)}}
          >
            <SubHeading color="white">Connect to Idena node</SubHeading>
            <Flex justify="space-between">
              <Text color="xwhite.050" fontSize={rem(14)}>
                Enter an Idena shared node URL and API key
              </Text>
            </Flex>
            <Flex>
              <Link
                href="https://t.me/IdenaSharedNodes"
                target="_blank"
                color={theme.colors.primary}
                fontSize={rem(13)}
              >
                Ask idena community members to share their node for you
                <FiChevronRight
                  style={{
                    display: 'inline-block',
                  }}
                  fontSize={rem(12)}
                />
              </Link>
            </Flex>
          </Flex>
        </Flex>
        <Flex
          width="100%"
          style={{
            ...margin(theme.spacings.medium24, 0, 0, 0),
          }}
        >
          <form
            onSubmit={e => {
              e.preventDefault()
              save()
            }}
            style={{width: '100%'}}
          >
            <Label
              htmlFor="nodeUrl"
              style={{color: 'white', fontSize: rem(13)}}
            >
              Shared node URL
            </Label>
            <Flex width="100%" style={{marginBottom: rem(20)}}>
              <Input
                id="nodeUrl"
                value={state.url}
                borderColor="xblack.008"
                backgroundColor="xblack.016"
                onChange={e => setState({...state, url: e.target.value})}
                placeholder="Enter your node address"
              />
            </Flex>
            <Label
              htmlFor="nodeKey"
              style={{
                color: 'white',
                fontSize: rem(13),
              }}
            >
              Shared node api key
            </Label>
            <Flex width="100%" style={{position: 'relative'}}>
              <PasswordInput
                id="nodeKey"
                value={state.apiKey}
                width="100%"
                borderColor="xblack.008"
                backgroundColor="xblack.016"
                onChange={e =>
                  setState({
                    ...state,
                    apiKey: e.target.value,
                  })
                }
                placeholder="Enter apiKey"
              />
            </Flex>
            <Flex
              style={{
                ...margin(theme.spacings.medium32, 0, 0, 0),
              }}
              justify="space-between"
            >
              <FlatButton
                color="white"
                onClick={() => onBack()}
                style={{
                  fontSize: rem(13),
                  textAlign: 'center',
                }}
              >
                <Icon
                  name="arrow-up"
                  size={5}
                  style={{transform: 'rotate(-90deg)', marginTop: -3}}
                ></Icon>
                Back
              </FlatButton>
              <Button type="submit">Next</Button>
            </Flex>
            {error && (
              <Flex
                style={{
                  marginTop: rem(30, theme.fontSizes.base),
                  backgroundColor: theme.colors.danger,
                  borderRadius: rem(9, theme.fontSizes.base),
                  fontSize: rem(14, theme.fontSizes.base),
                  padding: `${rem(18, theme.fontSizes.base)} ${rem(
                    24,
                    theme.fontSizes.base
                  )}`,
                }}
              >
                {error}
              </Flex>
            )}
          </form>
        </Flex>
      </AuthLayout.Normal>
    </AuthLayout>
  )
}

// eslint-disable-next-line react/prop-types
export function ActivateInvite({privateKey, onBack, onSkip, onNext}) {
  const [state, setState] = useState({
    code: '',
  })
  const [error, setError] = useState('')

  const coinbase = privateKeyToAddress(privateKey)

  const [{mining, mined, error: miningError}, setHash] = useTx(null, true)

  const activateInvite = async () => {
    const trimmedCode = state.code.trim()
    const from = privateKeyToAddress(trimmedCode)

    try {
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
      tx.sign(trimmedCode)

      const hex = tx.toHex()

      const result = await sendRawTx(`0x${hex}`, true)
      setHash(result)
    } catch (e) {
      setError(`Failed to activate invite: ${e.message}`)
    }
  }

  useEffect(() => {
    if (mined) {
      if (miningError) {
        setError(miningError)
      } else {
        onNext()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mined, miningError])

  return (
    <AuthLayout>
      <AuthLayout.Normal>
        <Flex width="100%">
          <Avatar address={coinbase} borderRadius={rem(20)} />
          <Flex
            direction="column"
            justify="center"
            flex="1"
            style={{marginLeft: rem(20)}}
          >
            <SubHeading color="white">Enter invitation code</SubHeading>
            <Flex justify="space-between">
              <Text color="xwhite.050" fontSize={rem(14)}>
                Enter an invitation code to get a free shared node connection or
                skip it to enter the invitation code later.
              </Text>
            </Flex>
          </Flex>
        </Flex>
        <Flex
          width="100%"
          style={{
            ...margin(theme.spacings.medium24, 0, 0, 0),
          }}
        >
          <form
            onSubmit={async e => {
              e.preventDefault()
              await activateInvite()
            }}
            style={{width: '100%'}}
          >
            <Label htmlFor="code" style={{color: 'white', fontSize: rem(13)}}>
              Invitation code
            </Label>
            <Flex width="100%" style={{marginBottom: rem(20)}}>
              <Input
                id="code"
                value={state.code}
                borderColor="xblack.008"
                backgroundColor="xblack.016"
                onChange={e => setState({...state, code: e.target.value})}
                placeholder="Your invitation code"
              />
            </Flex>

            <Flex
              style={{
                ...margin(theme.spacings.xlarge, 0, 0, 0),
              }}
              justify="space-between"
            >
              <FlatButton
                color="white"
                onClick={onBack}
                style={{
                  fontSize: rem(13),
                  textAlign: 'center',
                }}
              >
                <Icon
                  name="arrow-up"
                  size={5}
                  style={{transform: 'rotate(-90deg)', marginTop: -3}}
                ></Icon>
                Back
              </FlatButton>
              <Flex>
                <SecondaryButton
                  type="button"
                  mr={rem(10)}
                  fontSize={rem(13)}
                  onClick={onSkip}
                >
                  Skip for now
                </SecondaryButton>
                <PrimaryButton
                  isLoading={mining}
                  loadingText="Mining..."
                  type="submit"
                  ml="auto"
                >
                  Activate
                </PrimaryButton>
              </Flex>
            </Flex>
            {error && (
              <Flex
                style={{
                  marginTop: rem(30, theme.fontSizes.base),
                  backgroundColor: theme.colors.danger,
                  borderRadius: rem(9, theme.fontSizes.base),
                  fontSize: rem(14, theme.fontSizes.base),
                  padding: `${rem(18, theme.fontSizes.base)} ${rem(
                    24,
                    theme.fontSizes.base
                  )}`,
                }}
              >
                {error}
              </Flex>
            )}
          </form>
        </Flex>
      </AuthLayout.Normal>
    </AuthLayout>
  )
}
