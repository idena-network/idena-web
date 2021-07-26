/* eslint-disable no-nested-ternary */
import React from 'react'
import PropTypes from 'prop-types'
import {useRouter} from 'next/router'
import {margin, borderRadius, darken, transparentize, padding} from 'polished'
import {Trans, useTranslation} from 'react-i18next'
import {
  Button,
  Stack,
  Text,
  Flex as ChakraFlex,
  Box as ChakraBox,
  PopoverTrigger,
  MenuButton,
  MenuList,
  MenuItem,
  Menu,
} from '@chakra-ui/react'
import {PlusSquareIcon} from '@chakra-ui/icons'
import {Box, Link} from '.'
import Flex from './flex'
import theme, {rem} from '../theme'
import {pluralize} from '../utils/string'
import {parsePersistedValidationState} from '../../screens/validation/utils'
import {useAuthDispatch} from '../providers/auth-context'
import {apiKeyStates, useSettingsState} from '../providers/settings-context'
import {Tooltip} from './components'
import {EpochPeriod, IdentityStatus, OnboardingStep} from '../types'
import {useIdentity} from '../providers/identity-context'
import {useEpoch} from '../providers/epoch-context'
import {useOnboarding} from '../providers/onboarding-context'
import {
  OnboardingPopover,
  OnboardingPopoverContent,
  OnboardingPopoverContentIconRow,
  OnboardingLinkButton,
} from './onboarding'
import {
  buildNextValidationCalendarLink,
  eitherState,
  formatValidationDate,
  openExternalUrl,
} from '../utils/utils'
import {
  onboardingPromotingStep,
  onboardingShowingStep,
} from '../utils/onboarding'
import {
  ContactsIcon,
  DeleteIcon,
  GalleryIcon,
  MoreIcon,
  ProfileIcon,
  SettingsIcon,
  WalletIcon,
} from './icons'

function Sidebar() {
  return (
    <section>
      <Flex direction="column" align="flex-start">
        <ApiStatus />
        <Logo />
        <Nav />
        <ActionPanel />
      </Flex>
      <style jsx>{`
        section {
          background: ${theme.colors.primary2};
          color: ${theme.colors.white};
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100vh;
          overflow: hidden;
          padding: ${rem(8)} ${rem(16)};
          width: ${rem(200)};
          position: relative;
          z-index: 2;
        }
      `}</style>
    </section>
  )
}

function ApiStatus() {
  const settings = useSettingsState()
  const epoch = useEpoch()

  let bg = theme.colors.white01
  let color = theme.colors.muted
  let text = 'Loading...'

  if (settings.apiKeyState === apiKeyStates.OFFLINE) {
    bg = theme.colors.danger02
    color = theme.colors.danger
    text = 'Offline'
  } else if (settings.apiKeyState === apiKeyStates.EXPIRED) {
    bg = theme.colors.warning02
    color = theme.colors.warning
    text = 'Expiring'
  } else if (
    settings.apiKeyState === apiKeyStates.ONLINE ||
    settings.apiKeyState === apiKeyStates.EXTERNAL
  ) {
    bg = theme.colors.success02
    color = theme.colors.success
    text = 'Online'
  }

  return (
    <Box
      bg={bg}
      css={{
        borderRadius: rem(12),
        ...margin(0, 0, 0, rem(-8)),
        ...padding(rem(2), rem(12), rem(4), rem(12)),
      }}
    >
      <Flex align="baseline">
        {settings.apiKeyState === apiKeyStates.EXPIRED ? (
          <Link href="/node/expired">
            <Text color={color} fontWeight={500} lineHeight={rem(18)}>
              {text}
            </Text>
          </Link>
        ) : settings.apiKeyState === apiKeyStates.ONLINE ? (
          <Tooltip
            label={`Access to the shared node will be expired after the validation ceremony ${
              epoch ? new Date(epoch.nextValidation).toLocaleString() : ''
            }`}
            placement="right"
            zIndex={1000}
            bg="#45484d"
            width={200}
          >
            <Text color={color} fontWeight={500} lineHeight={rem(18)}>
              {text}
            </Text>
          </Tooltip>
        ) : (
          <Text color={color} fontWeight={500} lineHeight={rem(18)}>
            {text}
          </Text>
        )}
      </Flex>
    </Box>
  )
}

