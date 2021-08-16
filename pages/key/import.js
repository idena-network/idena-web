import {Flex, Checkbox, Text, useBreakpointValue, Box} from '@chakra-ui/react'
import {rem, margin, borderRadius} from 'polished'
import React, {useState} from 'react'
import Router from 'next/router'
import {useTranslation} from 'react-i18next'
import {FiEye, FiEyeOff} from 'react-icons/fi'
import {SubHeading} from '../../shared/components'
import {
  FormLabel,
  Input,
  PasswordInput,
} from '../../shared/components/components'
import {useAuthDispatch} from '../../shared/providers/auth-context'
import theme from '../../shared/theme'
import {ActivateInvite} from '../../screens/key/components'
import {AuthLayout} from '../../shared/components/auth'
import {fetchIdentity} from '../../shared/api'
import {privateKeyToAddress} from '../../shared/utils/crypto'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'

const steps = {
  KEY: 0,
  INVITATION: 1,
}

export default function ImportKey() {
  const size = useBreakpointValue(['lg', 'md'])
  const {t} = useTranslation()
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
      setError(t('Key or password is invalid. Try again.'))
    }
  }

  return (
    <>
      {step === steps.KEY && (
        <AuthLayout>
          <AuthLayout.Normal>
            <Flex
              direction={['column', 'initial']}
              align={['center', 'initial']}
              width="100%"
            >
              <img
                src="/static/idena-logo-circle.svg"
                alt="logo"
                style={{width: rem(80), height: rem(80)}}
              />
              <Flex
                direction="column"
                justify="center"
                flex="1"
                m={['48px 0 0 0', '0 0 0 20px']}
              >
                <SubHeading color="white">
                  {t('Import your private key backup to sign in')}
                </SubHeading>
                <Flex justify="space-between">
                  <Text color="xwhite.050" fontSize={rem(14)}>
                    {t(
                      'Enter your private key backup. You can export your private key from Idena app (see Settings page).'
                    )}
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
                <FormLabel
                  display={['none', 'inherit']}
                  htmlFor="key"
                  style={{color: 'white', fontSize: rem(13)}}
                >
                  {t('Encrypted private key')}
                </FormLabel>
                <Flex
                  width="100%"
                  style={{marginBottom: rem(20), position: 'relative'}}
                >
                  <Input
                    id="key"
                    size={size}
                    value={state.key}
                    borderColor="xblack.008"
                    backgroundColor="xblack.016"
                    onChange={e => setState({...state, key: e.target.value})}
                    placeholder={t('Enter your private key backup')}
                  />
                  <Box
                    display={['initial', 'none']}
                    style={{
                      ...borderRadius('right', rem(6)),
                      cursor: 'pointer',
                      fontSize: rem(20),
                      position: 'absolute',
                      top: rem(10),
                      height: '100%',
                      right: rem(6),
                      zIndex: 5,
                    }}
                    onClick={() => {}}
                  >
                    <img src="/static/qr-scan-icn.svg" />
                  </Box>
                </Flex>
                <FormLabel
                  display={['none', 'inherit']}
                  htmlFor="key"
                  style={{
                    color: 'white',
                    fontSize: rem(13),
                  }}
                >
                  {t('Password')}
                </FormLabel>
                <Flex width="100%">
                  <PasswordInput
                    size={size}
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
                    placeholder={t('Enter your password')}
                  />
                </Flex>
                <Flex
                  style={{
                    ...margin(theme.spacings.xlarge, 0, 0, 0),
                  }}
                  direction={['column', 'initial']}
                  justify="space-between"
                >
                  <Checkbox
                    pt={[rem(48), 0]}
                    order={[2, 1]}
                    value={state.saveKey}
                    isChecked={state.saveKey}
                    onChange={e =>
                      setState({...state, saveKey: e.target.checked})
                    }
                    style={{fontWeight: 300}}
                  >
                    {t('Save the encrypted key on this computer')}
                  </Checkbox>
                  <Flex order={[1, 2]}>
                    <SecondaryButton
                      isFullWidth={[true, false]}
                      display={['none', 'initial']}
                      variant="secondary"
                      css={{marginRight: rem(10)}}
                      onClick={() => Router.push('/')}
                    >
                      {t('Cancel')}
                    </SecondaryButton>
                    <PrimaryButton
                      size={size}
                      isFullWidth={[true, false]}
                      type="submit"
                      disabled={!state.key}
                    >
                      {t('Import')}
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
