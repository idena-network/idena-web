import {Flex, Checkbox, Text} from '@chakra-ui/core'
import {rem, margin} from 'polished'
import {useState} from 'react'
import Router from 'next/router'
import {Button, Label, SubHeading} from '../../shared/components'
import {Input, PasswordInput} from '../../shared/components/components'
import {useAuthDispatch} from '../../shared/providers/auth-context'
import theme from '../../shared/theme'
import {ActivateInvite} from '../../screens/key/components'
import {AuthLayout} from '../../shared/components/auth'
import {fetchIdentity} from '../../shared/api'
import {privateKeyToAddress} from '../../shared/utils/crypto'

const steps = {
  KEY: 0,
  INVITATION: 1,
}

export default function ImportKey() {
  const [state, setState] = useState({
    key: '',
    password: '',
    saveKey: true,
  })
  const {setNewKey, decryptKey} = useAuthDispatch()
  const [error, setError] = useState()
  const [step, setStep] = useState(steps.KEY)

  const addKey = async () => {
    const key = decryptKey(state.key, state.password)
    if (key) {
      setError(null)
      try {
        const identity = await fetchIdentity(privateKeyToAddress(key), true)
        if (identity.state === 'Undefined') {
          setStep(steps.INVITATION)
        } else {
          setNewKey(state.key, state.password, state.saveKey)
          Router.push('/')
        }
      } catch {
        setNewKey(state.key, state.password, state.saveKey)
        Router.push('/')
      }
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
                <SubHeading color="white">
                  Import your private key backup to sign in
                </SubHeading>
                <Flex justify="space-between">
                  <Text color="xwhite.050" fontSize={rem(14)}>
                    Enter your private key backup. You can export your private
                    key from Idena app (see Settings page).
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
                  await addKey()
                }}
                style={{width: '100%'}}
              >
                <Label
                  htmlFor="key"
                  style={{color: 'white', fontSize: rem(13)}}
                >
                  Encrypted private key
                </Label>
                <Flex width="100%" style={{marginBottom: rem(20)}}>
                  <Input
                    id="key"
                    value={state.key}
                    borderColor="xblack.008"
                    backgroundColor="xblack.016"
                    onChange={e => setState({...state, key: e.target.value})}
                    placeholder="Enter your private key backup"
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
                    borderColor="xblack.008"
                    backgroundColor="xblack.016"
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
                    style={{fontWeight: 300}}
                  >
                    Save the encrypted key on this computer
                  </Checkbox>
                  <Flex>
                    <Button
                      variant="secondary"
                      css={{marginRight: rem(10)}}
                      onClick={() => Router.push('/')}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={!state.key}>
                      Import
                    </Button>
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
      )}
      {step === steps.INVITATION && (
        <AuthLayout>
          <AuthLayout.Normal>
            <ActivateInvite
              privateKey={decryptKey(state.key, state.password)}
              onBack={() => setStep(steps.KEY)}
              onSkip={() => {
                setNewKey(state.key, state.password, state.saveKey)
                Router.push('/')
              }}
              onNext={() => {
                setNewKey(state.key, state.password, state.saveKey)
                Router.push('/')
              }}
            ></ActivateInvite>
          </AuthLayout.Normal>
        </AuthLayout>
      )}
    </>
  )
}
