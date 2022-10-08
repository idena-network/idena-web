/* eslint-disable no-nested-ternary */
/* eslint-disable react/prop-types */
import {WarningIcon} from '@chakra-ui/icons'
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogCloseButton,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Avatar,
  Box,
  Divider,
  Flex,
  Button,
  Heading,
  Image,
  Tr,
  Td,
  Text,
  Th,
  useBreakpointValue,
  useDisclosure,
  useTheme,
} from '@chakra-ui/react'
import dayjs from 'dayjs'
import durationPlugin from 'dayjs/plugin/duration'
import React, {useEffect, useRef, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useQuery} from 'react-query'
import {getFlip, getFlipCache} from '../../shared/api/self'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  Skeleton,
  Spinner,
  TextLink,
} from '../../shared/components/components'
import {
  CertificateIcon,
  CertificateStarIcon,
  EmptyFlipIcon,
  RightIcon,
  TimerIcon,
  WrongIcon,
} from '../../shared/components/icons'
import {useTimer} from '../../shared/hooks/use-timer'
import {useFailToast} from '../../shared/hooks/use-toast'
import {useEpoch} from '../../shared/providers/epoch-context'
import {
  useTestValidationDispatch,
  useTestValidationState,
} from '../../shared/providers/test-validation-context'
import {AnswerType, CertificateActionType} from '../../shared/types'
import {reorderList} from '../../shared/utils/arr'
import {keywords} from '../../shared/utils/keywords'
import {capitalize} from '../../shared/utils/string'
import {toBlob, useIsDesktop} from '../../shared/utils/utils'
import {canScheduleValidation, GetAnswerTitle} from './utils'

dayjs.extend(durationPlugin)

function CertificateCardPanelItem({title, children, ...props}) {
  return (
    <Flex
      direction={['row', 'column']}
      justify={['space-between', 'initial']}
      flex={1}
      {...props}
    >
      <Text fontSize={['mdx', 'md']} color={['gray.500', 'muted']}>
        {title}
      </Text>
      <Text fontSize={['mdx', 'base']} fontWeight={500}>
        {children}
      </Text>
    </Flex>
  )
}

export function Countdown({duration = 0}) {
  const [{remaining}, {reset}] = useTimer(duration)

  useEffect(() => {
    reset(duration)
  }, [duration, reset])

  return (
    <Text fontSize={['mdx', 'base']} fontWeight={500}>
      {dayjs.duration(remaining).format('HH:mm:ss')}
    </Text>
  )
}

export function AlertBox(props) {
  return (
    <Flex
      align="center"
      borderWidth="1px"
      borderColor="green.050"
      fontWeight={500}
      rounded="md"
      bg="green.010"
      px={3}
      py={2}
      mt={2}
      justify="space-between"
      {...props}
    />
  )
}

