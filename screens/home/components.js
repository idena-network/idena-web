/* eslint-disable react/destructuring-assignment */
/* eslint-disable react/prop-types */
import React, {forwardRef, useEffect, useState} from 'react'
import {
  Stack,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  useTheme,
  FormControl,
  Box,
  Flex,
  Button,
  Text,
  Switch,
  Radio,
  Alert,
  AlertIcon,
  AlertDescription,
  useToast,
  Link,
  RadioGroup,
  Divider,
  useBreakpointValue,
  useClipboard,
  Checkbox,
  UnorderedList,
  ListItem,
  useDisclosure,
  Tab,
  TabPanel,
  InputGroup,
  InputLeftElement,
  useTab,
} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import dayjs from 'dayjs'
import {useMachine} from '@xstate/react'
import {useQuery} from 'react-query'
import {useRouter} from 'next/router'
import {
  Avatar,
  Tooltip,
  FormLabel,
  Drawer,
  DrawerHeader,
  DrawerBody,
  Input,
  DrawerFooter,
  Toast,
  FormControlWithLabel,
  DialogFooter,
  DialogBody,
  Dialog,
  TextLink,
} from '../../shared/components/components'
import {rem} from '../../shared/theme'
import {
  FlatButton,
  PrimaryButton,
  SecondaryButton,
} from '../../shared/components/button'
import {IdentityStatus, NodeType} from '../../shared/types'
import {NotificationType} from '../../shared/providers/notification-context'
import {Notification, Snackbar} from '../../shared/components/notifications'
import {Spinner} from '../../shared/components/spinner'
import {
  loadPersistentState,
  loadPersistentStateValue,
} from '../../shared/utils/persist'
import {createTimerMachine} from '../../shared/machines'
import {usePersistence} from '../../shared/hooks/use-persistent-state'
import {useAuthState} from '../../shared/providers/auth-context'
import {
  eitherState,
  mapIdentityToFriendlyStatus,
  openExternalUrl,
} from '../../shared/utils/utils'
import {useIdentity} from '../../shared/providers/identity-context'
import {useEpoch} from '../../shared/providers/epoch-context'
import {activateMiningMachine} from './machines'
import {fetchBalance} from '../../shared/api/wallet'
import {
  LaptopIcon,
  TelegramIcon,
  TestValidationIcon,
  UserIcon,
} from '../../shared/components/icons'
import {sendSuccessValidation} from '../../shared/utils/analytics'
import {
  OnboardingPopoverContent,
  OnboardingPopoverContentIconRow,
} from '../../shared/components/onboarding'
import {useInviteActivation} from './hooks'

export function UserInlineCard({address, state, ...props}) {
  return (
    <Stack
      direction={['column', 'row']}
      spacing={6}
      align="center"
      width={['200px', '480px']}
      wordBreak={['break-all', 'normal']}
      {...props}
    >
      <Avatar
        size={[
          ['160px', '160px'],
          ['88px', '80px'],
        ]}
        borderRadius={['48px', 'lg']}
        address={address}
      />
      <Stack spacing={1} align={['center', 'initial']}>
        <Heading as="h2" fontSize="lg" fontWeight={500} lineHeight="short">
          {mapIdentityToFriendlyStatus(state)}
        </Heading>
        <Heading
          as="h3"
          fontSize="mdx"
          fontWeight="normal"
          textAlign={['center', 'initial']}
          color="muted"
          lineHeight="shorter"
        >
          {address}
        </Heading>
      </Stack>
    </Stack>
  )
}

export function WideLink({
  label,
  href,
  onClick,
  isDisabled,
  isNewTab,
  children,
  ...props
}) {
  return (
    <Link
      w={['100%', 'auto']}
      px={[0, '12px']}
      borderRadius={[0, '6px']}
      href={href}
      target={isNewTab ? '_blank' : ''}
      opacity={isDisabled ? '0.5' : 1}
      cursor={isDisabled ? 'not-allowed' : 'pointer'}
      onClick={isDisabled ? () => {} : onClick}
      _hover={{
        bg: 'blue.50',
      }}
      {...props}
    >
      <Flex h={[12, 8]} align="center" justify="flex-start">
        {children}
        <Box
          ml={[4, 2]}
          color="brandBlue.100"
          fontWeight={['400', '500']}
          fontSize={['base', 'md']}
        >
          {label}
        </Box>
      </Flex>
      <Flex w="100%" pl={12} display={['block', 'none']}>
        <Divider color="brandGray.800" />
      </Flex>
    </Link>
  )
}

