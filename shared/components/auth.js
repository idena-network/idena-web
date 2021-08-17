/* eslint-disable react/prop-types */
import {Flex, Box, Text, useBreakpointValue} from '@chakra-ui/react'
import {margin} from 'polished'
import React, {useState} from 'react'
import {FiChevronRight} from 'react-icons/fi'
import Router from 'next/router'
import theme, {rem} from '../theme'
import {
  Avatar,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  FormLabel,
  PasswordInput,
} from './components'
import {useAuthDispatch} from '../providers/auth-context'
import {useSettingsState} from '../providers/settings-context'
import {FlatButton, PrimaryButton, SecondaryButton} from './button'
import {SubHeading} from './typo'
import {useDnaUrl} from '../hooks/use-dna-link'
import {DnaAppUrl} from '../../screens/dna/components'

function RestoreKey() {
  const [warning, showWarning] = useState(false)
  const [password, setPassword] = useState('')
  const {login, removeKey} = useAuthDispatch()
  const {coinbase} = useSettingsState()
  const size = useBreakpointValue(['lg', 'md'])
  const [error, setError] = useState()

  const dnaAppUrl = useDnaUrl()

  return (
    <AuthLayout>
      <AuthLayout.Normal>
        <Flex
          direction={['column', 'initial']}
          align={['center', 'initial']}
          width="100%"
        >
          <Avatar address={coinbase} borderRadius={rem(20)} />
          <Flex
            direction="column"
            justify="center"
            flex="1"
            style={{marginLeft: rem(20)}}
          >
            <SubHeading color="white">
              <Box display={['none', 'inherit']}>
                Enter password to unlock your account
              </Box>
            </SubHeading>

            <Flex justify={['center', 'space-between']}>
              <Text
                color="xwhite.050"
                w={['60%', 'inherit']}
                fontSize={rem(14)}
              >
                {coinbase}
              </Text>
            </Flex>

            <Flex display={['none', 'inherit']} justify="space-between">
              <FlatButton
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
          direction={['column', 'initial']}
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
              }
            }}
          >
            <FormLabel
              display={['none', 'inherit']}
              htmlFor="password"
              style={{
                color: 'white',
                fontSize: rem(13),
              }}
            >
              Password
            </FormLabel>
            <Box display={['inherit', 'none']}>
              <SubHeading
                css={{
                  marginTop: rem(50),
                  marginBottom: '28px',
                  fontWeight: '400',
                }}
                color="white"
              >
                Password
              </SubHeading>
            </Box>

            <Flex width="100%" direction={['column', 'initial']}>
              <PasswordInput
                size={size}
                width="100%"
                value={password}
                borderColor="xblack.008"
                backgroundColor="xblack.016"
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
              <PrimaryButton
                size={size}
                type="submit"
                isDisabled={!password}
                m={['16px 0 0 0', '0 0 0 10px']}
              >
                Proceed
              </PrimaryButton>
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
          <Flex w="100%" justify="center" display={['inherit', 'none']}>
            <FlatButton
              onClick={() => showWarning(true)}
              style={{
                marginTop: rem(31),
                fontSize: rem(15),
              }}
            >
              <span>Change an account</span>
            </FlatButton>
          </Flex>
        </Flex>

        {dnaAppUrl && <DnaAppUrl url={dnaAppUrl} />}

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
  const dnaAppUrl = useDnaUrl()

  return (
    <AuthLayout>
      <AuthLayout.Small>
        <Flex width="100%" direction="column">
          <Flex justifyContent="center" marginBottom={rem(35)}>
            <img
              src="/static/idena-logo-round-white.svg"
              alt="logo"
              style={{width: rem(80), height: rem(80), color: 'red'}}
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

          <PrimaryButton onClick={() => Router.push('/key/create')}>
            Create an account
          </PrimaryButton>

          <Flex justifyContent="center">
            <FlatButton
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
      {dnaAppUrl && <DnaAppUrl url={dnaAppUrl} />}
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
    <Flex
      background="graphite.500"
      color="white"
      direction="column"
      align="center"
      justify={['flex-start', 'center']}
      flex="1"
      height="100vh"
      pt={[rem(80), '0']}
    >
      {children}
    </Flex>
  )
}

// eslint-disable-next-line react/display-name
AuthLayout.Normal = function({children}) {
  return (
    <Flex
      align="center"
      justify={['start', 'space-between']}
      direction="column"
      w={[rem(279), rem(480)]}
      textAlign={['center', 'initial']}
    >
      {children}
    </Flex>
  )
}
// eslint-disable-next-line react/display-name
AuthLayout.Small = function({children}) {
  return (
    <Flex
      align-items="center"
      justify="space-between"
      direction="column"
      w={rem(360)}
      background="rgba(0, 0, 0, 0.16)"
      padding="52px 40px 36px"
      border-radius="8px"
    >
      {children}
    </Flex>
  )
}