export function CertificateCard({
  title,
  description,
  type,
  trustLevel,
  scheduleText,
  certificateColor,
  ...props
}) {
  const {t} = useTranslation()
  const [waiting, setWaiting] = useState(false)
  const size = useBreakpointValue(['lg', 'md'])

  const {isOpen, onOpen, onClose} = useDisclosure()
  const cancelRef = useRef()

  const failToast = useFailToast()

  const testValidationState = useTestValidationState()
  const {scheduleValidation, cancelValidation} = useTestValidationDispatch()

  const epochState = useEpoch()

  const {
    isOpen: isOpenReSchedule,
    onOpen: onOpenReSchedule,
    onClose: onCloseReSchedule,
  } = useDisclosure()

  const {
    validations: {[type]: cardValue},
    current,
  } = testValidationState

  const isStarted = type === current?.type

  const schedule = async () => {
    try {
      setWaiting(true)
      if (current) {
        return failToast(
          t(
            'Can not schedule the training validation. Another validation is already requested.'
          )
        )
      }
      if (!canScheduleValidation(type, epochState?.nextValidation)) {
        return failToast(
          t(
            'Can not schedule the training validation because it overlaps with the real validation ceremony.'
          )
        )
      }
      await scheduleValidation(type)
    } catch (e) {
      console.error(e)
    } finally {
      setWaiting(false)
    }
  }

  const onScheduleClick = () => {
    if (cardValue.actionType === CertificateActionType.Passed) {
      onOpenReSchedule()
    } else {
      schedule()
    }
  }

  const startTime = current?.startTime
  const timerDuration = React.useMemo(
    () => Math.floor(Math.max(dayjs(startTime).diff(), 0)),
    [startTime]
  )

  return (
    <Flex
      alignSelf="stretch"
      direction="column"
      shadow="0 3px 12px 0 rgba(83, 86, 92, 0.1), 0 2px 3px 0 rgba(83, 86, 92, 0.2)"
      p={['28px', 10]}
      borderRadius="lg"
      borderTop="4px solid"
      borderTopColor={certificateColor}
      {...props}
    >
      <Flex
        justify={['space-between', 'flex-start']}
        alignItems="center"
        mb={2}
      >
        <CertificateStarIcon
          order={[2, 1]}
          boxSize={[6, 4]}
          color={certificateColor}
        />
        <Heading
          order={[1, 2]}
          as="h2"
          fontSize="lg"
          fontWeight={500}
          verticalAlign="center"
          ml={[0, 1]}
        >
          {title}
        </Heading>
      </Flex>

      <Flex>
        <Text color="muted">{description}</Text>
      </Flex>
      <Flex
        direction={['column', 'row']}
        bg="gray.50"
        px={6}
        py={['30px', 5]}
        mt={6}
        rounded="lg"
      >
        <CertificateCardPanelItem title={t('Schedule')} mb={[5, 0]}>
          {isStarted
            ? dayjs(current.startTime).format('D MMM HH:mm')
            : scheduleText}
        </CertificateCardPanelItem>
        {isStarted && (
          <CertificateCardPanelItem title={t('Time left')}>
            <Countdown duration={timerDuration} />
          </CertificateCardPanelItem>
        )}
        <CertificateCardPanelItem title={t('Trust level')}>
          {trustLevel}
        </CertificateCardPanelItem>
      </Flex>
      {cardValue.actionType === CertificateActionType.Passed && (
        <AlertBox>
          <Flex align="center">
            <RightIcon boxSize={[5, 4]} color="green.500" mr={2} />
            <Text fontWeight={500}>{t('Passed successfully')}</Text>
          </Flex>
          <Box>
            <TextLink
              href="/try/details/[id]"
              as={`/try/details/${cardValue.id}`}
              color="green.500"
            >
              {t('Details')}
            </TextLink>
          </Box>
        </AlertBox>
      )}
      {cardValue.actionType === CertificateActionType.Failed && (
        <AlertBox borderColor="red.050" bg="red.010">
          <Flex align="center">
            <WarningIcon boxSize={[5, 4]} color="red.500" mr={2} />
            <Text fontWeight={500}>{t('Failed. Please try again')}</Text>
          </Flex>
          <Box>
            <TextLink
              href="/try/details/[id]"
              as={`/try/details/${cardValue.id}`}
              color="red.500"
            >
              {t('Details')}
            </TextLink>
          </Box>
        </AlertBox>
      )}
      {cardValue.actionType === CertificateActionType.Requested && (
        <AlertBox borderColor="gray.200" bg="gray.50">
          <Flex align="center">
            <TimerIcon boxSize={4} color="blue.500" mr={2} />
            <Text fontWeight={500}>{t('Test was requested...')}</Text>
          </Flex>
          <TextLink
            href="#"
            onClick={e => {
              e.preventDefault()
              onOpen()
            }}
          >
            {t('Cancel')}
          </TextLink>
        </AlertBox>
      )}

      <Flex mt={6}>
        <Flex
          direction={['column', 'row']}
          ml={[0, 'auto']}
          w={['100%', 'auto']}
          alignItems="center"
        >
          {cardValue.actionType === CertificateActionType.Passed && (
            <>
              <TextLink
                display={['none', 'block']}
                href="/certificate/[id]"
                as={`/certificate/${cardValue.id}`}
                fontWeight={500}
                mr={4}
                target="_blank"
              >
                <CertificateIcon boxSize={5} mr={1} />
                {t('Show certificate')}
              </TextLink>
              <Divider
                display={['none', 'block']}
                borderColor="gray.100"
                orientation="vertical"
                mr={4}
              />
            </>
          )}

          <PrimaryButton
            size={size}
            w={['100%', 'auto']}
            isDisabled={isStarted || !epochState}
            onClick={() => onScheduleClick()}
            isLoading={waiting}
            loadingText={t('Scheduling...')}
          >
            {t('Schedule')}
          </PrimaryButton>

          {cardValue.actionType === CertificateActionType.Passed && (
            <TextLink
              display={['block', 'none']}
              href="/certificate/[id]"
              as={`/certificate/${cardValue.id}`}
              fontSize="mobile"
              fontWeight={500}
              mt={5}
              target="_blank"
            >
              {t('Show certificate')}
            </TextLink>
          )}
        </Flex>
      </Flex>

      <AlertDialog
        motionPreset="slideInBottom"
        leastDestructiveRef={cancelRef}
        onClose={onClose}
        isOpen={isOpen}
        isCentered
      >
        <AlertDialogOverlay />

        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg">
            {t('Cancel validation?')}
          </AlertDialogHeader>
          <AlertDialogCloseButton />
          <AlertDialogBody fontSize="md">
            {t('Are you sure you want to cancel the scheduled validation?')}
          </AlertDialogBody>
          <AlertDialogFooter>
            <SecondaryButton
              onClick={() => {
                cancelValidation(type)
                onClose()
              }}
            >
              {t('Yes')}
            </SecondaryButton>
            <PrimaryButton ref={cancelRef} onClick={onClose} ml={2}>
              {t('No')}
            </PrimaryButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReScheduleAlert
        isOpen={isOpenReSchedule}
        onConfirm={schedule}
        onClose={onCloseReSchedule}
      />
    </Flex>
  )
}