export function UserStatList({title, children, ...props}) {
  return (
    <Stack spacing={[0, 4]} {...props} w="100%">
      <Heading
        display={['none', 'block']}
        as="h4"
        fontSize="lg"
        fontWeight={500}
      >
        {title}
      </Heading>
      <Stack spacing={4} bg="gray.50" px={[7, 10]} py={[4, 8]} rounded="lg">
        <Heading
          display={['block', 'none']}
          as="h4"
          mt={['10px', 0]}
          fontSize="lg"
          fontWeight={500}
        >
          {title}
        </Heading>
        {children}
      </Stack>
    </Stack>
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

export function AnnotatedUserStatistics({
  annotation,
  label,
  value,
  children,
  ...props
}) {
  const {colors} = useTheme()
  return (
    <Flex
      fontSize={['mdx', 'md']}
      direction={['row', 'column']}
      justify={['space-between', 'flex-start']}
      {...props}
    >
      <Box
        w="fit-content"
        borderBottom={['none', `dotted 1px ${colors.muted}`]}
        cursor="help"
        fontWeight={['400', '500']}
        color={['auto', colors.muted]}
      >
        <UserStatLabelTooltip label={[annotation]}>
          {label}
        </UserStatLabelTooltip>
      </Box>
      {value && <Box fontWeight="500">{value}</Box>}
      {children}
    </Flex>
  )
}

export function UserStat(props) {
  return <Stat as={Stack} spacing="2px" {...props} />
}

export function UserStatistics({label, value, children, ...props}) {
  const {colors} = useTheme()
  return (
    <Flex
      fontSize={['mdx', 'md']}
      direction={['row', 'column']}
      justify={['space-between', 'flex-start']}
      {...props}
    >
      <Box fontWeight={['400', '500']} color={['auto', colors.muted]}>
        {label}
      </Box>
      <Flex direction={['row', 'column']}>
        <Box fontWeight="500">{value}</Box>
        {children}
      </Flex>
    </Flex>
  )
}

export function UserStatLabel(props) {
  return (
    <StatLabel
      style={{display: 'inline-block'}}
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

function PasteButton(props) {
  const {t} = useTranslation()
  return (
    <Button
      variant="ghost"
      bg="unset"
      color="muted"
      fontWeight={500}
      h="unset"
      p={0}
      _hover={{bg: 'unset'}}
      _active={{bg: 'unset'}}
      _focus={{boxShadow: 'none'}}
      {...props}
    >
      {t('Paste')}
    </Button>
  )
}

const InvitationPanel = React.forwardRef(function InvitationPanel(props, ref) {
  return (
    <Stack
      bg="white"
      spacing={6}
      borderRadius="lg"
      boxShadow="0 3px 12px 0 rgba(83, 86, 92, 0.1), 0 2px 3px 0 rgba(83, 86, 92, 0.2)"
      px={[7, 10]}
      py={[7, 8]}
      pos="relative"
      zIndex={5}
      ref={ref}
      {...props}
    />
  )
})

export const ActivateInvitationPanel = React.forwardRef(
  function ActivateInvitationPanel(props, ref) {
    const {t} = useTranslation()

    const size = useBreakpointValue(['lg', 'md'])

    const [code, setCode] = useState('')

    const [{isMining}, {activateInvite}] = useInviteActivation()

    return (
      <InvitationPanel {...props} ref={ref}>
        <Stack>
          <Heading as="h3" fontWeight={500} fontSize="lg">
            {t('Join the upcoming validation')}
          </Heading>
          <Text color="muted">
            {t(
              'To take part in the validation, you need an invitation code. Invitations can be provided by validated identities.'
            )}
          </Text>
        </Stack>
        <Box
          as="form"
          onSubmit={async e => {
            e.preventDefault()
            await activateInvite(code)
          }}
        >
          <FormControl>
            <Stack spacing={[2, 3]}>
              <Flex justify="space-between" align="center">
                <FormLabel htmlFor="code" p={0} m={0} fontSize={['base', 'md']}>
                  {t('Enter invitation code')}
                </FormLabel>
                <PasteButton
                  isDisabled={isMining}
                  onClick={() =>
                    navigator.clipboard.readText().then(text => setCode(text))
                  }
                />
              </Flex>
              <Input
                size={size}
                value={code}
                isDisabled={isMining}
                onChange={e => setCode(e.target.value)}
              />
            </Stack>
          </FormControl>
          <Stack
            mt={4}
            align="center"
            justify="flex-end"
            direction={['column-reverse', 'row']}
            spacing={[0, 4]}
          >
            <TextLink
              href="/home/get-invitation"
              mt={[5, 0]}
              fontSize={['mobile', 'md']}
              fontWeight={500}
            >
              {t('How to get an invitation?')}
            </TextLink>
            <Divider
              display={['none', 'block']}
              borderColor="gray.100"
              orientation="vertical"
              h={6}
            />
            <PrimaryButton
              size={size}
              w={['100%', 'auto']}
              type="submit"
              isLoading={isMining}
              loadingText={t('Mining...')}
            >
              {t('Activate invitation')}
            </PrimaryButton>
          </Stack>
        </Box>
      </InvitationPanel>
    )
  }
)

export const AcceptInvitationPanel = React.forwardRef(
  function AcceptInvitationPanel(props, ref) {
    const {t} = useTranslation()
    const size = useBreakpointValue(['lg', 'md'])

    const [{isMining}, {activateInvite}] = useInviteActivation()

    return (
      <InvitationPanel {...props} ref={ref}>
        <Stack>
          <Heading as="h3" fontWeight={500} fontSize="lg">
            {t('Congratulations!')}
          </Heading>
          <Text color="muted">
            {t(
              'You have been invited to join the upcoming validation ceremony. Click the button below to accept the invitation.'
            )}
          </Text>
        </Stack>
        <Box
          as="form"
          onSubmit={async e => {
            e.preventDefault()
            await activateInvite()
          }}
        >
          <Flex justify="flex-end">
            <PrimaryButton
              size={size}
              w={['100%', 'auto']}
              isLoading={isMining}
              loadingText={t('Mining...')}
              type="submit"
            >
              {t('Accept invitation')}
            </PrimaryButton>
          </Flex>
        </Box>
      </InvitationPanel>
    )
  }
)

export const StartIdenaJourneyPanel = React.forwardRef(
  function StartIdenaJourneyPanel({onHasActivationCode, ...props}, ref) {
    const {t} = useTranslation()

    const router = useRouter()

    const size = useBreakpointValue(['lg', 'md'])
    const isInine = useBreakpointValue([false, true])

    return (
      <InvitationPanel {...props} ref={ref}>
        <Stack>
          <Heading as="h3" fontWeight={500} fontSize="lg">
            {t('Start your Idena journey')}
          </Heading>
          <Text color="muted">
            {t(
              'Prepare yourself for the validation ceremony. Pass the training validation and get your training validation certificate. It will help you to get an invitation code.'
            )}
          </Text>
        </Stack>
        <Box>
          <Stack
            spacing={[6, 4]}
            isInline={isInine}
            align="center"
            justify="flex-end"
            direction={['column-reverse', 'row']}
          >
            <Button
              display={['flex', 'inline-flex']}
              variant="link"
              onClick={onHasActivationCode}
              colorScheme="blue"
              _active={{}}
              fontWeight={500}
              size={size}
            >
              {t('I have an invitation code')}
            </Button>
            <Divider
              display={['none', 'block']}
              borderColor="gray.100"
              orientation="vertical"
              h={6}
            />
            <PrimaryButton
              onClick={() => router.push('/try')}
              size={size}
              w={['100%', 'auto']}
            >
              {t('Start now')}
            </PrimaryButton>
          </Stack>
        </Box>
      </InvitationPanel>
    )
  }
)

export const AcceptInviteOnboardingContent = ({onDismiss}) => {
  const {t} = useTranslation()
  const router = useRouter()

  return (
    <OnboardingPopoverContent
      gutter={10}
      title={t('Accept invitation')}
      zIndex={2}
      onDismiss={onDismiss}
    >
      <Stack>
        <Text fontSize="sm">
          {t(
            'You are invited to join the upcoming validation. Please accept the invitation.'
          )}
        </Text>
        <Text fontSize="sm">
          {t('Prepare yourself with training validation')}
        </Text>
        <OnboardingPopoverContentIconRow
          icon={<TestValidationIcon boxSize={5} color="white" />}
          _hover={{
            bg: '#689aff',
          }}
          px={4}
          py={2}
          cursor="pointer"
          onClick={() => router.push('/try')}
          borderRadius="lg"
        >
          <Box>
            <Text p={0} py={0} h={18} fontSize="md">
              {t('Test yourself')}
            </Text>
            <Text fontSize="sm" color="rgba(255, 255, 255, 0.56)">
              {t('Training validation')}
            </Text>
          </Box>
        </OnboardingPopoverContentIconRow>
      </Stack>
    </OnboardingPopoverContent>
  )
}

export const ActivateInviteOnboardingContent = ({onDismiss}) => {
  const {t} = useTranslation()

  return (
    <OnboardingPopoverContent
      gutter={10}
      title={t('Activate invitation')}
      zIndex={2}
      onDismiss={onDismiss}
    >
      <Stack>
        <Text fontSize="sm">
          {t(
            'Find an invitation code and activate it as soon as possible. Invitation code expires in 5 minutes before validation.'
          )}
        </Text>
      </Stack>
    </OnboardingPopoverContent>
  )
}

export const StartIdenaJourneyOnboardingContent = ({onDismiss}) => {
  const {t} = useTranslation()

  return (
    <OnboardingPopoverContent
      gutter={10}
      title={t('Why do I need the training?')}
      zIndex={2}
      onDismiss={onDismiss}
    >
      <Stack>
        <Text fontSize="sm">
          {t(
            'Idena validation is by invitation only. Invitations are distributed by validated people.'
          )}
        </Text>
        <Text fontSize="sm">
          {t(
            'Start with the training validation and get a certificate which proves that you are prepared for the real validation. Then you can use your certificate to apply for an invitation.'
          )}
        </Text>
      </Stack>
    </OnboardingPopoverContent>
  )
}

export function ValidationResultToast({epoch}) {
  const timerMachine = React.useMemo(
    () =>
      createTimerMachine(
        dayjs(loadPersistentStateValue('validationResults', epoch)?.epochStart)
          .add(1, 'minute')
          .diff(dayjs(), 'second')
      ),
    [epoch]
  )
  const [current] = useMachine(timerMachine)

  const [state, dispatch] = usePersistence(
    React.useReducer((prevState, action) => {
      switch (action.type) {
        case 'seen':
          return {
            ...prevState,
            [epoch]: {
              ...prevState[epoch],
              seen: action.value,
            },
          }
        case 'analytics':
          return {
            ...prevState,
            [epoch]: {
              ...prevState[epoch],
              analyticsSent: action.value,
            },
          }
        default:
          return prevState
      }
    }, loadPersistentState('validationResults') || {}),
    'validationResults'
  )

  const [{address, state: identityStatus}] = useIdentity()

  const isValidationSucceeded = [
    IdentityStatus.Newbie,
    IdentityStatus.Verified,
    IdentityStatus.Human,
  ].includes(identityStatus)

  const {t} = useTranslation()

  const {colors} = useTheme()

  const url = `https://scan.idena.io/identity/${address}/epoch/${epoch}/${
    isValidationSucceeded ? 'rewards' : 'validation'
  }`

  const notSeen = state[epoch] && !state[epoch].seen

  const analyticsNotSent = state[epoch] && !state[epoch].analyticsSent

  useEffect(() => {
    if (isValidationSucceeded && analyticsNotSent) {
      sendSuccessValidation(address)
      dispatch({type: 'analytics', value: true})
    }
  }, [isValidationSucceeded, address, dispatch, analyticsNotSent])

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
            dispatch({type: 'seen', value: true})
            const win = openExternalUrl(url)
            win.focus()
          }}
          actionName={t('Open')}
        />
      )}
    </Snackbar>
  ) : null
}

