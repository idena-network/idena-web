/* eslint-disable react/prop-types */
import React from 'react'
import {
  Stack,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  useTheme,
  FormControl,
  Text,
  Box,
  Flex,
  Textarea,
  Button,
} from '@chakra-ui/core'
import {useTranslation} from 'react-i18next'
import dayjs from 'dayjs'
import {useMachine} from '@xstate/react'
import {
  Avatar,
  Tooltip,
  FormLabel,
  Input,
  Drawer,
  DrawerHeader,
  DrawerBody,
  Dialog,
  DialogBody,
  DialogFooter,
} from '../../shared/components/components'
import {rem} from '../../shared/theme'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {
  mapToFriendlyStatus,
  useIdentityState,
} from '../../shared/providers/identity-context'
import {IdentityStatus} from '../../shared/types'
import {
  useNotificationDispatch,
  NotificationType,
} from '../../shared/providers/notification-context'
import useRpc from '../../shared/hooks/use-rpc'
import useTx from '../../shared/hooks/use-tx'
import {FormGroup, Label, Switcher} from '../../shared/components'
import {Notification, Snackbar} from '../../shared/components/notifications'
import {Spinner} from '../../shared/components/spinner'
import {
  loadPersistentState,
  loadPersistentStateValue,
} from '../../shared/utils/persist'
import {createTimerMachine} from '../../shared/machines'
import {usePersistence} from '../../shared/hooks/use-persistent-state'
import {useAuthState} from '../../shared/providers/auth-context'
import {Transaction} from '../../shared/models/transaction'
import {getRawTx, sendRawTx} from '../../shared/api'
import {
  privateKeyToAddress,
  privateKeyToPublicKey,
} from '../../shared/utils/crypto'

export function UserInlineCard({address, state}) {
  return (
    <Stack isInline spacing={6} align="center" mb={6} width={rem(480)}>
      <Avatar address={address} />
      <Stack spacing={1}>
        <Heading as="h2" fontSize="lg" fontWeight={500} lineHeight="short">
          {mapToFriendlyStatus(state)}
        </Heading>
        <Heading
          as="h3"
          fontSize="mdx"
          fontWeight="normal"
          color="muted"
          lineHeight="shorter"
        >
          {address}
        </Heading>
      </Stack>
    </Stack>
  )
}

export function UserStatList(props) {
  return (
    <Stack spacing={4} bg="gray.50" px={10} py={8} rounded="lg" {...props} />
  )
}

export function SimpleUserStat({label, value, ...props}) {
  return (
    <UserStat {...props}>
      <UserStatLabel>{label}</UserStatLabel>
      <UserStatValue>{value}</UserStatValue>
    </UserStat>
  )
}

export function AnnotatedUserStat({
  annotation,
  label,
  value,
  children,
  ...props
}) {
  const {colors} = useTheme()
  return (
    <UserStat {...props}>
      <UserStatLabel borderBottom={`dotted 1px ${colors.muted}`} cursor="help">
        <UserStatLabelTooltip label={annotation}>{label}</UserStatLabelTooltip>
      </UserStatLabel>
      {value && <UserStatValue>{value}</UserStatValue>}
      {children}
    </UserStat>
  )
}

export function UserStat(props) {
  return <Stat as={Stack} spacing="2px" {...props} />
}

export function UserStatLabel(props) {
  return (
    <StatLabel
      color="muted"
      alignSelf="flex-start"
      fontSize="md"
      lineHeight="short"
      {...props}
    />
  )
}

export function UserStatValue(props) {
  return (
    <StatNumber fontSize="md" fontWeight={500} lineHeight="base" {...props} />
  )
}

export function UserStatLabelTooltip(props) {
  return <Tooltip placement="top" zIndex="tooltip" {...props} />
}

