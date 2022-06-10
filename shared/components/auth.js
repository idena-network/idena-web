/* eslint-disable react/prop-types */
import {
  Flex,
  Box,
  Text,
  HStack,
  Link,
  useBreakpointValue,
} from '@chakra-ui/react'
import React, {useState} from 'react'
import {FiChevronRight} from 'react-icons/fi'
import Router, {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
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
import {useDnaAppLink} from '../../screens/dna/hooks'
import {LaptopIcon} from './icons'
import {useAppContext} from '../providers/app-context'

function RestoreKey() {
  const [warning, showWarning] = useState(false)
  const [password, setPassword] = useState('')
  const {login, removeKey} = useAuthDispatch()
  const {coinbase} = useSettingsState()
  const size = useBreakpointValue(['lg', 'md'])
  const [error, setError] = useState()
  const {resetRestrictedModal} = useAppContext()

  const [dnaAppUrl, {dismiss: dimissDnaAppLink}] = useDnaAppLink()

  const router = useRouter()

  const {t} = useTranslation()

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
              {t('Enter password to unlock your account')}
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
                <span>{t('Remove private key from this device')}</span>

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
                resetRestrictedModal()
                login(password)
              } catch (err) {
                setError(t('Password is invalid. Try again.'))
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
              {t('Password')}
            </FormLabel>

            <Flex width="100%" direction={['column', 'initial']}>
              <PasswordInput
                size={size}
                width="100%"
                value={password}
                borderColor="xblack.008"
                backgroundColor="xblack.016"
                onChange={e => setPassword(e.target.value)}
                placeholder={t('Enter your password')}
              />
              <PrimaryButton
                size={size}
                type="submit"
                isDisabled={!password}
                m={['16px 0 0 0', '0 0 0 10px']}
              >
                {t('Proceed')}
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
      </AuthLayout.Normal>

      {dnaAppUrl && (
        <DnaAppUrl url={dnaAppUrl} onOpenInApp={dimissDnaAppLink} />
      )}

      {router.pathname === '/oracles/view' && (
        <DnaAppUrl
          url={`dna://vote/v1?address=${router.query.id}`}
          onOpenInApp={() => {}}
        />
      )}

      <Dialog key="warning" isOpen={warning} onClose={() => showWarning(false)}>
        <DialogHeader>{t('Remove private key?')}</DialogHeader>
        <DialogBody>
          {t(
            'Make sure you have the private key backup. Otherwise you will lose access to your account.'
          )}
        </DialogBody>
        <DialogFooter>
          <SecondaryButton onClick={() => showWarning(false)}>
            {t('Cancel')}
          </SecondaryButton>
          <PrimaryButton
            onClick={removeKey}
            backgroundColor="red.090"
            _hover={{
              bg: 'red.500',
            }}
          >
            {t('Remove')}
          </PrimaryButton>
        </DialogFooter>
      </Dialog>
    </AuthLayout>
  )
}

function Init() {
  const [dnaAppUrl, {clear}] = useDnaAppLink()
  const router = useRouter()

  const size = useBreakpointValue(['lg', 'md'])

  const {t} = useTranslation()

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
            {t('Join the mining of the first human-centric cryptocurrency')}
          </Text>

          <PrimaryButton size={size} onClick={() => Router.push('/key/create')}>
            {t('Create an account')}
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
              {t('Sign In')}
            </FlatButton>
          </Flex>
        </Flex>
      </AuthLayout.Small>
      {dnaAppUrl && <DnaAppUrl url={dnaAppUrl} onOpenInApp={clear} />}
      {router.pathname === '/oracles/view' && (
        <DnaAppUrl
          url={`dna://vote/v1?address=${router.query.id}`}
          onOpenInApp={() => {}}
        />
      )}
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
      justify={['start', 'center']}
      direction="column"
      h="full"
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

function DnaAppUrl({url, onOpenInApp}) {
  const {t} = useTranslation()
  return (
    <HStack align="center" spacing={3} color="muted" px={2} py={1.5} mb={6}>
      <LaptopIcon name="laptop" boxSize={5} />
      <Link href={url} onClick={onOpenInApp}>
        {t('Open in Idena app')}
      </Link>
    </HStack>
  )
}
