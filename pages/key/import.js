import {Flex, Checkbox, Text, useMediaQuery} from '@chakra-ui/react'
import {rem, margin} from 'polished'
import React, {useState} from 'react'
import Router from 'next/router'
import {useTranslation} from 'react-i18next'
import {SubHeading} from '../../shared/components'
import {
  FormLabel,
  Input,
  PasswordInput,
  SimplePasswordInput,
} from '../../shared/components/components'
import {useAuthDispatch} from '../../shared/providers/auth-context'
import theme from '../../shared/theme'
import {ActivateInvite} from '../../screens/key/components'
import {AuthLayout, MobileAuthLayout} from '../../shared/components/auth'
import {fetchIdentity} from '../../shared/api'
import {privateKeyToAddress} from '../../shared/utils/crypto'
import {
  PrimaryButton,
  SecondaryButton,
  WideButton,
} from '../../shared/components/button'

const steps = {
  KEY: 0,
  INVITATION: 1,
}

export default function ImportKey() {
  const {t} = useTranslation()
  const [state, setState] = useState({
    key: '',
    password: '',
    saveKey: true,
  })
  const {setNewKey, decryptKey} = useAuthDispatch()
  const [error, setError] = useState()
  const [step, setStep] = useState(steps.KEY)
  const [isDesktop] = useMediaQuery('(min-width: 376px)')

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
      {step === steps.KEY &&
        (isDesktop ? (
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
                    htmlFor="key"
                    style={{color: 'white', fontSize: rem(13)}}
                  >
                    {t('Encrypted private key')}
                  </FormLabel>
                  <Flex width="100%" style={{marginBottom: rem(20)}}>
                    <Input
                      id="key"
                      value={state.key}
                      borderColor="xblack.008"
                      backgroundColor="xblack.016"
                      onChange={e => setState({...state, key: e.target.value})}
                      placeholder={t('Enter your private key backup')}
                    />
                  </Flex>
                  <FormLabel
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
                      {t('Save the encrypted key on this computer')}
                    </Checkbox>
                    <Flex>
                      <SecondaryButton
                        variant="secondary"
                        css={{marginRight: rem(10)}}
                        onClick={() => Router.push('/')}
                      >
                        {t('Cancel')}
                      </SecondaryButton>
                      <PrimaryButton type="submit" disabled={!state.key}>
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
        ) : (
          <MobileAuthLayout>
            <AuthLayout.Mobile>
              <AuthLayout.Mobile>
                <img
                  src="/static/idena-logo-circle.svg"
                  alt="logo"
                  style={{width: rem(92), height: rem(92)}}
                />
                <SubHeading color="white" css={{paddingTop: '2.25rem'}}>
                  {t('Import your private key')}
                </SubHeading>
                <Text color="xwhite.050" fontSize={rem(14)}>
                  {t(
                    'Enter your private key exported from the desktop version of Idena App'
                  )}
                </Text>
                <form
                  onSubmit={async e => {
                    e.preventDefault()
                    await addKey()
                  }}
                  style={{width: '100%'}}
                >
                  <Flex width="100%" marginTop={rem(27)}>
                    <Input
                      id="key"
                      size="lg"
                      value={state.key}
                      borderColor="xblack.008"
                      backgroundColor="xblack.016"
                      onChange={e => setState({...state, key: e.target.value})}
                      placeholder={t('Enter your private key backup')}
                    />
                    <Flex style={{marginLeft: '-38px', padding: '10px 0'}}>
                      <img
                        color="rgb(210, 212, 217)"
                        src="/static/scan-qr_icn.svg"
                        alt="logo"
                        style={{width: rem(28), height: rem(28)}}
                      />
                    </Flex>
                  </Flex>
                  <Flex width="100%" marginTop={rem(12)}>
                    <SimplePasswordInput
                      value={state.password}
                      size="lg"
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
                  <Flex width="100%" marginTop={rem(12)}>
                    <WideButton size="lg" type="submit" disabled={!state.key}>
                      {t('Import')}
                    </WideButton>
                  </Flex>
                  <Flex
                    width="100%"
                    marginTop={rem(36)}
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
                      {t('Save the encrypted key on this device')}
                    </Checkbox>
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
              </AuthLayout.Mobile>
            </AuthLayout.Mobile>
          </MobileAuthLayout>
        ))}
      {step === steps.INVITATION &&
        (isDesktop ? (
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
        ) : (
          <MobileAuthLayout>
            <AuthLayout.Mobile>
              <AuthLayout.Mobile>
                <img
                  src="/static/idena-logo-circle.svg"
                  alt="logo"
                  style={{width: rem(92), height: rem(92)}}
                />
                <SubHeading color="white" css={{paddingTop: '2.25rem'}}>
                  {t('Import your private key')}
                </SubHeading>
                <Text color="xwhite.050" fontSize={rem(14)}>
                  {t(
                    'Enter your private key exported from the desktop version of Idena App'
                  )}
                </Text>
                <form
                  onSubmit={async e => {
                    e.preventDefault()
                    await addKey()
                  }}
                  style={{width: '100%'}}
                >
                  <Flex width="100%" marginTop={rem(27)}>
                    <Input
                      id="key"
                      size="lg"
                      value={state.key}
                      borderColor="xblack.008"
                      backgroundColor="xblack.016"
                      onChange={e => setState({...state, key: e.target.value})}
                      placeholder={t('Enter your private key backup')}
                    />
                    <Flex style={{marginLeft: '-38px', padding: '10px 0'}}>
                      <img
                        color="rgb(210, 212, 217)"
                        src="/static/scan-qr_icn.svg"
                        alt="logo"
                        style={{width: rem(28), height: rem(28)}}
                      />
                    </Flex>
                  </Flex>
                  <Flex width="100%" marginTop={rem(12)}>
                    <SimplePasswordInput
                      value={state.password}
                      size="lg"
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
                  <Flex width="100%" marginTop={rem(12)}>
                    <WideButton size="lg" type="submit" disabled={!state.key}>
                      {t('Import')}
                    </WideButton>
                  </Flex>
                  <Flex
                    width="100%"
                    marginTop={rem(36)}
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
                      {t('Save the encrypted key on this device')}
                    </Checkbox>
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
              </AuthLayout.Mobile>
            </AuthLayout.Mobile>
          </MobileAuthLayout>
        ))}
    </>
  )
}
