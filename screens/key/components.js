import {Flex, Link, Text} from '@chakra-ui/core'
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
import {Input, PasswordInput} from '../../shared/components/components'
import Button, {FlatButton} from '../../shared/components/button'

// eslint-disable-next-line react/prop-types
export default function NodeConnectionSetup({onBack, onSave}) {
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
                &lt;&nbsp;Back
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
