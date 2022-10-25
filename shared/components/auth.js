/* eslint-disable react/prop-types */
import {
  Flex,
  Box,
  Text,
  HStack,
  Link,
  useBreakpointValue,
  Image,
  Menu,
  MenuButton,
  Button,
  MenuList,
  MenuItem,
  MenuGroup,
} from '@chakra-ui/react'
import React, {useState} from 'react'
import {FiChevronRight} from 'react-icons/fi'
import Router, {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {CheckIcon} from '@chakra-ui/icons'
import {
  Avatar,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  FormLabel,
  PasswordInput,
  WarningAlert,
} from './components'
import {useAuthDispatch} from '../providers/auth-context'
import {useSettingsState} from '../providers/settings-context'
import {FlatButton, PrimaryButton, SecondaryButton} from './button'
import {SubHeading} from './typo'
import {useDnaAppLink} from '../../screens/dna/hooks'
import {
  ChevronRightIcon,
  GlobeIcon,
  LaptopIcon,
  SimpleArrowDownIcon,
} from './icons'
import {useAppContext} from '../providers/app-context'
import {useLanguage} from '../hooks/use-language'
import {AVAILABLE_LANGS, isoLangs} from '../../i18n'
import {useIsDesktop} from '../utils/utils'
import {use100vh} from '../hooks/use-100vh'

function RestoreKey() {
  const [warning, showWarning] = useState(false)
  const [password, setPassword] = useState('')
  const {login, removeKey} = useAuthDispatch()
  const {coinbase} = useSettingsState()
  const size = useBreakpointValue(['lg', 'md'])
  const [error, setError] = useState()
  const [, {resetRestrictedModal}] = useAppContext()

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

  const isDesktop = useIsDesktop()

  const hasDnaUrl =
    isDesktop && (dnaAppUrl || router.pathname === '/oracles/view')

  return (
    <AuthLayout>
      <AuthLayout.New showLanguage pb={hasDnaUrl ? [0, 0] : 'unset'}>
        <Flex width="100%" direction="column">
          <Flex justify="center" mb={['100px', '35px']} mt={['100px', 0]}>
            <Image
              src="/static/idena-logo-round-white.svg"
              alt="logo"
              w={20}
              h={20}
            />
          </Flex>

          <Box display={hasDnaUrl ? 'none' : 'block'}>
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
          </Box>

          <WarningAlert
            color="warning.500"
            display={hasDnaUrl ? 'block' : 'none'}
            mb={6}
            fontSize={['14px', '13px']}
          >
            {t('Create a new Idena account or Sign in with existing one')}
          </WarningAlert>

          <PrimaryButton size={size} onClick={() => Router.push('/key/create')}>
            {t('Create an account')}
          </PrimaryButton>
          <SecondaryButton
            mt={2}
            size={size}
            onClick={() => Router.push('/key/import')}
          >
            {t('Sign in')}
          </SecondaryButton>
        </Flex>
        {hasDnaUrl && (
          <DnaAppUrlNew
            onClick={() => {
              if (dnaAppUrl) {
                router.push(dnaAppUrl)
                clear()
              } else {
                router.push(`dna://vote/v1?address=${router.query.id}`)
              }
            }}
          />
        )}
      </AuthLayout.New>
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
  const windowHeight = use100vh()
  return (
    <Flex
      background="gray.500"
      color="white"
      direction="column"
      align="center"
      justify={['flex-start', 'center']}
      flex="1"
      height={[`${windowHeight}px`, '100vh']}
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
        p={10}
        borderRadius="8px"
      >
        {children}
      </Flex>
    </Flex>
  )
}

// eslint-disable-next-line react/display-name
AuthLayout.New = function({children, showLanguage, ...props}) {
  return (
    <Flex
      direction="column"
      justify={['flex-start', 'center']}
      height="100%"
      flex={1}
      position="relative"
    >
      <Flex
        flex={[1, 0]}
        align-items="center"
        direction="column"
        w={['full', '360px']}
        background={['unset', 'rgba(0, 0, 0, 0.16)']}
        p={[8, 10]}
        borderRadius="8px"
        {...props}
      >
        {children}
      </Flex>
      {showLanguage && (
        <Flex position="absolute" bottom={6} justifyContent="center" w="full">
          <ChangeLanguage />
        </Flex>
      )}
    </Flex>
  )
}

function ChangeLanguage() {
  const {t, i18n} = useTranslation()
  const {lng, isoLng} = useLanguage()

  return (
    <Menu placement="top">
      {({isOpen}) => (
        <>
          <MenuButton
            as={Button}
            variant="ghost"
            color="gray.5"
            _active={{color: 'white', bg: 'whiteAlpha.200'}}
            _hover={{bg: 'unset'}}
            _focus={{outline: 'none', bg: 'unset'}}
          >
            <HStack alignItems="center" spacing={1}>
              <GlobeIcon boxSize={[5, 4]} />
              <Text fontSize={['16px', 'md']}>{isoLng}</Text>
              <SimpleArrowDownIcon
                boxSize={[3, 2]}
                transform={isOpen ? 'rotate(180deg)' : ''}
              />
            </HStack>
          </MenuButton>
          <MenuList h="500px" overflow="auto">
            <MenuGroup
              title={t('Choose language')}
              color="gray.5"
              fontSize={['14px', '11px']}
              fontWeight="normal"
            >
              {AVAILABLE_LANGS.map(lang => (
                <MenuItem
                  key={lang}
                  py={3}
                  color="gray.500"
                  onClick={() => {
                    i18n.changeLanguage(lang)
                  }}
                  fontSize={['16px', '13px']}
                >
                  <Flex justifyContent="space-between" align="center">
                    <Text>
                      {isoLangs[lang].nativeName} ({lang.toUpperCase()})
                    </Text>
                    {lang === lng && (
                      <CheckIcon boxSize={4} ml={2} color="blue.500" />
                    )}
                  </Flex>
                </MenuItem>
              ))}
            </MenuGroup>
          </MenuList>
        </>
      )}
    </Menu>
  )
}

function DnaAppUrl({url, onOpenInApp}) {
  const {t} = useTranslation()
  return (
    <HStack align="center" spacing={3} color="white" px={2} py={1.5} mb={6}>
      <LaptopIcon name="laptop" boxSize={5} />
      <Link href={url} onClick={onOpenInApp}>
        {t('Open in Idena app')}
      </Link>
    </HStack>
  )
}

function DnaAppUrlNew({onClick}) {
  const {t} = useTranslation()
  return (
    <HStack
      align="center"
      spacing={3}
      color="white"
      px={4}
      py={4}
      mx={-10}
      borderTop="1px solid"
      borderTopColor="gray.500"
      mt={10}
      onClick={onClick}
      cursor="pointer"
      _hover={{
        bg: 'rgba(0, 0, 0, 0.12)',
      }}
      borderBottomRadius="8px"
    >
      <Flex justifyContent="space-between" flex={1}>
        <Flex>
          <LaptopIcon name="laptop" boxSize={5} />
          <Text>{t('Open in Idena app')}</Text>
        </Flex>
        <Flex>
          <ChevronRightIcon boxSize={5} color="white"></ChevronRightIcon>
        </Flex>
      </Flex>
    </HStack>
  )
}