export function Logo() {
  return (
    <Box
      css={{
        alignSelf: 'center',
        ...margin(rem(32), 0),
      }}
    >
      <img src="/static/logo.svg" alt="Idena logo" />
      <style jsx>{`
        img {
          width: ${rem(56)};
        }
      `}</style>
    </Box>
  )
}

function Nav() {
  const {t} = useTranslation()
  const [{nickname}] = useIdentity()
  const {logout} = useAuthDispatch()
  return (
    <nav>
      <ul
        style={{
          listStyleType: 'none',
          ...padding(0),
          ...margin(0),
          textAlign: 'left',
        }}
      >
        <NavItem href="/" icon={<ProfileIcon boxSize={5} />}>
          {t('My Idena') || nickname}
        </NavItem>
        <NavItem href="/wallets" icon={<WalletIcon boxSize={5} />}>
          {t('Wallets')}
        </NavItem>
        <NavItem href="/flips/list" icon={<GalleryIcon boxSize={5} />}>
          {t('Flips')}
        </NavItem>
        <NavItem href="/contacts" icon={<ContactsIcon boxSize={5} />}>
          {t('Contacts')}
        </NavItem>
        <NavItem href="/settings" icon={<SettingsIcon boxSize={5} />}>
          {t('Settings')}
        </NavItem>
        <NavItem href="" icon={<DeleteIcon boxSize={5} />} onClick={logout}>
          {t('Logout')}
        </NavItem>
      </ul>
      <style jsx>{`
        nav {
          align-self: stretch;
        }
        .icon {
          margin-left: -4px;
          margin-top: -4px;
          margin-bottom: -3px;
          position: relative;
          top: 1px;
        }
      `}</style>
    </nav>
  )
}

// eslint-disable-next-line react/prop-types
function NavItem({href, icon, children, onClick}) {
  const router = useRouter()
  const active = router.pathname === href
  const bg = active ? transparentize(0.84, theme.colors.black0) : ''
  const bgHover = active
    ? transparentize(0.84, theme.colors.black0)
    : transparentize(0.9, theme.colors.white)
  const color = active ? theme.colors.white : theme.colors.white05
  return (
    <li>
      <Link
        href={href}
        color={color}
        hoverColor={theme.colors.white}
        fontWeight={500}
        width="100%"
        height="100%"
        style={{
          fontWeight: 500,
          lineHeight: rem(20),
          ...padding(rem(6), rem(8)),
        }}
        onClick={onClick}
      >
        <Flex align="center">
          {React.cloneElement(icon, {
            color,
            fontSize: theme.fontSizes.normal,
          })}
          <Box w="8px" />
          {children}
        </Flex>
      </Link>
      <style jsx>{`
        li {
          background: ${bg};
          border-radius: ${rem(6)};
          color: ${theme.colors.white05};
          cursor: pointer;
          transition: background 0.3s ease;
        }
        li:hover {
          border-radius: 4px;
          background: ${bgHover};
        }
      `}</style>
    </li>
  )
}

