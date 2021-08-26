/* eslint-disable react/prop-types */
import {Flex, Box, Text, useBreakpointValue} from '@chakra-ui/react'
import React, {useState} from 'react'
import {FiChevronRight} from 'react-icons/fi'
import Router from 'next/router'
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
          <Avatar address={coinbase} borderRadius={['mobile', '20px']} />
          <Flex
            direction="column"
            justify="center"
            flex="1"
            w={['70%', 'inherit']}
            m={['20px 0 0 0', '0 0 0 20px']}
          >
            <SubHeading color="white" css={{lineHeight: '21px'}}>
              Enter password to unlock your account
            </SubHeading>

            <Flex justify={['center', 'space-between']}>
              <Text wordBreak="break-all" color="xwhite.050" fontSize="mdx">
                {coinbase}
              </Text>
            </Flex>

            <Flex justify="space-between">
              <FlatButton
                onClick={() => showWarning(true)}
                style={{
                  marginBottom: '19px',
                }}
                whiteSpace="break-spaces"
                fontSize={['15px', '13px']}
                m={['21px 0 0 0', '0']}
              >
                <span>Remove private key from this computer</span>

                <Box display={['none', 'initial']}>
                  <FiChevronRight
                    style={{
                      display: 'inline-block',
                    }}
                    fontSize="19px"
                  />
                </Box>
              </FlatButton>
            </Flex>
          </Flex>
        </Flex>
        <Flex w="100%" mt={['24px', '13px']} direction={['column', 'initial']}>
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
              fontSize={['18px', '13px']}
              htmlFor="password"
              style={{
                color: 'white',
              }}
            >
              Password
            </FormLabel>

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
                mt="30px"
                fontSize="mdx"
                background="red.500"
                style={{
                  borderRadius: '9px',
                  padding: `18px 24px`,
                }}
              >
                {error}
              </Flex>
            )}
          </form>
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
  const size = useBreakpointValue(['lg', 'md'])

  return (
    <AuthLayout>
      <AuthLayout.Small>
        <Flex width="100%" direction="column">
          <Flex justify="center" mb="35px">
            <img
              src="/static/idena-logo-round-white.svg"
              alt="logo"
              style={{width: '80px', height: '80px', color: 'red'}}
            />
          </Flex>

          <Flex justify="center">
            <SubHeading color="white">Proof-Of-Person Blockchain</SubHeading>
          </Flex>

          <Text
            color="xwhite.050"
            fontSize="mdx"
            textAlign="center"
            marginBottom="45px"
          >
            Join the mining of the first human-centric cryptocurrency
          </Text>

          <PrimaryButton size={size} onClick={() => Router.push('/key/create')}>
            Create an account
          </PrimaryButton>

          <Flex justifyContent="center">
            <FlatButton
              mt={5}
              fontSize={['15px', '13px']}
              onClick={() => Router.push('/key/import')}
              style={{
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
      background={['gray.500', 'graphite.500']}
      color="white"
      direction="column"
      align="center"
      justify={['flex-start', 'center']}
      flex="1"
      height="100vh"
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
      w={['279px', '480px']}
      pt={['80px', '0']}
      textAlign={['center', 'initial']}
    >
      {children}
    </Flex>
  )
}
// eslint-disable-next-line react/display-name
AuthLayout.Small = function({children}) {
  return (
    <Flex direction="column" justify="center" height="100%">
      <Flex
        align-items="center"
        justify="space-between"
        direction="column"
        w="360px"
        background="rgba(0, 0, 0, 0.16)"
        padding="52px 40px 36px"
        borderRadius="8px"
      >
        {children}
      </Flex>
    </Flex>
  )
}
