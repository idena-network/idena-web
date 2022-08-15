/* eslint-disable react/prop-types */
import React, {useState} from 'react'
import {
  Flex,
  Icon,
  Heading,
  Stack,
  FormControl,
  FormLabel,
  FormHelperText,
  Badge,
  Radio,
  Text,
  Box,
  Skeleton,
  useTheme,
  Divider,
  Button,
  IconButton,
  RadioGroup,
  useDisclosure,
  Td,
  useBreakpointValue,
} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useQuery} from 'react-query'
import {
  DrawerHeader,
  DrawerBody,
  Input,
  ChainedInputGroup,
  ChainedInputAddon,
  Tooltip,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  ErrorAlert,
  WarningAlert,
} from '../../shared/components/components'
import {
  clampValue,
  formatDateTimeShort,
  getDateFromBlocks,
  isVercelProduction,
  toLocaleDna,
} from '../../shared/utils/utils'
import {CrossSmallIcon, OracleIcon} from '../../shared/components/icons'
import {useDeferredVotes} from './hooks'
import {useFailToast} from '../../shared/hooks/use-toast'
import useSyncing from '../../shared/hooks/use-syncing'
import {getBlockAt} from '../../shared/api'
import {useInterval} from '../../shared/hooks/use-interval'
import {useAuthState} from '../../shared/providers/auth-context'
import {useEpoch} from '../../shared/providers/epoch-context'
import {EpochPeriod} from '../../shared/types'

export function OracleDrawerHeader({
  icon = <OracleIcon />,
  colorScheme = 'blue',
  children,
  ...props
}) {
  return (
    <DrawerHeader mb={8} {...props}>
      <Flex
        align="center"
        justify="center"
        bg={`${colorScheme}.012`}
        h={12}
        w={12}
        rounded="xl"
      >
        {React.cloneElement(icon, {
          boxSize: 6,
          color: `${colorScheme}.500`,
        })}
      </Flex>
      <Heading
        color="brandGray.500"
        fontSize="lg"
        fontWeight={500}
        lineHeight="base"
        mt={4}
      >
        {children}
      </Heading>
    </DrawerHeader>
  )
}

export function OracleDrawerBody(props) {
  return (
    <DrawerBody>
      <Stack spacing={5} {...props} />
    </DrawerBody>
  )
}

export function OracleFormControl({label, children, ...props}) {
  return (
    <FormControl {...props}>
      <FormLabel color="brandGray.500" mb={2}>
        {label}
      </FormLabel>
      {children}
    </FormControl>
  )
}
export function OracleFormHelper({label, value, ...props}) {
  return (
    <Flex justify="space-between" {...props}>
      <OracleFormHelperText>{label}</OracleFormHelperText>
      <OracleFormHelperValue>{value}</OracleFormHelperValue>
    </Flex>
  )
}

export function OracleFormHelperText(props) {
  return <FormHelperText color="muted" fontSize="md" {...props} />
}

export function OracleFormHelperValue(props) {
  return <FormHelperText color="gray.500" fontSize="md" {...props} />
}

export function OracleVoteInfoTextSmall({label, value, ...props}) {
  return (
    <Flex {...props}>
      <Text fontSize="sm" color="muted" mt={0} w={24}>
        {label}
      </Text>
      <Text fontSize="sm" color="gray.500" mt={0}>
        {value}
      </Text>
    </Flex>
  )
}

export function VotingBadge(props) {
  return (
    <Badge
      display="inline-flex"
      alignItems="center"
      borderRadius="xl"
      fontSize="sm"
      fontWeight={500}
      textTransform="capitalize"
      h={6}
      px={3}
      {...props}
    />
  )
}

export function VotingInlineFormControl({
  htmlFor,
  label,
  tooltip,
  children,
  ...props
}) {
  return (
    <FormControl display="inline-flex" {...props}>
      {tooltip ? (
        <FormLabel htmlFor={htmlFor} color="muted" py={2} minW={32} w={32}>
          <Tooltip label={tooltip} placement="top" zIndex="tooltip">
            <Text
              as="span"
              borderBottomStyle="dotted"
              borderBottomWidth="1px"
              borderBottomColor="muted"
              cursor="help"
            >
              {label}
            </Text>
          </Tooltip>
        </FormLabel>
      ) : (
        <FormLabel htmlFor={htmlFor} color="muted" py={2} minW={32} w={32}>
          {label}
        </FormLabel>
      )}
      <Box w="md">{children}</Box>
    </FormControl>
  )
}

