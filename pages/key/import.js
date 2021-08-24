import {Flex, Checkbox, Text, useBreakpointValue, Box} from '@chakra-ui/react'
import React, {useState} from 'react'
import Router from 'next/router'
import {useTranslation} from 'react-i18next'
import dynamic from 'next/dynamic'
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
import {QrScanIcon} from '../../shared/components/icons'

const steps = {
  KEY: 0,
  INVITATION: 1,
}

export default function ImportKey() {
  const size = useBreakpointValue(['lg', 'md'])
  const logoSize = useBreakpointValue(['88px', '80px'])
  const variant = useBreakpointValue(['mobile', 'initial'])
  const {t} = useTranslation()
  const [state, setState] = useState({
    key: '',
    password: '',
    saveKey: true,
  })
  const {setNewKey, decryptKey} = useAuthDispatch()
  const [error, setError] = useState()
  const [step, setStep] = useState(steps.KEY)
  const [isScanningQr, setIsScanningQr] = useState(false)

  const QrReader = dynamic(() => import('react-qr-reader'), {
    ssr: false,
  })

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
                width={logoSize}
                height={logoSize}
              />
              <Flex
                direction="column"
                justify="center"
                flex="1"
                w={['85%', '100%']}
                m={['48px 0 0 0', '0 0 0 20px']}
              >
                <SubHeading color="white">
                  {t('Import your private key backup to sign in')}
                </SubHeading>
                <Flex justify="space-between">
                  <Text color="xwhite.050" fontSize="mdx">
                    {t(
                      'Enter your private key backup. You can export your private key from Idena app (see Settings page).'
                    )}
                  </Text>
                </Flex>
              </Flex>
            </Flex>
            <Flex w="100%" mt="24px">
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
                  style={{color: 'white', fontSize: 'md'}}
                >
                  {t('Encrypted private key')}
                </FormLabel>
                <Flex w="100%" mb={[3, 5]} style={{position: 'relative'}}>
                  <Input
                    id="key"
                    opacity={[0.8, 1]}
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
                      cursor: 'pointer',
                      position: 'absolute',
                      top: '10px',
                      right: '6px',
                      zIndex: 5,
                    }}
                    onClick={() => {}}
                  >
                    <QrScanIcon
                      boxSize="28px"
                      onClick={() => {
                        setIsScanningQr(true)
                      }}
                    ></QrScanIcon>
                  </Box>
                </Flex>
                <FormLabel
                  display={['none', 'inherit']}
                  htmlFor="key"
                  style={{
                    color: 'white',
                    fontSize: 'md',
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
                  mt={[4, 8]}
                  direction={['column', 'initial']}
                  justify="space-between"
                >
                  <Checkbox
                    pt={[7, 0]}
                    order={[2, 1]}
                    variant={variant}
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
                      css={{marginRight: '10px'}}
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
                    mt="30px"
                    fontSize="mdx"
                    style={{
                      backgroundColor: theme.colors.danger,
                      borderRadius: '9px',
                      padding: `18px 24px`,
                    }}
                  >
                    {error}
                  </Flex>
                )}
              </form>
            </Flex>
          </AuthLayout.Normal>
          {isScanningQr && (
            <Box position="absolute" top="0" h="100%" w="100%" zIndex="10">
              <QrReader
                delay={300}
                onError={err => {
                  setIsScanningQr(false)
                }}
                onScan={key => {
                  if (key) {
                    setState({key})
                    setIsScanningQr(false)
                  }
                }}
              />
            </Box>
          )}
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