export function ActivateMiningForm({
  privateKey,
  isOnline,
  delegatee,
  delegationEpoch,
  onShow,
}) {
  const toast = useToast()

  const epoch = useEpoch()
  const [, {waitOnlineUpdate, forceUpdate}] = useIdentity()

  const [current, send] = useMachine(activateMiningMachine, {
    context: {
      isOnline,
      delegatee,
      delegationEpoch,
      privateKey,
    },
    actions: {
      onError: (_, {data: {message}}) => {
        toast({
          status: 'error',
          // eslint-disable-next-line react/display-name
          render: () => <Toast title={message} status="error" />,
        })
      },
      waitIdentityUpdate: () => waitOnlineUpdate(),
      forceIdentityUpdate: () => forceUpdate(),
    },
  })
  const {mode} = current.context

  useEffect(() => {
    send('CANCEL')
  }, [isOnline, delegatee, send])

  const isDelegator = typeof delegatee === 'string'

  return (
    <>
      <ActivateMiningSwitch
        isOnline={isOnline || isDelegator}
        isDelegator={isDelegator}
        onShow={() => {
          send('SHOW')
          if (onShow) onShow()
        }}
      />
      {isOnline || isDelegator ? (
        <DeactivateMiningDrawer
          delegatee={delegatee}
          canUndelegate={epoch?.epoch > delegationEpoch}
          isOpen={eitherState(current, 'showing')}
          isCloseable={false}
          isLoading={eitherState(current, 'showing.mining')}
          onDeactivate={() => {
            send('DEACTIVATE', {
              mode: isDelegator ? NodeType.Delegator : NodeType.Miner,
            })
          }}
          onClose={() => {
            send('CANCEL')
          }}
        />
      ) : (
        <ActivateMiningDrawer
          mode={mode}
          isOpen={eitherState(current, 'showing')}
          isCloseable={false}
          isLoading={eitherState(current, 'showing.mining')}
          onChangeMode={value => {
            send({type: 'CHANGE_MODE', mode: value})
          }}
          // eslint-disable-next-line no-shadow
          onActivate={({delegatee}) => {
            send('ACTIVATE', {delegatee})
          }}
          onClose={() => {
            send('CANCEL')
          }}
        />
      )}
    </>
  )
}

