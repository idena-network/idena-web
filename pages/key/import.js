import {Flex, Checkbox, Text} from '@chakra-ui/core'
import {rem, margin} from 'polished'
import {useState} from 'react'
import {Button, Label, SubHeading} from '../../shared/components'
import {Input, PasswordInput} from '../../shared/components/components'
import {useAuthDispatch} from '../../shared/providers/auth-context'
import theme from '../../shared/theme'
import NodeConnectionSetup from '../../screens/key/components'
import {AuthLayout} from '../../shared/components/layout'

const steps = {
  KEY: 0,
  NODE: 1,
}

export default function ImportKey() {
  const [state, setState] = useState({
    key: '',
    password: '',
    saveKey: true,
  })
  const {setNewKey, checkKey} = useAuthDispatch()
  const [error, setError] = useState()
  const [step, setStep] = useState(steps.KEY)

  const addKey = () => {
    if (checkKey(state.key, state.password)) {
      setError(null)
      setStep(steps.NODE)
    } else {
      setError('Key or password is invalid. Try again.')
    }
  }

  return (
    <>
      {step === steps.KEY && (
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
                <SubHeading color="white">Import your private key</SubHeading>
                <Flex justify="space-between">
                  <Text color="xwhite.050" fontSize={rem(14)}>
                    Enter your private key exported from the desktop version of
                    Idena App
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
                  addKey()
                }}
                style={{width: '100%'}}
              >
                <Label
                  htmlFor="key"
                  style={{color: 'white', fontSize: rem(13)}}
                >
                  Exported private key
                </Label>
                <Flex width="100%" style={{marginBottom: rem(20)}}>
                  <Input
                    id="key"
                    value={state.key}
                    style={{
                      backgroundColor: theme.colors.gray3,
                      borderColor: theme.colors.gray5,
                    }}
                    onChange={e => setState({...state, key: e.target.value})}
                    placeholder="Enter your exported private key"
                  />
                </Flex>
                <Label
                  htmlFor="key"
                  style={{
                    color: 'white',
                    fontSize: rem(13),
                  }}
                >
                  Password
                </Label>
                <Flex width="100%">
                  <PasswordInput
                    value={state.password}
                    width="100%"
                    style={{
                      borderColor: 'rgba(0, 0, 0, 0.08)',
                      backgroundColor: 'rgba(0, 0, 0, 0.16)',
                    }}
                    onChange={e =>
                      setState({
                        ...state,
                        password: e.target.value,
                      })
                    }
                    placeholder="Enter your password"
                  />
                </Flex>
                <Flex
                  style={{
                    ...margin(theme.spacings.xlarge, 0, 0, 0),
                  }}
                  justify="space-between"
                >
                  <Checkbox
                    value={state.saveKey}
                    isChecked={state.saveKey}
                    onChange={e =>
                      setState({...state, saveKey: e.target.checked})
                    }
                  >
                    Save the encrypted key on this computer
                  </Checkbox>
                  <Button type="submit" disabled={!state.key}>
                    Import
                  </Button>
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
      )}
      {step === steps.NODE && (
        <NodeConnectionSetup
          onBack={() => setStep(steps.KEY)}
          onSkip={() => setNewKey(state.key, state.password, state.saveKey)}
          onSave={() => setNewKey(state.key, state.password, state.saveKey)}
        ></NodeConnectionSetup>
      )}
    </>
  )
}