export function DnaInput(props) {
  const {isDisabled} = props

  return (
    <ChainedInputGroup>
      <ChainedNumberInput min={0} step="any" {...props} />
      <ChainedInputAddon isDisabled={isDisabled}>iDNA</ChainedInputAddon>
    </ChainedInputGroup>
  )
}

export function PercentInput(props) {
  const {isDisabled} = props

  return (
    <ChainedInputGroup>
      <ChainedNumberInput
        min={0}
        max={100}
        step={1}
        preventInvalidInput
        {...props}
      />
      <ChainedInputAddon isDisabled={isDisabled}>%</ChainedInputAddon>
    </ChainedInputGroup>
  )
}

export function BlockInput(props) {
  const {t} = useTranslation()

  const {isDisabled} = props

  return (
    <ChainedInputGroup>
      <ChainedNumberInput
        min={0}
        max={157000000}
        step={1}
        preventInvalidInput
        {...props}
      />
      <ChainedInputAddon isDisabled={isDisabled}>
        {t('Blocks')}
      </ChainedInputAddon>
    </ChainedInputGroup>
  )
}

export function NumberInput({
  min,
  max = Number.MAX_VALUE,
  preventInvalidInput = false,
  onChange,
  onClamp,
  ...props
}) {
  return (
    <Input
      type="number"
      min={min}
      max={max}
      onBlur={({target}) => {
        const {id, value} = target
        if (!target.checkValidity()) {
          const clampedValue = clampValue(min, max, Number(value))
          // eslint-disable-next-line no-unused-expressions
          onChange?.({
            target: {
              id,
              value: clampedValue,
            },
          })
          if (onClamp) onClamp(clampedValue)
        }
      }}
      onChange={e => {
        if (preventInvalidInput) {
          if (e.target.checkValidity()) onChange(e)
          // eslint-disable-next-line no-unused-expressions
        } else onChange?.(e)
      }}
      {...props}
    />
  )
}

export function ChainedNumberInput(props) {
  const {isDisabled, bg, _hover} = props

  const borderRightColor = isDisabled ? 'gray.50' : bg

  return (
    <NumberInput
      borderRightColor={borderRightColor}
      borderTopRightRadius={0}
      borderBottomRightRadius={0}
      _hover={{
        borderRightColor,
        ..._hover,
      }}
      {...props}
    />
  )
}

export function VotingOptionInput({
  isLast,
  isDisabled,
  onAddOption,
  onRemoveOption,
  ...props
}) {
  return (
    <React.Fragment>
      <Flex align="center" justify="space-between">
        <Stack isInline spacing={1} flex={1} py={1}>
          <Flex h={6} w={6} align="center" justify="center">
            <Box bg="muted" borderRadius="full" h={1} w={1} />
          </Flex>
          <Input
            border="none"
            px={0}
            h="auto"
            _focus={{border: 'none', outline: 'none'}}
            _placeholder={{
              color: 'muted',
            }}
            onFocus={() => {
              if (isLast) onAddOption()
            }}
            {...props}
          />
        </Stack>
        <IconButton
          icon={<CrossSmallIcon boxSize={4} />}
          isDisabled={isDisabled}
          bg="unset"
          color="muted"
          fontSize={20}
          w={5}
          minW={5}
          h={5}
          p={0}
          _hover={{
            bg: 'gray.50',
          }}
          _focus={{
            bg: 'gray.50',
          }}
          onClick={onRemoveOption}
        />
      </Flex>
      {!isLast && <Divider borderBottomColor="gray.100" mx={-1} />}
    </React.Fragment>
  )
}

export function VotingCardSkeleton(props) {
  return (
    <Box {...props}>
      <Stack isInline spacing={2} align="center" mb={3}>
        <VotingSkeleton h={6} w={16} />
        <VotingSkeleton h={6} />
      </Stack>
      <Stack spacing={2} mb={4}>
        <VotingSkeleton h={6} />
        <VotingSkeleton h={16} />
      </Stack>
      <Stack isInline spacing={2} align="center" mb={6}>
        <VotingSkeleton borderRadius="full" h={5} w={5} />
        <VotingSkeleton h={5} />
      </Stack>
      <Flex justify="space-between" align="center">
        <VotingSkeleton h={8} w={20} />
        <VotingSkeleton h={8} w={64} />
      </Flex>
      <Divider orientation="horizontal" mt={6} mb={0} />
    </Box>
  )
}

export function VotingSkeleton(props) {
  const {colors} = useTheme()
  return (
    <FullSkeleton
      startColor={colors.gray[50]}
      endColor={colors.gray[100]}
      {...props}
    />
  )
}

