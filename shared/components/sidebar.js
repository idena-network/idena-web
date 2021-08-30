/* eslint-disable react/prop-types */
/* eslint-disable no-nested-ternary */
import React from 'react'
import PropTypes from 'prop-types'
import {useRouter} from 'next/router'
import {Trans, useTranslation} from 'react-i18next'
import NextLink from 'next/link'
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
  Flex,
  Image,
  List,
  ListItem,
  Link as ChakraLink,
  CloseButton,
  Portal,
  useBreakpointValue,
  Box,
} from '@chakra-ui/react'
import {PlusSquareIcon} from '@chakra-ui/icons'
import {rem} from '../theme'
import {pluralize} from '../utils/string'
import {parsePersistedValidationState} from '../../screens/validation/utils'
import {useAuthDispatch} from '../providers/auth-context'
import {apiKeyStates, useSettingsState} from '../providers/settings-context'
import {TextLink, Tooltip} from './components'
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
  SyncIcon,
  TelegramIcon,
  WalletIcon,
  TimerIcon,
} from './icons'

function Sidebar({isOpen, onClose, ...props}) {
  return (
    <Flex
      backgroundColor="gray.500"
      color="white"
      height="100vh"
      width={['100%', 200]}
      px={[10, 4]}
      py={[4, 2]}
      zIndex={[8, 2]}
      position={['absolute', 'relative']}
      direction="column"
      display={[isOpen ? 'flex' : 'none', 'flex']}
      {...props}
    >
      <Flex justifyContent="space-between" alignItems="center">
        <ApiStatus />
        <CloseButton
          onClick={onClose}
          boxSize={4}
          visibility={['visible', 'hidden']}
        />
      </Flex>

      <Logo />
      <Nav onClose={onClose} />
      <ActionPanel onClose={onClose} />
    </Flex>
  )
}