function ActionPanel() {
  const {t} = useTranslation()

  const router = useRouter()

  const epoch = useEpoch()
  const [identity] = useIdentity()

  const [
    currentOnboarding,
    {showCurrentTask, dismissCurrentTask},
  ] = useOnboarding()

  if (!epoch) {
    return null
  }

  const {currentPeriod, nextValidation} = epoch

  const eitherOnboardingState = (...states) =>
    eitherState(currentOnboarding, ...states)

  const isPromotingNextOnboardingStep =
    currentPeriod === EpochPeriod.None &&
    (eitherOnboardingState(
      onboardingPromotingStep(OnboardingStep.ActivateInvite),
      onboardingPromotingStep(OnboardingStep.ActivateMining)
    ) ||
      (eitherOnboardingState(
        onboardingPromotingStep(OnboardingStep.Validate)
      ) &&
        [IdentityStatus.Candidate, IdentityStatus.Newbie].includes(
          identity.state
        )) ||
      (eitherOnboardingState(
        onboardingPromotingStep(OnboardingStep.CreateFlips)
      ) &&
        [IdentityStatus.Newbie].includes(identity.state)))

  return (
    <Box
      bg={theme.colors.white01}
      css={{
        minWidth: '100%',
        ...borderRadius('top', rem(6)),
        ...borderRadius('bottom', rem(6)),
        ...margin(rem(24), 0, 0),
      }}
    >
      {currentPeriod !== EpochPeriod.None && (
        <Block title={t('Current period')}>{currentPeriod}</Block>
      )}
      <ChakraBox
        roundedTop="md"
        cursor={isPromotingNextOnboardingStep ? 'pointer' : 'default'}
        onClick={() => {
          if (
            eitherOnboardingState(
              OnboardingStep.ActivateInvite,
              OnboardingStep.ActivateMining
            )
          )
            router.push('/')
          if (eitherOnboardingState(OnboardingStep.CreateFlips))
            router.push('/flips/list')

          showCurrentTask()
        }}
      >
        <PulseFrame isActive={isPromotingNextOnboardingStep}>
          <Block title={t('My current task')}>
            <CurrentTask
              epoch={epoch.epoch}
              period={currentPeriod}
              identity={identity}
            />
          </Block>
        </PulseFrame>
      </ChakraBox>

      {currentPeriod === EpochPeriod.None && (
        <>
          <OnboardingPopover
            isOpen={eitherOnboardingState(
              onboardingShowingStep(OnboardingStep.Validate)
            )}
            placement="right"
          >
            <PopoverTrigger>
              <ChakraBox
                roundedBottom="md"
                bg={
                  eitherOnboardingState(
                    onboardingShowingStep(OnboardingStep.Validate)
                  )
                    ? 'rgba(216, 216, 216, .1)'
                    : 'transparent'
                }
                position="relative"
                zIndex={9}
              >
                <ChakraFlex justify="space-between" align="baseline" pr={1}>
                  <Block title={t('Next validation')}>
                    {formatValidationDate(nextValidation)}
                  </Block>
                  <Menu autoSelect={false} mr={1}>
                    <MenuButton
                      rounded="md"
                      py="3/2"
                      px="2px"
                      mt="-6px"
                      _expanded={{bg: 'brandGray.500'}}
                      _focus={{outline: 0}}
                    >
                      <MoreIcon boxSize={5} />
                    </MenuButton>
                    <MenuList
                      placement="bottom-end"
                      border="none"
                      shadow="0 4px 6px 0 rgba(83, 86, 92, 0.24), 0 0 2px 0 rgba(83, 86, 92, 0.2)"
                      rounded="lg"
                      py={2}
                      minWidth="145px"
                    >
                      <MenuItem
                        color="brandGray.500"
                        fontWeight={500}
                        px={3}
                        py={2}
                        _hover={{bg: 'gray.50'}}
                        _focus={{bg: 'gray.50'}}
                        _selected={{bg: 'gray.50'}}
                        _active={{bg: 'gray.50'}}
                        onClick={() => {
                          openExternalUrl(
                            buildNextValidationCalendarLink(nextValidation)
                          )
                        }}
                      >
                        <PlusSquareIcon
                          boxSize={5}
                          mr={3}
                          color="brandBlue.500"
                        />
                        Add to calendar
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </ChakraFlex>
              </ChakraBox>
            </PopoverTrigger>
            <OnboardingPopoverContent
              title={t('Schedule your next validation')}
              maxW="sm"
              additionFooterActions={
                <Button
                  variant="unstyled"
                  onClick={() => {
                    openExternalUrl(
                      'https://medium.com/idena/how-do-i-start-using-idena-c49418e01a06'
                    )
                  }}
                >
                  {t('Read more')}
                </Button>
              }
              onDismiss={dismissCurrentTask}
            >
              <Stack spacing={5}>
                <OnboardingPopoverContentIconRow icon="telegram">
                  <Trans i18nKey="onboardingValidateSubscribe" t={t}>
                    <OnboardingLinkButton href="https://t.me/IdenaAnnouncements">
                      Subscribe
                    </OnboardingLinkButton>{' '}
                    to the Idena Announcements (important updates only)
                  </Trans>
                </OnboardingPopoverContentIconRow>
                <OnboardingPopoverContentIconRow icon="sync">
                  {t(
                    `Keep your node synchronized in 45-60 minutes before the validation starts.`
                  )}
                </OnboardingPopoverContentIconRow>
                <OnboardingPopoverContentIconRow icon="timer">
                  {t(
                    `Solve the flips quickly when validation starts. The first 6 flips must be submitted in less than 2 minutes.`
                  )}
                </OnboardingPopoverContentIconRow>
                <OnboardingPopoverContentIconRow icon="gallery">
                  <Trans i18nKey="onboardingValidateTest" t={t}>
                    <OnboardingLinkButton href="https://flips.idena.io/?pass=idena.io">
                      Test yourself
                    </OnboardingLinkButton>{' '}
                    before the validation
                  </Trans>
                </OnboardingPopoverContentIconRow>
              </Stack>
            </OnboardingPopoverContent>
          </OnboardingPopover>
        </>
      )}
    </Box>
  )
}