export function FlipsTh(props) {
  return (
    <Th
      textTransform="none"
      fontSize="md"
      fontWeight={400}
      bg="gray.50"
      color="muted"
      py={2}
      px={3}
      borderBottom="none"
      letterSpacing={0}
      {...props}
    />
  )
}

export function RoundedFlipsTh(props) {
  return <FlipsTh bg="none" position="relative" {...props} />
}

export function FlipsThCorner(props) {
  return (
    <Box
      position="absolute"
      inset={0}
      bg="gray.50"
      w="full"
      zIndex="hide"
      {...props}
    />
  )
}

export function FlipsHiddenDescRow({children}) {
  return (
    <Tr display={['table-row', 'none']}>
      <Td colSpan={3} px={0} pt={1} pb={3}>
        <Box bg="gray.50" borderRadius="md" px={5} py={2}>
          {children}
        </Box>
      </Td>
    </Tr>
  )
}

export function FlipsValueTd(props) {
  return (
    <Td
      color="gray.500"
      fontWeight="500"
      px={[0, 3]}
      py={[2, 3 / 2]}
      {...props}
    />
  )
}

export function GetReasonDesc(t, reason) {
  switch (reason) {
    case 1:
      return t('One/both keywords are not relevant')
    case 2:
      return t('Numbers/letters/labels indicating the order')
    case 3:
      return t('Sequence of enumerated objects')
    case 4:
      return t('Text necessary to read to solve the flip')
    case 5:
      return t('Inappropriate content')
    default:
      return '—'
  }
}

export function DetailsPoints({title, value, isLoading, isFailed, ...props}) {
  const countColor = useBreakpointValue(['muted', 'gray.500'])

  return (
    <Flex
      direction="column"
      lineHeight={5}
      mt={[2, 0]}
      mr={[0, 16]}
      w={['100%', 'auto']}
      {...props}
    >
      <Flex
        color={['gray.500', 'muted']}
        fontSize={['base', 'md']}
        fontWeight={[500, 400]}
      >
        {title}
      </Flex>
      <Flex
        mt={[3 / 2, 0]}
        fontSize={['base', 'lg']}
        fontWeight={[400, 500]}
        color={isFailed ? 'red.500' : countColor}
      >
        {isLoading ? <Skeleton h={5} w={8} /> : value}
      </Flex>
      <Divider mt={2} display={['initial', 'none']} />
    </Flex>
  )
}