export function ActivateMiningSwitch({isOnline, isDelegator, onShow}) {
  const {t} = useTranslation()

  const {colors} = useTheme()

  const accentColor = isOnline ? 'blue' : 'red'

  return (
    <Stack spacing={[0, 3]}>
      <Text display={['none', 'initial']} fontWeight={500} h={18}>
        {t('Status')}
      </Text>
      <Flex
        align="center"
        justify="space-between"
        borderColor="gray.100"
        borderWidth={[0, 1]}
        background={[
          isOnline ? 'rgba(87, 143, 255, 0.1)' : 'rgba(255, 102, 102, 0.1)',
          'initial',
        ]}
        rounded={['8px', 'md']}
        h={[12, 8]}
        px={[5, 3]}
      >
        <FormLabel
          htmlFor="mining"
          fontWeight="normal"
          fontSize={['mdx', 'md']}
          m={0}
        >
          {isDelegator ? t('Delegation') : t('Mining')}
        </FormLabel>
        <Stack isInline align="center">
          <Text color={`${accentColor}.500`} fontWeight={500}>
            {isOnline ? t('On') : t('Off')}
          </Text>
          <Switch
            id="mining"
            size="sm"
            isChecked={isOnline}
            colorScheme={accentColor}
            h={4}
            className="toggle"
            onChange={onShow}
          />
          <style jsx global>{`
            .toggle > input[type='checkbox']:not(:checked) + span {
              background: ${colors.red[500]};
            }
          `}</style>
        </Stack>
      </Flex>
    </Stack>
  )
}

