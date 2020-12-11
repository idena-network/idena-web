import {Flex, Text} from '@chakra-ui/core'
import {margin, rem} from 'polished'
import Router from 'next/router'
import axios from 'axios'
import {useEffect, useState} from 'react'
import {Label, SubHeading} from '../../shared/components'
import {AuthLayout} from '../../shared/components/auth'
import {
  useSettingsDispatch,
  useSettingsState,
} from '../../shared/providers/settings-context'
import theme from '../../shared/theme'
import {Input, PasswordInput} from '../../shared/components/components'
import Button, {FlatButton} from '../../shared/components/button'

// eslint-disable-next-line react/prop-types
export default function NodeConnectionSetup({onBack, onSkip, onSave}) {
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

  const skipNodeSettings = () => {
    if (onSkip) onSkip()
    Router.push('/')
  }

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
        if (onSave) onSave()
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
            <Label htmlFor="key" style={{color: 'white', fontSize: rem(13)}}>
              Shared node URL
            </Label>
            <Flex width="100%" style={{marginBottom: rem(20)}}>
              <Input
                id="key"
                value={state.url}
                borderColor="xblack.008"
                backgroundColor="xblack.016"
                onChange={e => setState({...state, url: e.target.value})}
                placeholder="Enter your node address"
              />
            </Flex>
            <Label
              htmlFor="key"
              style={{
                color: 'white',
                fontSize: rem(13),
              }}
            >
              Shared node api key
            </Label>
            <Flex width="100%" style={{position: 'relative'}}>
              <PasswordInput
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
                &lt;&nbsp;Back
              </FlatButton>
              <Flex>
                <Button
                  variant="secondary"
                  css={{marginRight: rem(10)}}
                  onClick={skipNodeSettings}
                >
                  Skip
                </Button>
                <Button type="submit">Next</Button>
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