export function ActivateInviteForm() {
  const {t} = useTranslation()

  const {addError} = useNotificationDispatch()

  const {canActivateInvite, state: status} = useIdentityState()
  const {coinbase, privateKey} = useAuthState()

  const [code, setCode] = React.useState()

  const [{mining}, setHash] = useTx()

  if (!canActivateInvite) {
    return null
  }

  const sendActivateInviteTx = async () => {
    try {
      const rawTx = await getRawTx(
        1,
        privateKeyToAddress(code),
        coinbase,
        0,
        0,
        privateKeyToPublicKey(privateKey)
      )

      const tx = new Transaction().fromHex(rawTx)
      tx.sign(code)

      const hex = tx.toHex()

      const result = await sendRawTx(`0x${hex}`)
      console.log(result)
      setHash(result)
    } catch (e) {
      addError({title: `Failed to activate invite: ${e.message}`})
    }
  }

  return (
    <Box
      as="form"
      onSubmit={async e => {
        e.preventDefault()
        try {
          await sendActivateInviteTx(code)
        } catch ({message}) {
          addError({
            title: message,
          })
        }
      }}
    >
      <Stack spacing={6}>
        <FormControl>
          <Stack spacing={2}>
            <Flex justify="space-between" align="center">
              <FormLabel htmlFor="code" color="muted">
                {t('Invitation code')}
              </FormLabel>
              <Button
                variant="ghost"
                isDisabled={mining || status === IdentityStatus.Invite}
                bg="unset"
                color="muted"
                h="unset"
                p={0}
                _hover={{bg: 'unset'}}
                _active={{bg: 'unset'}}
                _focus={{boxShadow: 'none'}}
                onClick={() => setCode(global.clipboard.readText())}
              >
                {t('Paste')}
              </Button>
            </Flex>
            <Textarea
              id="code"
              value={code}
              borderColor="gray.300"
              px={3}
              pt="3/2"
              pb={2}
              isDisabled={mining || status === IdentityStatus.Invite}
              minH={rem(50)}
              placeholder={
                status === IdentityStatus.Invite
                  ? 'Click the button to activate invitation'
                  : undefined
              }
              _disabled={{
                bg: 'gray.50',
              }}
              _placeholder={{
                color: 'muted',
              }}
              onChange={e => setCode(e.target.value)}
            />
          </Stack>
        </FormControl>
        <PrimaryButton
          isLoading={mining}
          loadingText={t('Mining...')}
          type="submit"
          ml="auto"
        >
          {t('Activate invite')}
        </PrimaryButton>
      </Stack>
    </Box>
  )
}

export function ValidationResultToast({epoch}) {
  const timerMachine = React.useMemo(
    () =>
      createTimerMachine(
        dayjs(loadPersistentStateValue('validationResults', epoch).epochStart)
          .add(1, 'minute')
          .diff(dayjs(), 'second')
      ),
    [epoch]
  )
  const [current] = useMachine(timerMachine)

  const [state, dispatch] = usePersistence(
    React.useReducer(
      (prevState, seen) => ({
        ...prevState,
        [epoch]: {
          ...prevState[epoch],
          seen,
        },
      }),
      loadPersistentState('validationResults') || {}
    ),
    'validationResults'
  )

  const {address, state: identityStatus} = useIdentityState()

  const isValidationSucceeded = [
    IdentityStatus.Newbie,
    IdentityStatus.Verified,
    IdentityStatus.Human,
  ].includes(identityStatus)

  const {t} = useTranslation()

  const {colors} = useTheme()

  const url = `https://scan.idena.io/${
    isValidationSucceeded ? 'reward' : 'answers'
  }?epoch=${epoch}&identity=${address}`

  const notSeen =
    typeof state[epoch] === 'boolean'
      ? !state[epoch]
      : state[epoch] && !state[epoch].seen

  return notSeen ? (
    <Snackbar>
      {current.matches('running') && (
        <Notification
          pinned
          type={NotificationType.Info}
          icon={
            <Flex
              align="center"
              justify="center"
              css={{
                height: rem(20),
                width: rem(20),
                marginRight: rem(12),
              }}
            >
              <Box style={{transform: 'scale(0.35) translateY(-10px)'}}>
                <Spinner color={colors.brandBlue[500]} />
              </Box>
            </Flex>
          }
          title={t('Please wait for the validation report')}
        />
      )}
      {current.matches('stopped') && (
        <Notification
          pinned
          type={NotificationType.Info}
          title={
            isValidationSucceeded
              ? t('See your validation rewards in the blockchain explorer')
              : t('See your validation results in the blockchain explorer')
          }
          action={() => {
            dispatch(true)
            const win = window.open(url, '_blank')
            win.focus()
          }}
          actionName={t('Open')}
        />
      )}
    </Snackbar>
  ) : null
}