export function ActivateMiningDrawer({
  isLoading,
  mode,
  onChangeMode,
  onActivate,
  onClose,
  ...props
}) {
  const {t} = useTranslation()

  const [delegatee, setDelegatee] = useState()
  const {onCopy, hasCopied} = useClipboard('https://www.idena.io/download')

  const sizeInput = useBreakpointValue(['lg', 'md'])
  const sizeButton = useBreakpointValue(['mdx', 'md'])
  const variantRadio = useBreakpointValue(['mobile', 'bordered'])
  const variantPrimary = useBreakpointValue(['primaryFlat', 'primary'])
  const variantSecondary = useBreakpointValue(['secondaryFlat', 'secondary'])

  return (
    <Drawer onClose={onClose} {...props}>
      <DrawerHeader>
        <Flex
          direction={['row', 'column']}
          justify={['space-between', 'flex-start']}
        >
          <Flex
            order={[2, 1]}
            align="center"
            justify="center"
            bg="blue.012"
            h={12}
            w={12}
            rounded="xl"
          >
            <UserIcon boxSize={6} color="blue.500" />
          </Flex>
          <Heading
            order={[1, 2]}
            color="brandGray.500"
            fontSize="lg"
            fontWeight={500}
            lineHeight="base"
            mt={['11px', 4]}
          >
            {t('Miner status')}
          </Heading>
        </Flex>
      </DrawerHeader>
      <DrawerBody>
        <Stack spacing={[6]} mt={[0, 30]}>
          <FormControl as={Stack} spacing={[1, 3]}>
            <FormLabel
              fontSize={['11px', '13px']}
              fontWieght={['400!important', '500']}
              color={['muted', 'initial']}
              mb={[0, 2]}
              p={0}
            >
              {t('Type')}
            </FormLabel>
            <RadioGroup
              isInline
              d="flex"
              flexDirection={['column', 'row']}
              value={mode}
              onChange={onChangeMode}
            >
              <Radio
                variant={variantRadio}
                value={NodeType.Miner}
                flex={['0 0 56px', 1]}
                fontSize={['base', 'md']}
                fontWeight={['500', '400']}
                px={[4, 2]}
                py={['18px', 2]}
                mr={2}
              >
                {t('Mining')}
              </Radio>
              <Radio
                variant={variantRadio}
                value={NodeType.Delegator}
                flex={['0 0 56px', 1]}
                fontSize={['base', 'md']}
                fontWeight={['500', '400']}
                px={[4, 2]}
                py={['18px', 2]}
              >
                {t('Delegation')}
              </Radio>
            </RadioGroup>
          </FormControl>
          {mode === NodeType.Delegator ? (
            <Stack spacing={5}>
              <FormControl as={Stack} spacing={[0, 3]}>
                <FormLabel fontSize={['base', 'md']}>
                  {t('Delegation address')}
                </FormLabel>
                <Input
                  size={sizeInput}
                  value={delegatee}
                  onChange={e => setDelegatee(e.target.value)}
                />
              </FormControl>
              <Alert
                status="error"
                rounded="md"
                bg="red.010"
                borderColor="red.050"
                borderWidth={1}
              >
                <AlertIcon name="info" alignSelf="flex-start" color="red.500" />
                <AlertDescription
                  as={Stack}
                  spacing={3}
                  color="brandGray.500"
                  fontSize="md"
                  fontWeight={500}
                >
                  <Text>
                    {t(
                      'You can lose your stake, all your mining and validation rewards if you delegate your mining status.'
                    )}
                  </Text>
                  <Text>
                    {t('You can disable delegation at the next epoch only.')}
                  </Text>
                </AlertDescription>
              </Alert>
            </Stack>
          ) : (
            <Stack spacing={[4, 5]}>
              <Text fontSize={['mdx', 'md']} mb={[0, 3]}>
                {t(
                  'To activate mining status please download the desktop version of Idena app'
                )}
              </Text>
              <Flex
                borderY={[0, '1px']}
                h={16}
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  '&': {
                    borderColor: 'gray.100',
                  },
                }}
              >
                <Flex w={['100%', 'auto']}>
                  <Stack
                    w={['100%', 'auto']}
                    spacing={[4, 2]}
                    isInline
                    align="center"
                    color="brand.gray"
                  >
                    <Flex
                      shrink={0}
                      boxSize={[8, 5]}
                      align="center"
                      justify="center"
                      backgroundColor={['brandGray.012', 'initial']}
                      borderRadius="10px"
                    >
                      <LaptopIcon boxSize={5} />
                    </Flex>
                    <Flex
                      direction="row"
                      w={['100%', 'auto']}
                      justify={['space-between', 'flex-start']}
                      borderBottom={['1px', 0]}
                      borderColor="gray.100"
                      lineHeight={['48px', 'auto']}
                    >
                      <Text as="span" fontSize={['base', 14]} fontWeight={500}>
                        {t('Desktop App')}
                      </Text>
                      {hasCopied ? (
                        <Text
                          display={['block', 'none']}
                          as="span"
                          color="green.500"
                          fontSize="base"
                          fontWeight={500}
                        >
                          Copied
                        </Text>
                      ) : (
                        <FlatButton
                          display={['block', 'none']}
                          onClick={onCopy}
                          fontWeight="500"
                        >
                          Copy link
                        </FlatButton>
                      )}
                    </Flex>
                  </Stack>
                </Flex>
                <Flex display={['none', 'flex']}>
                  <Link
                    href="https://www.idena.io/download"
                    target="_blank"
                    color="brandBlue.500"
                    rounded="md"
                    fontWeight={500}
                    fontSize={13}
                  >
                    {t('Download')}
                  </Link>
                </Flex>
              </Flex>
              <Flex
                rounded="md"
                bg="gray.50"
                borderColor="gray.50"
                borderWidth={1}
                px={6}
                py={4}
              >
                <Text color="muted" fontSize={['mdx', 'md']} lineHeight="20px">
                  {t(
                    'Use your private key backup to migrate your account. You can import your private key backup at the Settings page in Idena Desktop app.'
                  )}
                </Text>
              </Flex>
            </Stack>
          )}
        </Stack>
      </DrawerBody>
      <DrawerFooter mt={[6, 0]} px={0}>
        <Flex width="100%" justify={['space-evenly', 'flex-end']}>
          <Button
            variant={variantSecondary}
            order={[3, 1]}
            size={sizeButton}
            type="button"
            onClick={onClose}
          >
            {t('Cancel')}
          </Button>
          <Divider
            order="2"
            display={['block', 'none']}
            h={10}
            orientation="vertical"
            color="gray.100"
          />
          <Button
            variant={variantPrimary}
            order={[1, 3]}
            size={sizeButton}
            ml={[0, 2]}
            isDisabled={mode === NodeType.Miner}
            isLoading={isLoading}
            onClick={() => {
              onActivate({delegatee})
            }}
            loadingText={t('Waiting...')}
          >
            {t('Submit')}
          </Button>
        </Flex>
      </DrawerFooter>
    </Drawer>
  )
}