export function ShortFlipWithIcon({hash, onClick}) {
  const [url, setUrl] = useState()
  const isDesktop = useIsDesktop()
  const {t} = useTranslation()

  const {data} = useQuery(['get-flip-cache', hash], () => getFlipCache(hash), {
    enabled: !!hash,
    retry: false,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    async function convert() {
      if (data) {
        const blob = await toBlob(data.firstImage)
        setUrl(URL.createObjectURL(blob))
      }
    }

    convert()
  }, [data])

  return (
    <>
      <Flex alignItems="center" onClick={onClick} cursor="pointer">
        {url ? (
          <Avatar
            boxSize={[10, 8]}
            src={url}
            bg="gray.50"
            borderRadius={['lgx', 'lg']}
            mr={3}
          />
        ) : (
          <Box w={[10, 8]} h={[10, 8]} rounded={['lgx', 'lg']} mr={3}>
            <EmptyFlipIcon boxSize={[10, 8]} />
          </Box>
        )}
        <Flex direction={['column', 'row']}>
          <Text fontSize={['base', 'md']} fontWeight={500} color="blue.500">
            {isDesktop ? hash : `${hash.substr(0, 4)}...${hash.substr(-4, 4)}`}
          </Text>
          <Text
            display={['block', 'none']}
            fontSize="md"
            fontWeight={500}
            color="muted"
          >
            {t('Flip')}
          </Text>
        </Flex>
      </Flex>
    </>
  )
}

export function LongFlipWithIcon({hash, onClick}) {
  const [url, setUrl] = useState()
  const isDesktop = useIsDesktop()

  const {data, isLoading} = useQuery(
    ['get-flip-cache', hash],
    () => getFlipCache(hash),
    {
      enabled: !!hash,
      retry: false,
      refetchOnWindowFocus: false,
    }
  )

  useEffect(() => {
    async function convert() {
      if (data) {
        const blob = await toBlob(data.firstImage)
        setUrl(URL.createObjectURL(blob))
      }
    }

    convert()
  }, [data])

  const getWords = () => {
    try {
      const words = data.keywords
      if (words) {
        return `${capitalize(keywords[words[0]].name)} / ${capitalize(
          keywords[words[1]].name
        )}`
      }
    } catch {
      return 'No words'
    }
  }

  return (
    <>
      <Flex mr={[1, 0]} alignItems="center" cursor="pointer" onClick={onClick}>
        <Flex>
          {url ? (
            <Avatar
              boxSize={[10, 8]}
              src={url}
              bg="gray.50"
              borderRadius={['lgx', 'lg']}
              mr={3}
            />
          ) : (
            <Box w={[10, 8]} h={[10, 8]} rounded={['lgx', 'lg']} mr={3}>
              <EmptyFlipIcon boxSize={[10, 8]} />
            </Box>
          )}
        </Flex>
        <Flex direction="column" lineHeight={1} overflow="hidden">
          <Flex order={[2, 1]} color={['muted', 'gray.500']} fontWeight={500}>
            {isLoading ? (
              <Skeleton w={10} h={3} />
            ) : (
              <Text
                textOverflow="ellipsis"
                overflow="hidden"
                whiteSpace="nowrap"
              >
                {getWords()}
              </Text>
            )}
          </Flex>
          <Flex
            order={[1, 2]}
            color="blue.500"
            fontSize={['base', 'md']}
            fontWeight={500}
            h={[6, 'auto']}
          >
            <Text isTruncated>
              {isDesktop
                ? hash
                : `${hash.substr(0, 4)}...${hash.substr(-4, 4)}`}
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </>
  )
}

function FlipHolder({isSmall, ...props}) {
  const borderRadius = useBreakpointValue(['16px', 'lg'])

  return (
    <Flex
      position="relative"
      justify="center"
      direction="column"
      borderRadius={borderRadius}
      border="2px solid"
      p={1 / 2}
      w={isSmall ? 63 : 140}
      h={isSmall ? 200 : 450}
      {...props}
    />
  )
}

function LoadingFlip({isSmall}) {
  return (
    <FlipHolder
      isSmall={isSmall}
      css={{cursor: 'not-allowed'}}
      opacity={1}
      borderColor="blue.025"
    >
      <Flex
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        alignItems="center"
        justifyContent="center"
      >
        <Spinner />
      </Flex>
    </FlipHolder>
  )
}