function ApiStatus() {
  const settings = useSettingsState()
  const {t} = useTranslation()
  const epoch = useEpoch()

  let bg = 'xwhite.010'
  let color = 'gray.300'
  let text = t('Loading...')

  if (settings.apiKeyState === apiKeyStates.OFFLINE) {
    bg = 'red.020'
    color = 'red.500'
    text = t('Offline')
  } else if (settings.apiKeyState === apiKeyStates.RESTRICTED) {
    bg = 'warning.020'
    color = 'warning.500'
    text = t('Restricted')
  } else if (
    settings.apiKeyState === apiKeyStates.ONLINE ||
    settings.apiKeyState === apiKeyStates.EXTERNAL
  ) {
    bg = 'green.020'
    color = 'green.500'
    text = t('Online')
  }

  return (
    <Flex>
      <Flex
        bg={bg}
        borderRadius="xl"
        px={3}
        py={[1, 1 / 2]}
        fontSize={[16, 13]}
      >
        <Flex align="baseline">
          {settings.apiKeyState === apiKeyStates.RESTRICTED ? (
            <Tooltip
              label={t(
                'You cannot use the shared node for the upcoming validation ceremony.'
              )}
              placement="right"
              zIndex="tooltip"
              bg="graphite.500"
              width={200}
            >
              <TextLink
                href="/node/restricted"
                color={color}
                fontWeight={500}
                lineHeight={rem(18)}
                _hover={{
                  textDecoration: 'none',
                }}
              >
                {text}
              </TextLink>
            </Tooltip>
          ) : settings.apiKeyState === apiKeyStates.ONLINE ? (
            <Tooltip
              label={t(
                'Access to the shared node will be expired after the validation ceremony {{date}}',
                {
                  date: epoch
                    ? new Date(epoch.nextValidation).toLocaleString()
                    : '',
                }
              )}
              placement="right"
              zIndex="tooltip"
              bg="graphite.500"
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
      </Flex>
    </Flex>
  )
}

export function Logo() {
  return (
    <ChakraBox my={8} alignSelf="center">
      <Image
        src="/static/logo.svg"
        alt="Idena logo"
        w={['88px', 14]}
        ignoreFallback
      />
    </ChakraBox>
  )
}

function Nav({onClose}) {
  const {t} = useTranslation()
  const [{nickname}] = useIdentity()
  const {logout} = useAuthDispatch()
  return (
    <Flex alignSelf="stretch">
      <List listStyleType="none" m={0} p={0} width="100%">
        <NavItem
          href="/"
          icon={<ProfileIcon boxSize={[8, 5]} />}
          text={t('My Idena') || nickname}
        ></NavItem>
        <NavItem
          href="/wallets"
          icon={<WalletIcon boxSize={[8, 5]} />}
          text={t('Wallets')}
        ></NavItem>
        <NavItem
          href="/flips/list"
          icon={<GalleryIcon boxSize={[8, 5]} />}
          text={t('Flips')}
        ></NavItem>
        <NavItem
          href="/contacts"
          icon={<ContactsIcon boxSize={[8, 5]} />}
          text={t('Contacts')}
        ></NavItem>
        <NavItem
          href="/settings"
          icon={<SettingsIcon boxSize={[8, 5]} />}
          text={t('Settings')}
        ></NavItem>
        <NavItem
          href=""
          icon={<DeleteIcon boxSize={[8, 5]} />}
          onClick={() => {
            onClose()
            logout()
          }}
          text={t('Logout')}
        ></NavItem>
      </List>
    </Flex>
  )
}

// eslint-disable-next-line react/prop-types
function NavItem({href, icon, text, onClick}) {
  const router = useRouter()
  const active = router.pathname === href
  return (
    <ListItem>
      <NextLink href={href}>
        <ChakraLink
          transition="background 0.3s ease"
          width="100%"
          height="100%"
          fontSize={[16, 13]}
          fontWeight={500}
          color={active ? 'xwhite.500' : 'xwhite.050'}
          _hover={{
            color: 'xwhite.500',
            bg: active ? 'xblack.016' : 'xwhite.010',
          }}
          bg={active ? 'xblack.016' : ''}
          px={2}
          py={[2, 3 / 2]}
          display="flex"
          alignItems="center"
          borderRadius="md"
          onClick={onClick}
        >
          {icon}
          <Text ml={2}>{text}</Text>
        </ChakraLink>
      </NextLink>
    </ListItem>
  )
}

function ActionPanel({onClose}) {
  const {t} = useTranslation()

  const router = useRouter()

  const epoch = useEpoch()
  const [identity] = useIdentity()
  const onboardingPopoverPlacement = useBreakpointValue(['top', 'right'])

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
    <Stack spacing={[2, '1px']} mt={6}>
      {currentPeriod !== EpochPeriod.None && (
        <Block
          title={t('Current period')}
          roundedTop="md"
          roundedBottom={['md', 'none']}
        >
          {currentPeriod}
        </Block>
      )}
      <ChakraBox
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

          if (
            !eitherOnboardingState(
              onboardingPromotingStep(OnboardingStep.Validate)
            )
          ) {
            onClose()
          }
          showCurrentTask()
        }}
      >
        <PulseFrame
          isActive={isPromotingNextOnboardingStep}
          roundedTop={[
            'md',
            currentPeriod === EpochPeriod.None ? 'md' : 'none',
          ]}
          roundedBottom={[
            'md',
            currentPeriod !== EpochPeriod.None ? 'md' : 'none',
          ]}
        >
          <Block
            title={t('My current task')}
            roundedTop={[
              'md',
              currentPeriod === EpochPeriod.None ? 'md' : 'none',
            ]}
            roundedBottom={[
              'md',
              currentPeriod !== EpochPeriod.None ? 'md' : 'none',
            ]}
          >
            <CurrentTask
              epoch={epoch.epoch}
              period={currentPeriod}
              identity={identity}
            />
          </Block>
        </PulseFrame>
      </ChakraBox>

      {currentPeriod === EpochPeriod.None && (
        <OnboardingPopover
          isOpen={eitherOnboardingState(
            onboardingShowingStep(OnboardingStep.Validate)
          )}
          placement={onboardingPopoverPlacement}
          usePortal
        >
          <PopoverTrigger>
            <ChakraBox
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
              <Block
                title={t('Next validation')}
                roundedBottom="md"
                roundedTop={['md', 'none']}
              >
                {formatValidationDate(nextValidation)}
                <Menu autoSelect={false} mr={1}>
                  <MenuButton
                    rounded="md"
                    _expanded={{bg: 'brandGray.500'}}
                    _focus={{outline: 0}}
                    position="absolute"
                    top={1}
                    right={1}
                    py={1.5}
                    px={1 / 2}
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
              </Block>
            </ChakraBox>
          </PopoverTrigger>
          <Portal>
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
                <OnboardingPopoverContentIconRow
                  icon={<TelegramIcon boxSize={5} />}
                >
                  <Trans i18nKey="onboardingValidateSubscribe" t={t}>
                    <OnboardingLinkButton href="https://t.me/IdenaAnnouncements">
                      Subscribe
                    </OnboardingLinkButton>{' '}
                    to the Idena Announcements (important updates only)
                  </Trans>
                </OnboardingPopoverContentIconRow>
                <OnboardingPopoverContentIconRow
                  icon={<SyncIcon boxSize={5} />}
                >
                  {t(
                    `Keep your node synchronized in 45-60 minutes before the validation starts.`
                  )}
                </OnboardingPopoverContentIconRow>
                <OnboardingPopoverContentIconRow
                  icon={<TimerIcon boxSize={5} />}
                >
                  {t(
                    `Solve the flips quickly when validation starts. The first 6 flips must be submitted in less than 2 minutes.`
                  )}
                </OnboardingPopoverContentIconRow>
                <OnboardingPopoverContentIconRow
                  icon={<GalleryIcon boxSize={5} />}
                >
                  <Trans i18nKey="onboardingValidateTest" t={t}>
                    <OnboardingLinkButton href="https://flips.idena.io/?pass=idena.io">
                      Test yourself
                    </OnboardingLinkButton>{' '}
                    before the validation
                  </Trans>
                </OnboardingPopoverContentIconRow>
              </Stack>
            </OnboardingPopoverContent>
          </Portal>
        </OnboardingPopover>
      )}
    </Stack>
  )
}

// eslint-disable-next-line react/prop-types
function PulseFrame({isActive, children, roundedTop, roundedBottom, ...props}) {
  return (
    <ChakraBox {...props}>
      {isActive ? (
        <ChakraBox
          roundedTop={roundedTop}
          roundedBottom={roundedBottom}
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

function Block({title, children, ...props}) {
  return (
    <ChakraFlex
      bg="xwhite.010"
      py={[4, 2]}
      px={[6, 3]}
      direction="column"
      justifySelf="stretch"
      position="relative"
      {...props}
    >
      <Box
        color="xwhite.050"
        fontWeight={['normal', 500]}
        fontSize={[14, 13]}
        mb={[1, 0]}
      >
        {title}
      </Box>
      <Box color="xwhite.500" fontWeight={500} fontSize={[16, 13]}>
        {children}
      </Box>
    </ChakraFlex>
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
          return t('Activate invite')

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
                <NextLink href="/validation">
                  <ChakraLink color="xwhite.500" fontSize={[16, 13]}>
                    {t('Validate')}
                  </ChakraLink>
                </NextLink>
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

export default Sidebar
