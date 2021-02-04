/* eslint-disable react/prop-types */
import {Flex, Text} from '@chakra-ui/core'
import {margin} from 'polished'
import {useState} from 'react'
import {FiChevronRight} from 'react-icons/fi'
import Router from 'next/router'
import theme, {rem} from '../theme'
import {Label, Button} from '.'
import {
  Avatar,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  PasswordInput,
} from './components'
import {useAuthDispatch} from '../providers/auth-context'
import {useSettingsState} from '../providers/settings-context'
import {FlatButton, PrimaryButton, SecondaryButton} from './button'
import {SubHeading} from './typo'

function RestoreKey() {
  const [warning, showWarning] = useState(false)
  const [password, setPassword] = useState('')
  const {login, removeKey} = useAuthDispatch()
  const {coinbase} = useSettingsState()
  const [error, setError] = useState()

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
            <SubHeading color="white">
              Enter password to unlock your account
            </SubHeading>

            <Flex justify="space-between">
              <Text color="xwhite.050" fontSize={rem(14)}>
                {coinbase}
              </Text>
            </Flex>

            <Flex justify="space-between">
              <FlatButton
                color={theme.colors.primary}
                onClick={() => showWarning(true)}
                style={{
                  marginBottom: rem(19),
                  fontSize: rem(13),
                }}
              >
                <span>Remove private key from this computer</span>

                <FiChevronRight
                  style={{
                    display: 'inline-block',
                  }}
                  fontSize={rem(19)}
                />
              </FlatButton>
            </Flex>
          </Flex>
        </Flex>
        <Flex
          width="100%"
          style={{
            ...margin(theme.spacings.normal, 0, 0, 0),
          }}
        >
          <form
            style={{width: '100%'}}
            onSubmit={e => {
              try {
                e.preventDefault()
                setError(null)
                login(password)
              } catch (err) {
                setError('Password is invalid. Try again.')
                console.log(err)
              }
            }}
          >
            <Label
              htmlFor="password"
              style={{
                color: 'white',
                fontSize: rem(13),
              }}
            >
              Password
            </Label>
            <Flex width="100%">
              <PasswordInput
                width="100%"
                value={password}
                borderColor="xblack.008"
                backgroundColor="xblack.016"
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
              <Button
                type="submit"
                disabled={!password}
                style={{marginLeft: rem(10)}}
              >
                Proceed
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
        <Dialog
          key="warning"
          isOpen={warning}
          onClose={() => showWarning(false)}
        >
          <DialogHeader>Remove private key?</DialogHeader>
          <DialogBody>
            Make sure you have the private key backup. Otherwise you will lose
            access to your account.
          </DialogBody>
          <DialogFooter>
            <SecondaryButton onClick={() => showWarning(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              onClick={removeKey}
              backgroundColor="red.090"
              _hover={{
                bg: 'red.500',
              }}
            >
              Remove
            </PrimaryButton>
          </DialogFooter>
        </Dialog>
      </AuthLayout.Normal>
    </AuthLayout>
  )
}

function Init() {
  return (
    <AuthLayout>
      <AuthLayout.Small>
        <Flex width="100%" direction="column">
          <Flex justifyContent="center" marginBottom={rem(35)}>
            <img
              src="/static/idena_white.svg"
              alt="logo"
              style={{width: rem(80), height: rem(80)}}
            />
          </Flex>

          <Flex textAlign="center">
            <SubHeading color="white">Proof-Of-Person Blockchain</SubHeading>
          </Flex>

          <Text
            color="xwhite.050"
            fontSize={rem(14)}
            textAlign="center"
            marginBottom={rem(45)}
          >
            Join the mining of the first human-centric cryptocurrency
          </Text>

          <Button onClick={() => Router.push('/key/create')}>
            Create an account
          </Button>

          <Flex justifyContent="center">
            <FlatButton
              color={theme.colors.primary}
              onClick={() => Router.push('/key/import')}
              style={{
                marginTop: rem(20),
                fontSize: rem(13),
                textAlign: 'center',
              }}
            >
              Sign In
            </FlatButton>
          </Flex>
        </Flex>
      </AuthLayout.Small>
    </AuthLayout>
  )
}

export default function Auth() {
  const {encryptedKey, coinbase, initialized} = useSettingsState()
  if (!initialized) {
    return <AuthLayout />
  }
  return !encryptedKey || !coinbase ? <Init /> : <RestoreKey />
}

export function AuthLayout({children}) {
  return (
    <>
      <section>{children}</section>
      <style jsx>{`
        section {
          background: ${theme.colors.darkGraphite};
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          height: 100vh;
        }
      `}</style>
    </>
  )
}

// eslint-disable-next-line react/display-name
AuthLayout.Normal = function({children}) {
  return (
    <>
      <div>{children}</div>
      <style jsx>{`
        div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-direction: column;
          width: ${rem(480)};
        }
      `}</style>
    </>
  )
}
// eslint-disable-next-line react/display-name
AuthLayout.Small = function({children}) {
  return (
    <>
      <div>{children}</div>
      <style jsx>{`
        div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-direction: column;
          width: ${rem(360)};
          background-color: rgba(0, 0, 0, 0.16);
          padding: 52px 40px 36px;
          border-radius: 8px;
        }
      `}</style>
    </>
  )
}