export function DeactivateMiningDrawer({
  isLoading,
  delegatee,
  canUndelegate,
  onDeactivate,
  onClose,
  ...props
}) {
  const {t} = useTranslation()

  const sizeInput = useBreakpointValue(['lg', 'md'])
  const sizeButton = useBreakpointValue(['mdx', 'md'])
  const variantPrimary = useBreakpointValue(['primaryFlat', 'primary'])
  const variantSecondary = useBreakpointValue(['secondaryFlat', 'secondary'])

  const isDelegator = typeof delegatee === 'string'

  return (
    <Drawer onClose={onClose} {...props}>
      <DrawerHeader>
        <Flex
          direction={['row', 'column']}
          justify={['space-between', 'flex-start']}
        >
          <Flex
            order={[2, 1]}
            align="center"
            justify="center"
            bg="blue.012"
            h={12}
            w={12}
            rounded="xl"
          >
            <UserIcon boxSize={6} color="blue.500" />
          </Flex>
          <Heading
            order={[1, 2]}
            color="brandGray.500"
            fontSize="lg"
            fontWeight={500}
            lineHeight="base"
            mt={['11px', 4]}
          >
            {isDelegator
              ? t('Deactivate delegation status')
              : t('Deactivate mining status')}
          </Heading>
        </Flex>
      </DrawerHeader>
      <DrawerBody>
        <Stack spacing={6} mt={[2, 30]}>
          <Text fontSize={['mdx', 'md']} mb={[0, 3]}>
            {isDelegator
              ? t(`Submit the form to deactivate your delegation status.`)
              : t(
                  `Submit the form to deactivate your mining status. You can activate it again afterwards.`
                )}
          </Text>
          {isDelegator && (
            <FormControl as={Stack} spacing={[0, 3]}>
              <FormLabel fontSize={['base', 'md']}>
                {t('Delegation address')}
              </FormLabel>
              <Input size={sizeInput} defaultValue={delegatee} isDisabled />
            </FormControl>
          )}
          {isDelegator && !canUndelegate && (
            <Alert
              status="error"
              rounded="md"
              bg="red.010"
              borderColor="red.050"
              borderWidth={1}
            >
              <AlertIcon name="info" alignSelf="flex-start" color="red.500" />
              <AlertDescription
                color="brandGray.500"
                fontSize="md"
                fontWeight={500}
              >
                {t('You can disable delegation at the next epoch only')}
              </AlertDescription>
            </Alert>
          )}
        </Stack>
      </DrawerBody>
      <DrawerFooter mt={[6, 0]} px={0}>
        <Flex width="100%" justify={['space-evenly', 'flex-end']}>
          <Button
            variant={variantSecondary}
            order={[3, 1]}
            size={sizeButton}
            type="button"
            onClick={onClose}
          >
            {t('Cancel')}
          </Button>
          <Divider
            order="2"
            display={['block', 'none']}
            h={10}
            orientation="vertical"
            color="gray.100"
          />
          <Button
            variant={variantPrimary}
            order={[1, 3]}
            size={sizeButton}
            ml={[0, 2]}
            isDisabled={isDelegator && !canUndelegate}
            isLoading={isLoading}
            onClick={onDeactivate}
            loadingText={t('Waiting...')}
          >
            {t('Submit')}
          </Button>
        </Flex>
      </DrawerFooter>
    </Drawer>
  )
}