function Flip({
  isLoading,
  images,
  orders,
  answer,
  variant,
  isCorrect,
  isSmall,
}) {
  const theme = useTheme()
  const isSelected = answer === variant
  const borderRadius = useBreakpointValue(['lgx', 'lg'])

  if (isLoading) return <LoadingFlip isSmall={isSmall} />

  return (
    <FlipHolder
      isSmall={isSmall}
      borderColor={
        isSelected ? (isCorrect ? 'blue.500' : 'red.500') : 'blue.025'
      }
      boxShadow={
        isSelected
          ? `0 0 2px 3px ${
              isCorrect ? theme.colors.blue['025'] : theme.colors.red['025']
            }`
          : 'none'
      }
      opacity={isSelected ? 1 : 0.3}
    >
      {reorderList(images, orders[variant - 1]).map((src, idx) => (
        <Box
          key={idx}
          height="100%"
          position="relative"
          overflow="hidden"
          roundedTop={idx === 0 ? borderRadius : 0}
          roundedBottom={idx === images.length - 1 ? borderRadius : 0}
        >
          <Box
            background={`center center / cover no-repeat url(${src})`}
            filter="blur(6px)"
            zIndex={1}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
          />
          <Image
            ignoreFallback
            src={src}
            alt="current-flip"
            height="100%"
            width="100%"
            objectFit="fit"
            objectPosition="center"
            textAlign="center"
            position="relative"
            zIndex={2}
          />
        </Box>
      ))}
    </FlipHolder>
  )
}

function ReportAlert({text, icon, ...props}) {
  return (
    <Flex
      border="solid 1px"
      borderColor="blue.050"
      bg="blue.010"
      px={3}
      py={5 / 2}
      align="center"
      borderRadius="lg"
      {...props}
    >
      {icon}
      <Text fontWeight={500} ml={2}>
        {text}
      </Text>
    </Flex>
  )
}

function FlipWords({
  isLoading,
  words,
  isCorrectReport,
  shouldBeReported,
  ...props
}) {
  const {t} = useTranslation()

  const getWordName = idx => {
    try {
      return capitalize(keywords[words[idx]].name)
    } catch {
      return 'No words'
    }
  }

  const getWordDesc = idx => {
    try {
      return capitalize(keywords[words[idx]].desc)
    } catch {
      return ''
    }
  }

  return (
    <Flex direction="column" {...props}>
      <Flex
        direction="column"
        borderRadius="lg"
        backgroundColor={['white', 'gray.50']}
        px={[0, 10]}
        pt={8}
        pb={[2, 8]}
        lineHeight={5}
        mb={4}
      >
        <Box color="gray.500" fontWeight={500}>
          {isLoading ? <Skeleton h={5} w={20} /> : getWordName(0)}
        </Box>
        <Box color="muted" mt={1 / 2}>
          {!isLoading && getWordDesc(0)}
        </Box>
        <Box color="gray.500" fontWeight={500} mt={3}>
          {isLoading ? <Skeleton h={5} w={20} /> : getWordName(1)}
        </Box>
        <Box color="muted" mt={1 / 2}>
          {!isLoading && getWordDesc(1)}
        </Box>
      </Flex>
      {isCorrectReport && shouldBeReported && (
        <ReportAlert
          icon={<RightIcon color="blue.500" boxSize={5}></RightIcon>}
          text={t('Reported successfully')}
        />
      )}
      {isCorrectReport && !shouldBeReported && (
        <ReportAlert
          icon={<RightIcon color="blue.500" boxSize={5}></RightIcon>}
          text={t('You marked this flip as correct')}
        />
      )}
      {!isCorrectReport && shouldBeReported && (
        <ReportAlert
          bg="red.010"
          borderColor="red.050"
          icon={<WarningIcon color="red.500" boxSize={5}></WarningIcon>}
          text={t('You had to report this flip')}
        />
      )}
      {!isCorrectReport && !shouldBeReported && (
        <ReportAlert
          bg="orange.010"
          borderColor="orange.050"
          icon={<WarningIcon color="orange.500" boxSize={5}></WarningIcon>}
          text={t('You reported this flip wrongly')}
        />
      )}
    </Flex>
  )
}

