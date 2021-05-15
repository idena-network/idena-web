/* eslint-disable no-nested-ternary */
import React from 'react'
import PropTypes from 'prop-types'
import {useRouter} from 'next/router'
import {margin, borderRadius, darken, transparentize, padding} from 'polished'
import {useTranslation} from 'react-i18next'
import {Icon, Text} from '@chakra-ui/core'
import {Box, Link} from '.'
import Flex from './flex'
import theme, {rem} from '../theme'
import {pluralize} from '../utils/string'
import {parsePersistedValidationState} from '../../screens/validation/utils'
import {useAuthDispatch} from '../providers/auth-context'
import {apiKeyStates, useSettingsState} from '../providers/settings-context'
import {Tooltip} from './components'
import {EpochPeriod, IdentityStatus} from '../types'
import {useIdentity} from '../providers/identity-context'
import {useEpoch} from '../providers/epoch-context'

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
    text = 'Expired'
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
        <NavItem href="/" icon={<Icon name="profile" size={5} />}>
          {t('My Idena') || nickname}
        </NavItem>
        <NavItem href="/wallets" icon={<Icon name="wallet" size={5} />}>
          {t('Wallets')}
        </NavItem>
        <NavItem href="/flips/list" icon={<Icon name="gallery" size={5} />}>
          {t('Flips')}
        </NavItem>
        <NavItem href="/settings" icon={<Icon name="settings" size={5} />}>
          {t('Settings')}
        </NavItem>
        <NavItem
          href=""
          icon={<Icon name="delete" size={5} />}
          onClick={logout}
        >
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
  const epoch = useEpoch()
  const {t} = useTranslation()

  if (!epoch) {
    return null
  }

  const {currentPeriod, nextValidation} = epoch
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
      <Block title={t('My current task')}>
        <CurrentTask epoch={epoch.epoch} period={currentPeriod} />
      </Block>
      {currentPeriod === EpochPeriod.None && (
        <Block title={t('Next validation')}>
          {new Date(nextValidation).toLocaleString()}
        </Block>
      )}
    </Box>
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