// eslint-disable-next-line react/prop-types
function PulseFrame({isActive, children, ...props}) {
  return (
    <ChakraBox roundedTop="md" {...props}>
      {isActive ? (
        <ChakraBox
          roundedTop="md"
          shadow="inset 0 0 0 2px #578fff"
          animation="pulseFrame 1.2s infinite"
        >
          {children}
          <style jsx global>{`
            @keyframes pulseFrame {
              0% {
                box-shadow: inset 0 0 0 2px rgba(87, 143, 255, 0),
                  inset 0 0 0 6px rgba(87, 143, 255, 0);
              }

              40% {
                box-shadow: inset 0 0 0 2px rgba(87, 143, 255, 1),
                  inset 0 0 0 6px rgba(87, 143, 255, 0.3);
              }

              50% {
                box-shadow: inset 0 0 0 2px rgba(87, 143, 255, 1),
                  inset 0 0 0 6px rgba(87, 143, 255, 0.3);
              }

              100% {
                box-shadow: inset 0 0 0 2px rgba(87, 143, 255, 0),
                  inset 0 0 0 6px rgba(87, 143, 255, 0);
              }
            }
          `}</style>
        </ChakraBox>
      ) : (
        children
      )}
    </ChakraBox>
  )
}

function Block({title, children}) {
  return (
    <Box
      css={{
        borderBottom: `solid 1px ${theme.colors.gray3}`,
        ...margin(0, 0, rem(1)),
        ...padding(rem(8), rem(12)),
      }}
    >
      <Text
        color={theme.colors.white05}
        fontWeight={500}
        css={{lineHeight: rem(19)}}
      >
        {title}
      </Text>
      <Text
        color={theme.colors.white}
        fontWeight={500}
        css={{display: 'block', lineHeight: rem(20)}}
      >
        {children}
      </Text>
    </Box>
  )
}

Block.propTypes = {
  title: PropTypes.string,
  children: PropTypes.node,
}

