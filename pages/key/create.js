/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import {
  Checkbox,
  Flex,
  Box,
  Text,
  useBreakpointValue,
  useClipboard,
} from '@chakra-ui/react'
import React, {useState, useEffect} from 'react'
import {useRouter} from 'next/router'
import QRCode from 'qrcode.react'
import {saveAs} from 'file-saver'
import {useTranslation} from 'react-i18next'
import {
  Avatar,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  FormLabel,
  Input,
  PasswordInput,
} from '../../shared/components/components'
import {SubHeading} from '../../shared/components/typo'
import {
  FlatButton,
  PrimaryButton,
  SecondaryButton,
} from '../../shared/components/button'
import {
  encryptPrivateKey,
  generatePrivateKey,
  privateKeyToAddress,
} from '../../shared/utils/crypto'
import {AuthLayout} from '../../shared/components/auth'
import {
  ArrowBackIcon,
  ArrowUpIcon,
  CopyIcon,
  RefreshIcon,
} from '../../shared/components/icons'
import {useSuccessToast} from '../../shared/hooks/use-toast'
import {sendSignUp} from '../../shared/utils/analytics'

const steps = {
  AVATAR: 0,
  PASSWORD: 1,
  BACKUP: 2,
  SUCCESS: 3,
}

export default function CreateKey() {
  const {t} = useTranslation()
  const size = useBreakpointValue(['lg', 'md'])
  const variant = useBreakpointValue(['mobile', 'initial'])
  const successToast = useSuccessToast()

  const router = useRouter()
  const [state, setState] = useState({
    step: steps.AVATAR,
  })
  const [error, setError] = useState()
  const {onCopy, hasCopied} = useClipboard(state.encryptedPrivateKey)

  const setStep = s => setState(prevState => ({...prevState, step: s}))

  const generateNewAddress = () => {
    const key = generatePrivateKey()
    setState(prevState => ({
      ...prevState,
      privateKey: key,
      address: privateKeyToAddress(key),
    }))
  }

  const setPassword = () => {
    if (state.password !== state.passwordConfirm) {
      setError(t("Passwords don't match. Try again."))
    } else {
      const encryptedKey = encryptPrivateKey(state.privateKey, state.password)
      setState(prevState => ({
        ...prevState,
        encryptedPrivateKey: encryptedKey,
        step: steps.BACKUP,
      }))
      setError(null)
    }
  }

  useEffect(() => {
    generateNewAddress()
  }, [])

  return (
    <>
      {state.step === steps.AVATAR && (
        <AuthLayout>
          <AuthLayout.Small>
            <Flex width="100%" direction="column">
              <Flex justifyContent="center">
                <div style={{position: 'relative'}}>
                  <Avatar address={state.address} />
                  <Box
                    color={['xblack.016', 'xwhite.500']}
                    opacity={[1, '0.8']}
                    position="absolute"
                    w={8}
                    h={8}
                    bottom={['28px', '5px']}
                    right={['-40px', '5px']}
                    borderRadius="6px"
                    background="gray.500"
                    padding="3px 2px 2px 5px"
                    cursor="pointer"
                    onClick={() => generateNewAddress()}
                  >
                    <RefreshIcon
                      color={['xwhite.500', 'inherit']}
                      boxSize={5}
                      fill="white"
                      style={{
                        opacity: 0.8,
                        transform: 'scaleX(-1) rotate(90deg)',
                      }}
                    ></RefreshIcon>
                  </Box>
                </div>
              </Flex>

              <Flex mt={[5, 0]} justify="center">
                <SubHeading color="white">{t('Your address')}</SubHeading>
              </Flex>

              <Flex
                mt="5px"
                mb="45px"
                fontSize="mdx"
                style={{
                  opacity: 0.5,
                  textAlign: 'center',
                  wordBreak: 'break-all',
                }}
              >
                {state.address}
              </Flex>
              <PrimaryButton
                size={size}
                onClick={() => setStep(steps.PASSWORD)}
              >
                {t('Proceed')}
              </PrimaryButton>

              <Flex justifyContent="center">
                <FlatButton onClick={() => router.push('/')} mt={5}>
                  {t('Cancel')}
                </FlatButton>
              </Flex>
            </Flex>
          </AuthLayout.Small>
        </AuthLayout>
      )}
      {state.step === steps.PASSWORD && (
        <AuthLayout>
          <Box
            w="100%"
            h={6}
            position="absolute"
            top="40px"
            display={['block', 'none']}
          >
            <ArrowBackIcon
              boxSize={6}
              ml={4}
              onClick={() => setStep(steps.AVATAR)}
            ></ArrowBackIcon>
          </Box>
          <AuthLayout.Normal>
            <Flex
              direction={['column', 'initial']}
              align={['center', 'initial']}
              width="100%"
            >
              <Avatar address={state.address} />
              <Flex
                direction="column"
                align={['center', 'initial']}
                justify="center"
                flex="1"
                w={['75%', '100%']}
                mt={[5, 0]}
                ml={[0, 5]}
              >
                <Box>
                  <SubHeading color="white">
                    {t('Create password to encrypt your account')}
                  </SubHeading>
                </Box>

                <Flex justify="space-between">
                  <Text
                    wordBreak={['break-all', 'initial']}
                    color="xwhite.050"
                    fontSize="mdx"
                  >
                    {state.address}
                  </Text>
                </Flex>
              </Flex>
            </Flex>
            <Flex width="100%" mt={6}>
              <form
                onSubmit={e => {
                  e.preventDefault()
                  setPassword()
                }}
                style={{width: '100%'}}
              >
                <FormLabel
                  display={['none', 'inherit']}
                  htmlFor="key"
                  style={{color: 'white', fontSize: '13px'}}
                >
                  {t('Password')}
                </FormLabel>
                <Flex width="100%" mb={[3, 5]} style={{position: 'relative'}}>
                  <PasswordInput
                    id="password"
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
                    placeholder={t('Enter password')}
                  />
                </Flex>
                <FormLabel
                  display={['none', 'inherit']}
                  htmlFor="key"
                  style={{
                    color: 'white',
                    fontSize: '13px',
                  }}
                >
                  {t('Confirm password')}
                </FormLabel>
                <Flex width="100%" style={{position: 'relative'}}>
                  <PasswordInput
                    id="passwordConfirm"
                    size={size}
                    value={state.passwordConfirm}
                    width="100%"
                    borderColor="xblack.008"
                    backgroundColor="xblack.016"
                    onChange={e =>
                      setState({
                        ...state,
                        passwordConfirm: e.target.value,
                      })
                    }
                    placeholder={t('Enter password again')}
                  />
                </Flex>
                <Flex mt={[4, 8]} justify="space-between">
                  <FlatButton
                    display={['none', 'inherit']}
                    color="white"
                    _hover={{color: 'xwhite.080'}}
                    onClick={() => setStep(steps.AVATAR)}
                  >
                    <ArrowUpIcon
                      boxSize={5}
                      style={{transform: 'rotate(-90deg)', marginTop: -3}}
                    ></ArrowUpIcon>
                    {t('Back')}
                  </FlatButton>
                  <PrimaryButton
                    size={size}
                    w={['100%', 'initial']}
                    type="submit"
                  >
                    {t('Next')}
                  </PrimaryButton>
                </Flex>
                {error && (
                  <Flex
                    mt="30px"
                    background="rgb(255, 102, 102)"
                    borderRadius="9px"
                    fontSize="mdx"
                    p="18px 24px"
                  >
                    {error}
                  </Flex>
                )}
              </form>
            </Flex>
          </AuthLayout.Normal>
        </AuthLayout>
      )}
      {state.step === steps.BACKUP && (
        <AuthLayout>
          <Box
            w="100%"
            h={6}
            position="absolute"
            top="40px"
            display={['block', 'none']}
          >
            <ArrowBackIcon
              boxSize={6}
              ml={4}
              onClick={() => setStep(steps.PASSWORD)}
            ></ArrowBackIcon>
          </Box>
          <AuthLayout.Normal>
            <Flex
              direction={['column', 'initial']}
              align={['center', 'initial']}
              width="100%"
            >
              <Avatar address={state.address} />
              <Flex
                direction="column"
                justify="center"
                flex="1"
                mt={[4, 0]}
                ml={[0, 5]}
              >
                <SubHeading color="white">
                  {t('Backup your private key')}
                </SubHeading>

                <Flex justify="space-between">
                  <Text color="xwhite.050" fontSize="mdx">
                    {t(
                      'Make a photo of QR code or save your encrypted private key.'
                    )}
                  </Text>
                </Flex>
              </Flex>
            </Flex>
            <Flex width="100%" mt={6}>
              <form
                onSubmit={e => {
                  e.preventDefault()
                  if (!state.understand1 || !state.understand2) {
                    setError(t('Please confirm you understand risks'))
                  } else {
                    sendSignUp(state.address)
                    setError('')
                    setStep(steps.SUCCESS)
                  }
                }}
                style={{width: '100%'}}
              >
                <Flex display={['none', 'flex']} justify="space-between">
                  <FormLabel style={{color: 'white', fontSize: 'md'}}>
                    {t('Your encrypted private key')}
                  </FormLabel>
                  {hasCopied ? (
                    <FormLabel style={{color: 'white', fontSize: 'md'}}>
                      {t('Copied!')}
                    </FormLabel>
                  ) : (
                    <FlatButton onClick={onCopy} marginBottom="10px">
                      {t('Copy')}
                    </FlatButton>
                  )}
                </Flex>
                <Flex width="100%" mb={[0, 5]} style={{position: 'relative'}}>
                  <Input
                    size={size}
                    variant={variant}
                    value={state.encryptedPrivateKey}
                    borderColor="xblack.008"
                    backgroundColor={['gray.500', 'xblack.016']}
                    width="100%"
                    pr={[10, 3]}
                    disabled
                  />
                  <Box
                    display={['initial', 'none']}
                    position="absolute"
                    top={3}
                    right={3}
                  >
                    <CopyIcon
                      boxSize={6}
                      onClick={() => {
                        onCopy()
                        successToast({
                          title: 'Private key copied!',
                          duration: '5000',
                        })
                      }}
                    ></CopyIcon>
                  </Box>
                </Flex>
                <Flex direction="column">
                  <Checkbox
                    order={[2, 1]}
                    mt={[9, 0]}
                    variant={variant}
                    textAlign={['left', 'initial']}
                    value={state.understand1}
                    isChecked={state.understand1}
                    onChange={e =>
                      setState({...state, understand1: e.target.checked})
                    }
                    style={{fontWeight: 300}}
                  >
                    {t(
                      'I understand that Idena cannot recover the private key for me.'
                    )}
                  </Checkbox>
                  <Checkbox
                    order={[3, 2]}
                    mt={2}
                    variant={variant}
                    textAlign={['left', 'initial']}
                    value={state.understand2}
                    isChecked={state.understand2}
                    onChange={e =>
                      setState({...state, understand2: e.target.checked})
                    }
                    style={{fontWeight: 300}}
                  >
                    {t(
                      'I understand the risk of compromising my private key backup.'
                    )}
                  </Checkbox>
                  <Flex order={[1, 3]} mt={[4, 8]} justify="space-between">
                    <FlatButton
                      display={['none', 'inherit']}
                      color="white"
                      _hover={{color: 'xwhite.080'}}
                      onClick={() => {
                        setError('')
                        setStep(steps.PASSWORD)
                      }}
                    >
                      <ArrowUpIcon
                        boxSize={5}
                        style={{transform: 'rotate(-90deg)', marginTop: -3}}
                      ></ArrowUpIcon>
                      {t('Back')}
                    </FlatButton>
                    <Flex
                      w={['100%', 'initial']}
                      direction={['column', 'initial']}
                    >
                      <SecondaryButton
                        order={[2, 1]}
                        size={size}
                        w={['100%', 'initial']}
                        type="button"
                        mt={[4, 0]}
                        mr={[0, 2.5]}
                        fontSize={['15px', '13px']}
                        onClick={() => setState({...state, showQrDialog: true})}
                      >
                        {t('Show QR code')}
                      </SecondaryButton>
                      <PrimaryButton
                        order={[1, 2]}
                        w={['100%', 'initial']}
                        size={size}
                        type="submit"
                      >
                        {t('Next')}
                      </PrimaryButton>
                    </Flex>
                  </Flex>
                </Flex>
                {error && (
                  <Flex
                    mt="30px"
                    p="18px 24px"
                    background="rgb(255, 102, 102)"
                    borderRadius="9px"
                    fontSyze="mdx"
                    style={{
                      fontSize: '14px',
                    }}
                  >
                    {error}
                  </Flex>
                )}
              </form>
            </Flex>
          </AuthLayout.Normal>
          <Dialog
            key="qr"
            isOpen={state.showQrDialog}
            onClose={() => setState({...state, showQrDialog: false})}
          >
            <DialogHeader>{t('Encrypted private key')}</DialogHeader>
            <DialogBody>
              {t('Scan QR by your mobile phone.')}
              <Flex justify="center" mx="auto" my={8}>
                <QRCode value={state.encryptedPrivateKey} />
              </Flex>
            </DialogBody>
            <DialogFooter>
              <SecondaryButton
                onClick={() => setState({...state, showQrDialog: false})}
              >
                {t('Close')}
              </SecondaryButton>
              <PrimaryButton
                onClick={() => {
                  const blob = new Blob([state.encryptedPrivateKey], {
                    type: 'text/plain;charset=utf-8',
                  })
                  saveAs(blob, 'idena-encrypted-key.txt')
                }}
              >
                {t('Save to file')}
              </PrimaryButton>
            </DialogFooter>
          </Dialog>
        </AuthLayout>
      )}
      {state.step === steps.SUCCESS && (
        <AuthLayout>
          <AuthLayout.Small>
            <Flex width="100%" direction="column">
              <Flex justifyContent="center">
                <div style={{position: 'relative'}}>
                  <Avatar address={state.address} />
                </div>
              </Flex>
              <Flex justify="center" marginTop={7.5}>
                <SubHeading color="white">
                  {t('Successfully created!')}
                </SubHeading>
              </Flex>

              <Flex
                mt="5px"
                mb="45px"
                fontSize="mdx"
                style={{
                  opacity: 0.5,
                  textAlign: 'center',
                  wordBreak: 'break-all',
                }}
              >
                {state.address}
              </Flex>
              <PrimaryButton
                size={size}
                onClick={() => router.push('/key/import')}
              >
                {t('Sign in')}
              </PrimaryButton>
              <Flex display={['none', 'flex']} justifyContent="center">
                <FlatButton onClick={() => setStep(steps.BACKUP)} mt={5}>
                  {t('Back')}
                </FlatButton>
              </Flex>
            </Flex>
          </AuthLayout.Small>
        </AuthLayout>
      )}
    </>
  )
}