// eslint-disable-next-line react/prop-types
export function KillForm({isOpen, onClose}) {
  const {t} = useTranslation()
  const {privateKey, coinbase} = useAuthState()
  const [, {killMe}] = useIdentity()
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  const [to, setTo] = useState()

  const {
    data: {stake},
  } = useQuery(['get-balance', coinbase], () => fetchBalance(coinbase), {
    initialData: {balance: 0, stake: 0},
    enabled: !!coinbase,
  })

  const terminate = async () => {
    try {
      if (to !== coinbase)
        throw new Error(t('You must specify your own identity address'))

      setSubmitting(true)

      await killMe(privateKey)

      toast({
        status: 'success',
        // eslint-disable-next-line react/display-name
        render: () => <Toast title={t('Transaction sent')} />,
      })
      if (onClose) onClose()
    } catch (error) {
      toast({
        // eslint-disable-next-line react/display-name
        render: () => (
          <Toast
            title={error?.message ?? t('error:Error while sending transaction')}
            status="error"
          />
        ),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <DrawerHeader mb={6}>
        <Avatar address={coinbase} mx="auto" />
        <Heading
          fontSize="lg"
          fontWeight={500}
          color="brandGray.500"
          mt={4}
          mb={0}
          textAlign="center"
        >
          {t('Terminate identity')}
        </Heading>
      </DrawerHeader>
      <DrawerBody>
        <Text fontSize="md" mb={6}>
          {t(`Terminate your identity and withdraw the stake. Your identity status
            will be reset to 'Not validated'.`)}
        </Text>
        <FormControlWithLabel label={t('Withraw stake, iDNA')}>
          <Input value={stake} isDisabled />
        </FormControlWithLabel>
        <Text fontSize="md" mb={6} mt={6}>
          {t(
            'Please enter your identity address to confirm termination. Stake will be transferred to the identity address.'
          )}
        </Text>
        <FormControlWithLabel label={t('Address')}>
          <Input value={to} onChange={e => setTo(e.target.value)} />
        </FormControlWithLabel>
      </DrawerBody>
      <DrawerFooter>
        <Box
          alignSelf="stretch"
          borderTop="1px"
          borderTopColor="gray.100"
          mt="auto"
          pt={5}
          width="100%"
        >
          <Stack isInline spacing={2} justify="flex-end">
            <PrimaryButton
              onClick={terminate}
              isLoading={submitting}
              colorScheme="red"
              _hover={{
                bg: 'rgb(227 60 60)',
              }}
              _active={{
                bg: 'rgb(227 60 60)',
              }}
              _focus={{
                boxShadow: '0 0 0 3px rgb(255 102 102 /0.50)',
              }}
            >
              {t('Terminate')}
            </PrimaryButton>
          </Stack>
        </Box>
      </DrawerFooter>
    </Drawer>
  )
}

export function MyIdenaBotAlert({onConnect}) {
  const {t} = useTranslation()

  const [{state}] = useIdentity()

  const myIdenaBotDisclosure = useDisclosure()

  const [doNotShowAgain, setDoNotShowAgain] = React.useState()

  const connectButtonRef = React.useRef()

  // eslint-disable-next-line no-shadow
  const eitherState = (...states) => states.some(s => s === state)

  const size = useBreakpointValue(['sm', 'md'])

  return (
    <>
      <Alert
        variant="solid"
        justifyContent="center"
        flexShrink={0}
        boxShadow="0 3px 12px 0 rgb(255 163 102 /0.1), 0 2px 3px 0 rgb(255 163 102 /0.2)"
        color="white"
        cursor="pointer"
        fontWeight={500}
        rounded="md"
        p={3}
        mt={2}
        mx={2}
        w="auto"
        onClick={myIdenaBotDisclosure.onOpen}
      >
        {t(`Subscribe to @MyIdenaBot to get personalized notifications based on
        your status`)}
      </Alert>

      <Dialog
        title="Subscribe to @MyIdenaBot"
        size={size}
        initialFocusRef={connectButtonRef}
        {...myIdenaBotDisclosure}
      >
        <DialogBody>
          <Stack>
            <Text>
              {t(
                `MyIdenaBot reminds you about important actions based on your
              identity status:`,
                {nsSeparator: '!!'}
              )}
            </Text>

            {eitherState(IdentityStatus.Undefined) && (
              <IdenaBotFeatureList
                features={[
                  'next validation reminder',
                  'notification when you get an invite',
                  'reminder to activate your invite',
                  'your validation results when validation consensus is reached',
                ]}
              />
            )}

            {eitherState(IdentityStatus.Invite, IdentityStatus.Candidate) && (
              <IdenaBotFeatureList
                features={[
                  'next validation reminder',
                  'your validation results when validation consensus is reached',
                ]}
              />
            )}

            {eitherState(IdentityStatus.Newbie) && (
              <IdenaBotFeatureList
                features={[
                  'next validation reminder',
                  'reminder to create flips if you haven’t done it yet and the validation is coming',
                  'your validation results when validation consensus is reached',
                ]}
              />
            )}

            {eitherState(IdentityStatus.Verified, IdentityStatus.Human) && (
              <IdenaBotFeatureList
                features={[
                  'next validation reminder',
                  'reminder to create flips',
                  'your validation results when validation consensus is reached',
                  'reminder to share your remaining invites',
                  'reminder to submit extra flips to get more rewards',
                  'status update of all your invitees to check if they are ready for the validation (activated invites, submitted flips)',
                ]}
              />
            )}

            {eitherState(IdentityStatus.Zombie, IdentityStatus.Suspended) && (
              <IdenaBotFeatureList
                features={[
                  'next validation reminder',
                  'your validation results when validation consensus is reached',
                  'reminder to share your remaining invites',
                  'reminder to submit extra flips to get more rewards',
                  'status update of all your invitees to check if they are ready for the validation (activated invites, submitted flips)',
                ]}
              />
            )}
          </Stack>
        </DialogBody>
        <DialogFooter align="center">
          <Checkbox
            borderColor="gray.100"
            isChecked={doNotShowAgain}
            onChange={e => {
              setDoNotShowAgain(e.target.checked)
            }}
          >
            {t('Do not show again')}
          </Checkbox>
          <SecondaryButton
            onClick={() => {
              myIdenaBotDisclosure.onClose()
              if (doNotShowAgain) onConnect()
            }}
          >
            {t('Not now')}
          </SecondaryButton>
          <PrimaryButton
            ref={connectButtonRef}
            onClick={() => {
              openExternalUrl('https://t.me/MyIdenaBot')
              onConnect()
            }}
          >
            {t('Connect')}
          </PrimaryButton>
        </DialogFooter>
      </Dialog>
    </>
  )
}

export function ActivateInvitationDialog({onClose, ...props}) {
  const {t} = useTranslation()

  const [code, setCode] = useState('')

  const [{isMining, isSuccess}, {activateInvite}] = useInviteActivation()

  const size = useBreakpointValue(['lg', 'md'])

  useEffect(() => {
    if (!isMining && isSuccess) onClose()
  }, [isMining, isSuccess, onClose])

  return (
    <Dialog title={t('Invite activation')} onClose={onClose} {...props}>
      <DialogBody mb={0}>
        <Box
          mt={4}
          as="form"
          onSubmit={async e => {
            e.preventDefault()
            await activateInvite(code)
          }}
        >
          <FormControl>
            <Stack spacing={[2, 3]}>
              <Flex justify="space-between" align="center">
                <FormLabel htmlFor="code" p={0} m={0} fontSize={['base', 'md']}>
                  {t('Enter invitation code')}
                </FormLabel>
                <PasteButton
                  isDisabled={isMining}
                  onClick={() =>
                    navigator.clipboard.readText().then(text => setCode(text))
                  }
                />
              </Flex>
              <Input
                size={size}
                value={code}
                isDisabled={isMining}
                onChange={e => setCode(e.target.value)}
              />
            </Stack>
          </FormControl>
          <Flex mt={4} align="center" justifyContent="flex-end">
            <SecondaryButton
              display={['none', 'initial']}
              onClick={onClose}
              mr={2}
            >
              {t('Cancel')}
            </SecondaryButton>
            <PrimaryButton
              size={size}
              w={['100%', 'auto']}
              type="submit"
              isLoading={isMining}
              loadingText={t('Mining...')}
            >
              {t('Activate invitation')}
            </PrimaryButton>
          </Flex>
        </Box>
      </DialogBody>
    </Dialog>
  )
}

function IdenaBotFeatureList({features, listSeparator = ';'}) {
  return (
    <UnorderedList spacing={1} styleType="'- '" pl="2.5">
      {features.map((feature, idx) => (
        <ListItem key={feature} textTransform="lowercase">
          {feature}
          {idx < features.length - 1 ? listSeparator : '.'}
        </ListItem>
      ))}
    </UnorderedList>
  )
}

export const GetInvitationTab = forwardRef(
  ({iconSelected, icon, title, ...props}, ref) => {
    const isMobile = useBreakpointValue([true, false])
    const tabProps = useTab({...props, ref})
    const isSelected = !!tabProps['aria-selected']
    return (
      <Tab
        color="gray.300"
        fontWeight="500"
        _selected={{
          color: 'blue.500',
          bg: ['gray.500', 'gray.50'],
          borderRadius: 'md',
        }}
        mr={[0, 2]}
        w={['25%', null]}
        {...tabProps}
        py={3 / 2}
      >
        {isMobile
          ? React.cloneElement(isSelected ? iconSelected : icon, {
              boxSize: 6,
              color: isSelected ? 'white' : 'gray.500',
            })
          : title}
      </Tab>
    )
  }
)

export function GetInvitationTabPanel(props) {
  return (
    <TabPanel p={0} pt={[6, 8]} color={['gray.300', 'initial']} {...props} />
  )
}

export function GetInvitationTabTitle(props) {
  return (
    <Text
      display={['block', 'none']}
      fontSize="lg"
      color="gray.500"
      fontWeight="500"
      mb={2}
      {...props}
    />
  )
}

export function GetInvitationTwitterInput({value, onChange}) {
  const [inputAddonVisible, setInputAddonVisible] = useState(false)
  const size = useBreakpointValue(['lg', 'md'])

  return (
    <InputGroup size={size}>
      <InputLeftElement
        pointerEvents="none"
        color="gray.300"
        fontSize="md"
        // eslint-disable-next-line react/no-children-prop
        children="@"
        display={inputAddonVisible ? 'flex' : 'none'}
      />
      <Input
        onFocus={() => setInputAddonVisible(true)}
        onBlur={() => !value && setInputAddonVisible(false)}
        onChange={e => onChange(e.target.value)}
        pl={[10, 6]}
      />
    </InputGroup>
  )
}

export function GetInvitationCopyButton({value, ...props}) {
  const {hasCopied, onCopy} = useClipboard(value)
  const {t} = useTranslation()

  return (
    <Flex alignSelf={['center', 'flex-start']} pt={[5, 0]} {...props}>
      {hasCopied ? (
        <Text
          fontSize={['mobile', 'md']}
          lineHeight={['18px', null]}
          color="green.500"
          fontWeight={500}
        >
          {t('Copied!')}
        </Text>
      ) : (
        <FlatButton fontWeight={500} onClick={onCopy}>
          {t('Copy')}
        </FlatButton>
      )}
    </Flex>
  )
}
