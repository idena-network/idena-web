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
  Heading,
  Image,
  Stack,
  Td,
  Text,
  Th,
  useDisclosure,
  useTheme,
} from '@chakra-ui/react'
import {useMachine} from '@xstate/react'
import dayjs from 'dayjs'
import {useEffect, useMemo, useRef, useState} from 'react'
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
import {useFailToast} from '../../shared/hooks/use-toast'
import {createTimerMachine} from '../../shared/machines'
import {useEpoch} from '../../shared/providers/epoch-context'
import {
  useTestValidationDispatch,
  useTestValidationState,
} from '../../shared/providers/test-validation-context'
import {AnswerType, CertificateActionType} from '../../shared/types'
import {reorderList} from '../../shared/utils/arr'
import {keywords} from '../../shared/utils/keywords'
import {capitalize} from '../../shared/utils/string'
import {toBlob} from '../../shared/utils/utils'
import {canScheduleValidation, GetAnswerTitle} from './utils'

function CertificateCardPanelItem({title, children}) {
  return (
    <Flex direction="column" flex={1}>
      <Text color="muted">{title}</Text>
      <Text fontSize="base" fontWeight={500}>
        {children}
      </Text>
    </Flex>
  )
}

function Countdown({validationTime = 0}) {
  const duration = Math.floor(
    Math.max(validationTime - new Date().getTime(), 0) / 1000
  )

  const [state] = useMachine(
    useMemo(() => createTimerMachine(duration), [duration])
  )

  return (
    <Text fontSize="base" fontWeight={500}>
      {state.matches('stopped') && '00:00:00'}
      {state.matches('running') &&
        [
          Math.floor(duration / 3600),
          Math.floor((duration % 3600) / 60),
          duration % 60,
        ]
          .map(t => t.toString().padStart(2, 0))
          .join(':')}
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

  const {isOpen, onOpen, onClose} = useDisclosure()
  const cancelRef = useRef()

  const failToast = useFailToast()

  const testValidationState = useTestValidationState()
  const {scheduleValidation, cancelValidation} = useTestValidationDispatch()

  const epochState = useEpoch()

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

  return (
    <Flex
      alignSelf="stretch"
      direction="column"
      shadow="0 3px 12px 0 rgba(83, 86, 92, 0.1), 0 2px 3px 0 rgba(83, 86, 92, 0.2)"
      p={10}
      borderRadius="lg"
      borderTop="4px solid"
      borderTopColor={certificateColor}
      {...props}
    >
      <Flex alignItems="center" mb={2}>
        <CertificateStarIcon boxSize={4} color={certificateColor} />
        <Heading
          as="h2"
          fontSize="lg"
          fontWeight={500}
          verticalAlign="center"
          ml={1}
        >
          {title}
        </Heading>
      </Flex>

      <Flex>
        <Text color="muted">{description}</Text>
      </Flex>
      <Flex bg="gray.50" px={6} py={5} mt={6} rounded="lg">
        <CertificateCardPanelItem title={t('Schedule')}>
          {isStarted
            ? dayjs(current.startTime).format('D MMM HH:mm')
            : scheduleText}
        </CertificateCardPanelItem>
        {isStarted && (
          <CertificateCardPanelItem title={t('Time left')}>
            <Countdown validationTime={current.startTime} />
          </CertificateCardPanelItem>
        )}
        <CertificateCardPanelItem title={t('Trust level')}>
          {trustLevel}
        </CertificateCardPanelItem>
      </Flex>
      {cardValue.actionType === CertificateActionType.Passed && (
        <AlertBox>
          <Flex align="center">
            <RightIcon boxSize={4} color="green.500" mr={2} />
            <Text fontWeight={500}>{t('Passed successfully')}</Text>
          </Flex>
          <Box>
            <TextLink
              href="/try/details/[id]"
              as={`/try/details/${cardValue.id}`}
              color="green.500"
            >
              Details
            </TextLink>
          </Box>
        </AlertBox>
      )}
      {cardValue.actionType === CertificateActionType.Failed && (
        <AlertBox borderColor="red.050" bg="red.010">
          <Flex align="center">
            <WarningIcon boxSize={4} color="red.500" mr={2} />
            <Text fontWeight={500}>{t('Failed. Please try again')}</Text>
          </Flex>
          <Box>
            <TextLink
              href="/try/details/[id]"
              as={`/try/details/${cardValue.id}`}
              color="red.500"
            >
              Details
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
        <Flex ml="auto" alignItems="center">
          {cardValue.actionType === CertificateActionType.Passed && (
            <>
              <TextLink
                href="/certificate/[id]"
                as={`/certificate/${cardValue.id}`}
                fontWeight={500}
                mr={4}
                target="_blank"
              >
                <CertificateIcon boxSize={5} mr={1} />
                {t('Show certificate')}
              </TextLink>
              <Divider borderColor="gray.100" orientation="vertical" mr={4} />
            </>
          )}

          <PrimaryButton
            isDisabled={isStarted}
            onClick={() => schedule()}
            isLoading={waiting}
            loadingText={t('Scheduling...')}
          >
            {t('Schedule')}
          </PrimaryButton>
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
              Yes
            </SecondaryButton>
            <PrimaryButton ref={cancelRef} onClick={onClose} ml={2}>
              No
            </PrimaryButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

export function FlipsValueTd(props) {
  return <Td color="gray.500" fontWeight="500" px={3} py={3 / 2} {...props} />
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

export function DetailsPoints({title, value, isLoading, isFailed}) {
  return (
    <Flex direction="column" lineHeight={5} mr={16}>
      <Flex color="muted" fontSize="md">
        {title}
      </Flex>
      <Flex
        fontSize="lg"
        fontWeight="500"
        color={isFailed ? 'red.500' : 'gray.500'}
      >
        {isLoading ? <Skeleton h={5} w={8} /> : value}
      </Flex>
    </Flex>
  )
}

export function ShortFlipWithIcon({hash, onClick}) {
  const [url, setUrl] = useState()

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
          <Avatar boxSize={8} src={url} bg="gray.50" borderRadius="lg" mr={3} />
        ) : (
          <Box w={8} h={8} rounded="lg" mr={3}>
            <EmptyFlipIcon boxSize={8} />
          </Box>
        )}
        <Flex fontWeight={500} color="blue.500">
          {hash}
        </Flex>
      </Flex>
    </>
  )
}

export function LongFlipWithIcon({hash, onClick}) {
  const [url, setUrl] = useState()

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
      <Flex alignItems="center" cursor="pointer" onClick={onClick}>
        <Flex>
          {url ? (
            <Avatar
              boxSize={8}
              src={url}
              bg="gray.50"
              borderRadius="lg"
              mr={3}
            />
          ) : (
            <Box w={8} h={8} rounded="lg" mr={3}>
              <EmptyFlipIcon boxSize={8} />
            </Box>
          )}
        </Flex>
        <Flex direction="column" lineHeight={1} overflow="hidden">
          <Flex color="gray.500" fontWeight={500}>
            {isLoading ? <Skeleton w={10} h={3} /> : getWords()}
          </Flex>
          <Flex color="blue.500" fontWeight={500}>
            <Text isTruncated>{hash}</Text>
          </Flex>
        </Flex>
      </Flex>
    </>
  )
}

function FlipHolder({isSelected, ...props}) {
  const theme = useTheme()

  return (
    <Flex
      position="relative"
      justify="center"
      direction="column"
      borderRadius="lg"
      border="2px solid"
      borderColor={isSelected ? 'blue.500' : 'brandBlue.025'}
      boxShadow={
        isSelected ? `0 0 2px 3px ${theme.colors.brandBlue['025']}` : 'none'
      }
      opacity={isSelected ? 1 : 0.3}
      p={1 / 2}
      w={140}
      h={450}
      {...props}
    />
  )
}

function LoadingFlip() {
  return (
    <FlipHolder css={{cursor: 'not-allowed'}} opacity={1}>
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

function Flip({isLoading, images, orders, answer, variant}) {
  const isSelected = answer === variant

  if (isLoading) return <LoadingFlip />

  return (
    <FlipHolder isSelected={isSelected}>
      {reorderList(images, orders[variant - 1]).map((src, idx) => (
        <Box
          key={idx}
          height="100%"
          position="relative"
          overflow="hidden"
          roundedTop={idx === 0 ? 'lg' : 0}
          roundedBottom={idx === images.length - 1 ? 'lg' : 0}
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
          ></Box>
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

  return (
    <Flex direction="column" {...props}>
      <Flex
        direction="column"
        borderRadius="lg"
        backgroundColor="gray.50"
        px={10}
        py={8}
        lineHeight={5}
        mb={4}
      >
        <Box color="gray.500" fontWeight={500}>
          {isLoading ? (
            <Skeleton h={5} w={20} />
          ) : (
            capitalize(keywords[words[0]].name)
          )}
        </Box>
        <Box color="muted" mt={1 / 2}>
          {!isLoading && capitalize(keywords[words[0]].desc)}
        </Box>
        <Box color="gray.500" fontWeight={500} mt={3}>
          {isLoading ? (
            <Skeleton h={5} w={20} />
          ) : (
            capitalize(keywords[words[1]].name)
          )}
        </Box>
        <Box color="muted" mt={1 / 2}>
          {!isLoading && capitalize(keywords[words[1]].desc)}
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
          text={t('The flip must have been reported')}
        />
      )}
      {!isCorrectReport && !shouldBeReported && (
        <ReportAlert
          bg="orange.010"
          borderColor="orange.050"
          icon={<WarningIcon color="orange.500" boxSize={5}></WarningIcon>}
          text={t('You should not have reported it')}
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
          <Flex color="muted" fontSize="md">
            {t('Your answer')}
          </Flex>
        </Flex>
      </DialogHeader>
      <DialogBody>
        <Flex mt={8}>
          <Flex
            position="relative"
            justify="space-between"
            w={300}
            align="center"
          >
            <Flip
              {...data}
              variant={AnswerType.Left}
              answer={answer}
              isLoading={isFetching}
            />
            <Flip
              {...data}
              variant={AnswerType.Right}
              answer={answer}
              isLoading={isFetching}
            />
          </Flex>
          {withWords && (
            <FlipWords
              isLoading={isFetching}
              isCorrectReport={isCorrectReport}
              shouldBeReported={shouldBeReported}
              words={data.keywords}
              flex={1}
              ml={8}
            />
          )}
        </Flex>
      </DialogBody>
      <DialogFooter>
        <SecondaryButton onClick={onClose}>Close</SecondaryButton>
      </DialogFooter>
    </Dialog>
  )
}