function FullSkeleton(props) {
  return <Skeleton w="full" {...props} />
}

export const VotingOption = React.forwardRef(
  ({value, annotation, children = value, ...props}, ref) => (
    <Flex
      align="center"
      justify="space-between"
      border="1px"
      borderColor="gray.100"
      borderRadius="md"
      px={3}
      py={2}
    >
      <Radio
        ref={ref}
        borderColor="gray.100"
        value={value}
        title={children.length > 50 ? children : ''}
        {...props}
      >
        <Text maxW="xs" isTruncated>
          {children}
        </Text>
      </Radio>
      <Text color="muted" fontSize="sm">
        {annotation}
      </Text>
    </Flex>
  )
)
VotingOption.displayName = 'VotingOption'

export function FillCenter(props) {
  return (
    <Flex
      direction="column"
      flex={1}
      align="center"
      justify="center"
      {...props}
    />
  )
}

export function FillPlaceholder(props) {
  return (
    <Flex direction="column" flex={1} align="center" justify="center">
      <Text color="muted" {...props} />
    </Flex>
  )
}

export function NewVotingFormSkeleton() {
  return (
    <Stack spacing={3} my={8} w="xl">
      {Array.from({length: 6}).map((_, idx) => (
        <VotingSkeleton h={idx === 1 ? 32 : 8} key={idx} />
      ))}
    </Stack>
  )
}

export function NewOracleFormHelperText(props) {
  return <OracleFormHelperText fontSize="sm" {...props} />
}

export function NewVotingFormSubtitle(props) {
  return <Heading as="h2" fontSize="md" fontWeight="bold" mt={4} {...props} />
}

export function PresetFormControl({tooltip, children, ...props}) {
  return (
    <VotingInlineFormControl tooltip={tooltip} {...props}>
      <Stack flex={1}>{children}</Stack>
    </VotingInlineFormControl>
  )
}

// eslint-disable-next-line react/display-name
export const PresetFormControlOptionList = React.forwardRef((props, ref) => (
  <RadioGroup ref={ref} {...props} />
))

// eslint-disable-next-line react/display-name
export const PresetFormControlOption = React.forwardRef(
  ({isChecked, ...props}, ref) => (
    <Radio
      ref={ref}
      borderColor="gray.100"
      borderWidth={1}
      borderRadius="md"
      p={2}
      px={3}
      isChecked={isChecked}
      {...props}
    />
  )
)

export function PresetFormControlInputBox(props) {
  return <Box {...props} />
}

export function PresetFormControlHelperText(props) {
  return <NewOracleFormHelperText textAlign="right" {...props} />
}

export function ScrollToTop({scrollableRef, children, ...props}) {
  const [opacity, setOpacity] = React.useState(0)
  const lastOpacity = React.useRef(Number.EPSILON)

  const scrollableElement = scrollableRef.current

  React.useEffect(() => {
    const handleScroll = e => {
      const prevOpacity = lastOpacity.current
      const nextOpacity = Math.min(
        Math.round((e.target.scrollTop / 2000) * 100),
        100
      )

      if (Math.abs(nextOpacity - prevOpacity) > 10) {
        setOpacity(nextOpacity < 11 ? 0 : nextOpacity / 100)
        lastOpacity.current = nextOpacity
      }
    }

    if (scrollableElement) {
      scrollableElement.addEventListener('scroll', handleScroll)
      return () => {
        scrollableElement.removeEventListener('scroll', handleScroll)
      }
    }
  }, [scrollableElement])

  return (
    <Button
      variant="unstyled"
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      position="absolute"
      bottom={4}
      right={4}
      borderRadius="lg"
      boxShadow="md"
      h={8}
      minH={8}
      minW={8}
      p={4}
      py={0}
      opacity={opacity}
      _focus={{
        boxShadow: 'md',
      }}
      onClick={() => {
        scrollableElement.scrollTo({top: 0, left: 0, behavior: 'smooth'})
      }}
      {...props}
    >
      <Stack isInline spacing={1} align="center">
        <Icon name="arrow-up" size={5} />
        <Text as="span">{children}</Text>
      </Stack>
    </Button>
  )
}

export function TodoVotingCountBadge(props) {
  return (
    <Flex
      as={Badge}
      align="center"
      justify="center"
      bg="blue.500"
      color="white"
      fontSize={8}
      fontWeight={700}
      rounded={4}
      px={1}
      h={4}
      minW={4}
      {...props}
    />
  )
}

export function OraclesTxsValueTd(props) {
  return <Td color="gray.500" fontWeight="500" px={3} py={3 / 2} {...props} />
}

