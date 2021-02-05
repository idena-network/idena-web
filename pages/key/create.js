/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import {Checkbox, Flex, Icon, Text, useClipboard} from '@chakra-ui/core'
import {rem, margin} from 'polished'
import {useState, useEffect} from 'react'
import {useRouter} from 'next/router'
import QRCode from 'qrcode.react'
import {saveAs} from 'file-saver'
import {Button, Label} from '../../shared/components'
import {
  Avatar,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  Input,
  PasswordInput,
} from '../../shared/components/components'
import {SubHeading} from '../../shared/components/typo'
import theme from '../../shared/theme'
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

const steps = {
  AVATAR: 0,
  PASSWORD: 1,
  BACKUP: 2,
  SUCCESS: 3,
}

export default function CreateKey() {
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
      setError("Passwords don't match. Try again.")
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
                  <div
                    className="refresh-avatar"
                    onClick={() => generateNewAddress()}
                  >
                    <Icon
                      name="refresh"
                      w={5}
                      h={5}
                      fill="white"
                      style={{
                        opacity: 0.8,
                        transform: 'scaleX(-1) rotate(90deg)',
                      }}
                    ></Icon>
                  </div>
                </div>
              </Flex>

              <Flex textAlign="center">
                <SubHeading color="white">Your address</SubHeading>
              </Flex>

              <Flex
                style={{
                  ...margin(5, 0, 45),
                  opacity: 0.5,
                  textAlign: 'center',
                  fontSize: rem(14),
                  wordBreak: 'break-all',
                }}
              >
                {state.address}
              </Flex>
              <Button onClick={() => setStep(steps.PASSWORD)}>Proceed</Button>

              <Flex justifyContent="center">
                <FlatButton
                  color={theme.colors.primary}
                  onClick={() => router.push('/')}
                  style={{
                    marginTop: rem(20),
                    fontSize: rem(13),
                    textAlign: 'center',
                  }}
                >
                  Cancel
                </FlatButton>
              </Flex>
            </Flex>
            <style jsx>{`
              .refresh-avatar {
                color: #ffffff;
                position: absolute;
                width: ${rem(32)};
                height: ${rem(32)};
                opacity: 0.8;
                bottom: ${rem(5)};
                right: ${rem(5)};
                border-radius: ${rem(6)};
                background-color: #53565c;
                padding: 3px 2px 2px 5px;
                cursor: pointer;
              }
            `}</style>
          </AuthLayout.Small>
        </AuthLayout>
      )}
      {state.step === steps.PASSWORD && (
        <AuthLayout>
          <AuthLayout.Normal>
            <Flex width="100%">
              <Avatar address={state.address} />
              <Flex
                direction="column"
                justify="center"
                flex="1"
                style={{marginLeft: rem(20)}}
              >
                <SubHeading color="white">
                  Create password to encrypt your account
                </SubHeading>

                <Flex justify="space-between">
                  <Text color="xwhite.050" fontSize={rem(14)}>
                    {state.address}
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
                  setPassword()
                }}
                style={{width: '100%'}}
              >
                <Label
                  htmlFor="key"
                  style={{color: 'white', fontSize: rem(13)}}
                >
                  Password
                </Label>
                <Flex
                  width="100%"
                  style={{marginBottom: rem(20), position: 'relative'}}
                >
                  <PasswordInput
                    id="password"
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
                    placeholder="Enter password"
                  />
                </Flex>
                <Label
                  htmlFor="key"
                  style={{
                    color: 'white',
                    fontSize: rem(13),
                  }}
                >
                  Confirm password
                </Label>
                <Flex width="100%" style={{position: 'relative'}}>
                  <PasswordInput
                    id="passwordConfirm"
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
                    placeholder="Enter password again"
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
                    onClick={() => setStep(steps.AVATAR)}
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
      )}
      {state.step === steps.BACKUP && (
        <AuthLayout>
          <AuthLayout.Normal>
            <Flex width="100%">
              <Avatar address={state.address} />
              <Flex
                direction="column"
                justify="center"
                flex="1"
                style={{marginLeft: rem(20)}}
              >
                <SubHeading color="white">Backup your private key</SubHeading>

                <Flex justify="space-between">
                  <Text color="xwhite.050" fontSize={rem(14)}>
                    Make a photo of QR code or save your encrypted private key.
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
                  setStep(steps.SUCCESS)
                }}
                style={{width: '100%'}}
              >
                <Flex justify="space-between">
                  <Label style={{color: 'white', fontSize: rem(13)}}>
                    Your encrypted private key
                  </Label>
                  {hasCopied ? (
                    <Label style={{color: 'white', fontSize: rem(13)}}>
                      Copied!
                    </Label>
                  ) : (
                    <FlatButton
                      color={theme.colors.primary}
                      onClick={onCopy}
                      style={{
                        fontSize: rem(13),
                        marginBottom: rem(10),
                        textAlign: 'center',
                      }}
                    >
                      Copy
                    </FlatButton>
                  )}
                </Flex>
                <Flex
                  width="100%"
                  style={{marginBottom: rem(20), position: 'relative'}}
                >
                  <Input
                    value={state.encryptedPrivateKey}
                    borderColor="xblack.008"
                    backgroundColor="xblack.016"
                    width="100%"
                    disabled
                  />
                </Flex>
                <Flex>
                  <Checkbox
                    value={state.understand1}
                    isChecked={state.understand1}
                    onChange={e =>
                      setState({...state, understand1: e.target.checked})
                    }
                    style={{fontWeight: 300}}
                  >
                    I understand that Idena cannot recover the private key for
                    me.
                  </Checkbox>
                </Flex>
                <Flex
                  style={{
                    ...margin(theme.spacings.small8, 0, 0, 0),
                  }}
                >
                  <Checkbox
                    value={state.understand2}
                    isChecked={state.understand2}
                    onChange={e =>
                      setState({...state, understand2: e.target.checked})
                    }
                    style={{fontWeight: 300}}
                  >
                    I understand the risk of compromising my private key backup.
                  </Checkbox>
                </Flex>
                <Flex
                  style={{
                    ...margin(theme.spacings.xlarge, 0, 0, 0),
                  }}
                  justify="space-between"
                >
                  <FlatButton
                    color="white"
                    onClick={() => setStep(steps.PASSWORD)}
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
                      onClick={() => setState({...state, showQrDialog: true})}
                    >
                      Show QR code
                    </SecondaryButton>
                    <PrimaryButton
                      type="submit"
                      disabled={!state.understand1 || !state.understand2}
                    >
                      Next
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
          <Dialog
            key="qr"
            isOpen={state.showQrDialog}
            onClose={() => setState({...state, showQrDialog: false})}
          >
            <DialogHeader>Encrypted private key</DialogHeader>
            <DialogBody>
              Scan QR by your mobile phone.
              <Flex justify="center" mx="auto" my={8}>
                <QRCode value={state.encryptedPrivateKey} />
              </Flex>
            </DialogBody>
            <DialogFooter>
              <SecondaryButton
                onClick={() => setState({...state, showQrDialog: false})}
              >
                Close
              </SecondaryButton>
              <PrimaryButton
                onClick={() => {
                  const blob = new Blob([state.encryptedPrivateKey], {
                    type: 'text/plain;charset=utf-8',
                  })
                  saveAs(blob, 'idena-encrypted-key.txt')
                }}
              >
                Save to file
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
              <Flex textAlign="center" marginTop={rem(30)}>
                <SubHeading color="white">Successfully created!</SubHeading>
              </Flex>

              <Flex
                style={{
                  ...margin(5, 0, 45),
                  opacity: 0.5,
                  textAlign: 'center',
                  fontSize: rem(14),
                  wordBreak: 'break-all',
                }}
              >
                {state.address}
              </Flex>
              <Button onClick={() => router.push('/key/import')}>
                Sign in
              </Button>
              <Flex justifyContent="center">
                <FlatButton
                  color={theme.colors.primary}
                  onClick={() => setStep(steps.BACKUP)}
                  style={{
                    marginTop: rem(20),
                    fontSize: rem(13),
                    textAlign: 'center',
                  }}
                >
                  Back
                </FlatButton>
              </Flex>
            </Flex>
          </AuthLayout.Small>
        </AuthLayout>
      )}
    </>
  )
}