function CurrentTask({epoch, period}) {
  const {t} = useTranslation()

  const [identity] = useIdentity()

  const [currentOnboarding] = useOnboarding()

  if (!period || !identity || !identity.state) return null

  switch (period) {
    case EpochPeriod.None: {
      const {
        flips,
        requiredFlips: requiredFlipsNumber,
        availableFlips: availableFlipsNumber,
        state: status,
      } = identity

      switch (true) {
        case identity.canActivateInvite:
          return (
            <Link href="/" color={theme.colors.white}>
              {t('Activate invite')}
            </Link>
          )

        case currentOnboarding.matches(OnboardingStep.ActivateMining): {
          return t('Activate mining status')
        }

        case [
          IdentityStatus.Human,
          IdentityStatus.Verified,
          IdentityStatus.Newbie,
        ].includes(status): {
          const publishedFlipsNumber = (flips || []).length
          const remainingRequiredFlipsNumber =
            requiredFlipsNumber - publishedFlipsNumber
          const optionalFlipsNumber =
            availableFlipsNumber -
            Math.max(requiredFlipsNumber, publishedFlipsNumber)

          const shouldSendFlips = remainingRequiredFlipsNumber > 0

          return shouldSendFlips
            ? `Create ${remainingRequiredFlipsNumber} required ${pluralize(
                'flip',
                remainingRequiredFlipsNumber
              )}`
            : `Wait for validation${
                optionalFlipsNumber > 0
                  ? ` or create ${optionalFlipsNumber} optional ${pluralize(
                      'flip',
                      optionalFlipsNumber
                    )}`
                  : ''
              }`
        }

        case [
          IdentityStatus.Candidate,
          IdentityStatus.Suspended,
          IdentityStatus.Zombie,
        ].includes(status):
          return t('Wait for validation')

        default:
          return '...'
      }
    }

    case EpochPeriod.ShortSession:
    case EpochPeriod.LongSession: {
      const validationState = parsePersistedValidationState()

      switch (true) {
        case [IdentityStatus.Undefined, IdentityStatus.Invite].includes(
          identity.state
        ):
          return t(
            'Can not start validation session because you did not activate invite'
          )

        case [
          IdentityStatus.Candidate,
          IdentityStatus.Suspended,
          IdentityStatus.Zombie,
          IdentityStatus.Newbie,
          IdentityStatus.Verified,
          IdentityStatus.Human,
        ].includes(identity.state): {
          if (validationState) {
            const {
              done,
              context: {epoch: lastValidationEpoch},
            } = validationState

            const isValidated = [
              IdentityStatus.Newbie,
              IdentityStatus.Verified,
              IdentityStatus.Human,
            ].includes(identity.state)

            if (lastValidationEpoch === epoch)
              return done ? (
                t(`Wait for validation end`)
              ) : (
                <Link href="/validation" color={theme.colors.white}>
                  {t('Validate')}
                </Link>
              )

            return isValidated
              ? t(
                  'Can not start validation session because you did not submit flips.'
                )
              : 'Starting your validation session...' // this is not normal thus not localized
          }
          return '...'
        }

        default:
          return '...'
      }
    }

    case EpochPeriod.FlipLottery:
      return t('Shuffling flips...')

    case EpochPeriod.AfterLongSession:
      return t(`Wait for validation end`)

    default:
      return '...'
  }
}

function UpdateButton({text, version, ...props}) {
  return (
    <>
      <button type="button" {...props}>
        <span>{text}</span>
        <br />
        {version}
      </button>
      <style jsx>{`
        button {
          background: ${theme.colors.white};
          border: none;
          border-radius: 6px;
          color: ${theme.colors.muted};
          cursor: pointer;
          padding: ${`0.5em 1em`};
          outline: none;
          transition: background 0.3s ease, color 0.3s ease;
          width: 100%;
          margin-bottom: ${theme.spacings.medium16};
        }
        button span {
          color: ${theme.colors.text};
        }
        button:hover {
          background: ${darken(0.1, theme.colors.white)};
        }
        button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
      `}</style>
    </>
  )
}

UpdateButton.propTypes = {
  text: PropTypes.string,
  version: PropTypes.string,
}

export default Sidebar