function DeferredVotesModalDesc({label, value, maxValueW, ...props}) {
  return (
    <Flex
      {...props}
      justifyContent="space-between"
      direction={['column-reverse', 'row']}
    >
      <Text fontSize={['base', 'md']} color="muted" mt={[1 / 2, 0]}>
        {label}
      </Text>
      <Text
        fontSize={['base', 'md']}
        color="gray.500"
        maxW={maxValueW}
        isTruncated
        fontWeight={[500, 'initial']}
      >
        {value}
      </Text>
    </Flex>
  )
}

export function ReviewNewPendingVoteDialog({
  vote,
  startCounting,
  finishCounting,
  onClose,
  ...props
}) {
  const {auth} = useAuthState()
  const {t} = useTranslation()
  const [, {estimateSendVote}] = useDeferredVotes()
  const dna = toLocaleDna(undefined, {maximumFractionDigits: 4})

  const {
    data: {currentBlock},
  } = useSyncing()

  const {data: txFeeData} = useQuery(
    ['bcn_estimateRawTx', vote?.contractHash],
    () => estimateSendVote(vote),
    {
      retry: false,
      enabled: !!vote && !!auth,
      refetchOnWindowFocus: false,
      initialData: {txFee: ''},
    }
  )

  const dt = getDateFromBlocks(vote?.block, currentBlock)

  const size = useBreakpointValue(['mdx', 'md'])
  const variantPrimary = useBreakpointValue(['primaryFlat', 'primary'])

  return (
    <Dialog onClose={onClose} {...props}>
      <DialogHeader>{t('Scheduled transaction added')}</DialogHeader>
      <DialogBody>
        <Stack
          bg="gray.50"
          borderRadius="md"
          px={4}
          py={3}
          spacing={[3, 3 / 2]}
        >
          <DeferredVotesModalDesc
            label={t('Date')}
            value={formatDateTimeShort(dt.toDate())}
          />
          <DeferredVotesModalDesc
            label={t('Type')}
            value={t('Send public vote')}
          />
          <DeferredVotesModalDesc
            label={t('To address')}
            value={vote?.contractHash}
            maxValueW="50%"
          />
          <DeferredVotesModalDesc
            label={t('Amount')}
            value={dna(vote?.amount)}
          />
          <DeferredVotesModalDesc
            label={t('Fee')}
            value={txFeeData?.txFee ? dna(txFeeData?.txFee) : ''}
          />
        </Stack>
        <Text color="muted" mt={4}>
          {t(
            'Your vote is secret. To reveal your vote please appear online and send the scheduled transaction during the counting period: {{startCounting}} — {{finishCounting}}',
            {
              startCounting: formatDateTimeShort(startCounting),
              finishCounting: formatDateTimeShort(finishCounting),
              nsSeparator: '|',
            }
          )}
        </Text>
      </DialogBody>
      <DialogFooter justify={['center', 'auto']}>
        <Button
          onClick={onClose}
          variant={variantPrimary}
          size={size}
          w={['100%', 'auto']}
          order={[1, 2]}
        >
          {t('Got it')}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

const DeferredVoteErrorType = {
  NONE: 0,
  EARLY: 1,
  LATE: 2,
  NOQUORUM: 3,
}

function getDeferredVoteErrorType(error) {
  switch (error) {
    case 'too early to accept open vote':
      return DeferredVoteErrorType.EARLY
    case 'too late to accept open vote':
      return DeferredVoteErrorType.LATE
    case 'quorum is not reachable':
      return DeferredVoteErrorType.NOQUORUM
    default:
      return DeferredVoteErrorType.NONE
  }
}

export function DeferredVotes() {
  const interval = isVercelProduction ? 5 * 60 * 1000 : 60 * 1000

  const [
    {votes: pendingVotes, isReady},
    {estimateSendVote, estimateProlong, sendVote},
  ] = useDeferredVotes()
  const {t, i18n} = useTranslation()

  const epoch = useEpoch()

  const failToast = useFailToast()

  const [state, setState] = useState({votes: [], index: 0})

  const {isOpen, onOpen, onClose} = useDisclosure()

  const dna = toLocaleDna(i18n.language, {maximumFractionDigits: 4})

  const currentVote = state.votes[state.index]

  const canOpen = epoch?.currentPeriod === EpochPeriod.None

  const openModal = () => {
    if (isOpen) return
    setState({votes: pendingVotes, index: 0})
    onOpen()
  }

  const next = () => {
    if (state.index >= state.votes.length - 1) onClose()
    else {
      setState(prevState => ({...prevState, index: prevState.index + 1}))
    }
  }

  const send = async () => {
    try {
      await sendVote(currentVote, true)
    } catch (e) {
      failToast(e.message)
    } finally {
      next()
    }
  }

  const {data: txFeeData, error} = useQuery(
    ['bcn_estimateRawTx', currentVote?.contractHash],
    () => estimateSendVote(currentVote),
    {
      retry: false,
      enabled: !!currentVote,
      refetchOnWindowFocus: false,
    }
  )

  const {data: canProlong} = useQuery(
    ['bcn_estimateProlong', currentVote?.contractHash],
    () => estimateProlong(currentVote?.contractHash),
    {
      retry: false,
      enabled: !!currentVote,
      refetchOnWindowFocus: false,
    }
  )

  const {data: blockAtData} = useQuery(
    ['bcn_blockAt', currentVote?.block],
    () => getBlockAt(currentVote?.block),
    {
      enabled: !!currentVote,
      refetchOnWindowFocus: false,
    }
  )

  useInterval(
    () => {
      if (pendingVotes.length) {
        openModal()
      }
    },
    isReady && canOpen ? interval : null,
    true
  )

  const size = useBreakpointValue(['mdx', 'md'])
  const variantPrimary = useBreakpointValue(['primaryFlat', 'primary'])
  const variantSecondary = useBreakpointValue(['secondaryFlat', 'secondary'])

  const errorType = getDeferredVoteErrorType(error?.message)

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogHeader>
        {t(
          'Scheduled transaction is about to be sent ({{index}} of {{total}})',
          {
            index: state.index + 1,
            total: state.votes.length,
          }
        )}
      </DialogHeader>
      <DialogBody>
        <Stack
          bg="gray.50"
          borderRadius="md"
          px={4}
          py={3}
          spacing={[3, 3 / 2]}
        >
          <DeferredVotesModalDesc
            label={t('Date')}
            value={
              blockAtData?.timestamp
                ? `${new Date(blockAtData?.timestamp * 1000).toLocaleString(
                    undefined,
                    {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }
                  )}`
                : ''
            }
          />
          <DeferredVotesModalDesc
            label={t('Type')}
            value={t('Send public vote')}
          />
          <DeferredVotesModalDesc
            label={t('To address')}
            value={currentVote?.contractHash}
            maxValueW="50%"
          />
          <DeferredVotesModalDesc
            label={t('Amount')}
            value={dna(currentVote?.amount)}
          />
          <DeferredVotesModalDesc
            label={t('Fee')}
            value={txFeeData?.txFee ? dna(txFeeData?.txFee) : ''}
          />
        </Stack>
        <Box mt={4}>
          {(errorType === DeferredVoteErrorType.EARLY ||
            ([
              DeferredVoteErrorType.LATE,
              DeferredVoteErrorType.NOQUORUM,
            ].includes(errorType) &&
              canProlong)) && (
            <WarningAlert>
              {t(
                'Can not send the scheduled transaction yet. Please reschedule it.'
              )}
            </WarningAlert>
          )}
          {errorType === DeferredVoteErrorType.LATE && !canProlong && (
            <ErrorAlert>
              {t(
                "It's too late to send the scheduled transaction. Please delete it."
              )}
            </ErrorAlert>
          )}
          {errorType === DeferredVoteErrorType.NOQUORUM && !canProlong && (
            <ErrorAlert>
              {t('Scheduled transaction is no longer valid. Please delete it.')}
            </ErrorAlert>
          )}
        </Box>
      </DialogBody>
      <DialogFooter justify={['center', 'auto']}>
        <Button
          onClick={next}
          variant={variantSecondary}
          size={size}
          w={['100%', 'auto']}
          order={[3, 1]}
        >
          {t('Not now')}
        </Button>
        <Divider
          display={['block', 'none']}
          h={10}
          orientation="vertical"
          color="gray.100"
          order={2}
        />
        <Button
          onClick={send}
          variant={variantPrimary}
          size={size}
          w={['100%', 'auto']}
          order={[1, 2]}
        >
          {(errorType === DeferredVoteErrorType.EARLY ||
            ([
              DeferredVoteErrorType.LATE,
              DeferredVoteErrorType.NOQUORUM,
            ].includes(errorType) &&
              canProlong)) &&
            t('Reschedule')}
          {[
            DeferredVoteErrorType.LATE,
            DeferredVoteErrorType.NOQUORUM,
          ].includes(errorType) &&
            !canProlong &&
            t('Delete')}
          {errorType === DeferredVoteErrorType.NONE && t('Send')}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