export function FlipView({
  hash,
  answer,
  isCorrect,
  isCorrectReport,
  shouldBeReported,
  withWords,
  onClose,
  ...props
}) {
  const {t} = useTranslation()
  const isDesktop = useIsDesktop()
  const size = useBreakpointValue(['lg', 'md'])
  const variant = useBreakpointValue(['primaryFlat', 'secondary'])

  const {data, isFetching} = useQuery(
    ['get-flip', hash],
    () =>
      getFlip(hash).then(async flip => {
        const images = await Promise.all(flip.images.map(toBlob))
        return {
          images: images.map(URL.createObjectURL),
          orders: flip.orders,
          keywords: flip.keywords,
        }
      }),
    {
      enabled: !!hash,
      retry: false,
      refetchOnWindowFocus: false,
      initialData: {
        images: [],
        orders: [[], []],
      },
    }
  )

  return (
    <Dialog onClose={onClose} {...props} size={withWords ? '2xl' : 'sm'}>
      <DialogHeader>
        <Flex direction="column">
          <Flex alignItems="center">
            {GetAnswerTitle(t, answer)}
            {isCorrect ? (
              <RightIcon boxSize={5} color="green.500" ml={1} />
            ) : (
              <WrongIcon boxSize={5} color="red.500" ml={1} />
            )}
          </Flex>
          <Text
            color="muted"
            fontSize={['base', 'md']}
            fontWeight={[400, 500]}
            mt={[2.5, 0]}
          >
            {t('Your answer')}
          </Text>
        </Flex>
      </DialogHeader>
      <DialogBody>
        <Flex direction={['column', 'row']} align={['center', 'normal']} mt={8}>
          <Flex
            position="relative"
            justify="space-between"
            w={withWords && !isDesktop ? 135 : 300}
            align="center"
          >
            <Flip
              {...data}
              variant={AnswerType.Left}
              answer={answer}
              isLoading={isFetching}
              isCorrect={isCorrect}
              isSmall={withWords && !isDesktop}
            />
            <Flip
              {...data}
              variant={AnswerType.Right}
              answer={answer}
              isLoading={isFetching}
              isCorrect={isCorrect}
              isSmall={withWords && !isDesktop}
            />
          </Flex>
          {withWords && (
            <FlipWords
              isLoading={isFetching}
              isCorrectReport={isCorrectReport}
              shouldBeReported={shouldBeReported}
              words={data.keywords}
              flex={1}
              ml={[0, 8]}
              w={['100%', 'auto']}
            />
          )}
        </Flex>
      </DialogBody>
      <DialogFooter>
        <Button
          variant={variant}
          size={size}
          w={['100%', 'auto']}
          onClick={onClose}
        >
          {t('Close')}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

function ReScheduleAlert({isOpen, onConfirm, onClose}) {
  const {t} = useTranslation()
  const size = useBreakpointValue(['lg', 'md'])
  const buttonBg = useBreakpointValue(['transparent', 'red.090'])
  const buttonBgHover = useBreakpointValue(['transparent', 'red.500'])
  const variantConfirm = useBreakpointValue(['secondaryFlat', 'primary'])
  const variantCancel = useBreakpointValue(['primaryFlat', 'secondary'])
  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogHeader>{t('Already passed successfully')}</DialogHeader>
      <DialogBody>
        {t(
          'Starting a new training validation will reset the existing training validation certificate'
        )}
      </DialogBody>
      <DialogFooter>
        <Button
          size={size}
          variant={variantCancel}
          w={['100%', 'auto']}
          onClick={onClose}
        >
          {t('Cancel')}
        </Button>
        <Divider
          display={['block', 'none']}
          h={10}
          orientation="vertical"
          color="gray.100"
        />
        <Button
          size={size}
          variant={variantConfirm}
          w={['100%', 'auto']}
          onClick={() => {
            onConfirm()
            onClose()
          }}
          backgroundColor={buttonBg}
          _hover={{
            bg: {buttonBgHover},
          }}
        >
          {t('Start anyway')}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
