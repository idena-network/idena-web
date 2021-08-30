/* eslint-disable react/prop-types */
import {InfoIcon, WarningIcon} from '@chakra-ui/icons'
import {
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
  useTheme,
} from '@chakra-ui/react'
import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useQuery} from 'react-query'
import {getFlip, getFlipCache} from '../../shared/api/self'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  ErrorAlert,
  Skeleton,
  Spinner,
  SuccessAlert,
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
import {useAuthState} from '../../shared/providers/auth-context'
import {useTestValidationDispatch} from '../../shared/providers/test-validation-context'
import {
  AnswerType,
  CertificateActionType,
  CertificateType,
} from '../../shared/types'
import {reorderList} from '../../shared/utils/arr'
import {keywords} from '../../shared/utils/keywords'
import {capitalize} from '../../shared/utils/string'
import {toBlob} from '../../shared/utils/utils'

function CertificateCardPanelItem({name, value}) {
  return (
    <Flex direction="column">
      <Text color="muted">{name}</Text>
      <Text fontSize="base" fontWeight={500}>
        {value}
      </Text>
    </Flex>
  )
}

function GetColor(type) {
  switch (type) {
    case CertificateType.Beginner:
      return 'red.500'
    case CertificateType.Master:
      return 'gray.500'
    case CertificateType.Expert:
      return 'orange.500'
    default:
      return 'red.500'
  }
}

export function CertificateCard({
  id,
  title,
  description,
  type,
  actionType,
  ...props
}) {
  const {t} = useTranslation()
  const {coinbase} = useAuthState()
  const [waiting, setWaiting] = useState(false)

  const {scheduleValidation} = useTestValidationDispatch()

  const schedule = async () => {
    try {
      setWaiting(true)
      await scheduleValidation(type, coinbase)
    } catch (e) {
      console.error(e)
    } finally {
      setWaiting(false)
    }
  }

  const color = GetColor(type)

  return (
    <Flex
      alignSelf="stretch"
      direction="column"
      shadow="0 3px 12px 0 rgba(83, 86, 92, 0.1), 0 2px 3px 0 rgba(83, 86, 92, 0.2)"
      p={10}
      borderRadius="lg"
      borderTop="4px solid"
      borderTopColor={color}
      {...props}
    >
      <Flex alignItems="center" mb={2}>
        <CertificateStarIcon boxSize={4} color={color} />
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
      <Flex
        bg="gray.50"
        px={6}
        py={5}
        mt={6}
        mb={2}
        rounded="lg"
        justifyContent="space-between"
      >
        <CertificateCardPanelItem name={t('Schedule')} value="Immediately" />
        <CertificateCardPanelItem name={t('Trust level')} value="Low" />
      </Flex>
      {actionType === CertificateActionType.None && (
        <Flex mt={4}>
          <PrimaryButton
            ml="auto"
            onClick={() => schedule()}
            isLoading={waiting}
            loadingText={t('Scheduling...')}
          >
            {t('Schedule')}
          </PrimaryButton>
        </Flex>
      )}
      {actionType === CertificateActionType.Passed && (
        <>
          <SuccessAlert>
            <Flex justifyContent="space-between" flex={1}>
              <Box>{t('Passed successfully')}</Box>
              <Box>
                <TextLink
                  href="/try/details/[id]"
                  as={`/try/details/${id}`}
                  color="green.500"
                >
                  Details
                </TextLink>
              </Box>
            </Flex>
          </SuccessAlert>
          <Flex mt={6}>
            <Flex ml="auto" alignItems="center">
              <TextLink
                href="/certificate/[id]"
                as={`/certificate/${id}`}
                fontWeight={500}
                mr={4}
                target="_blank"
              >
                <CertificateIcon boxSize={5} mr={1} />
                {t('Show certificate')}
              </TextLink>
              <Divider borderColor="gray.100" orientation="vertical" mr={4} />
              <SecondaryButton
                onClick={() => schedule()}
                isLoading={waiting}
                loadingText={t('Scheduling...')}
              >
                {t('Retry')}
              </SecondaryButton>
            </Flex>
          </Flex>
        </>
      )}
      {actionType === CertificateActionType.Failed && (
        <>
          <ErrorAlert>
            <Flex justifyContent="space-between" flex={1}>
              <Box>{t('Validation failed!')}</Box>
              <Box>
                <TextLink
                  href="/try/details/[id]"
                  as={`/try/details/${id}`}
                  color="red.500"
                >
                  Details
                </TextLink>
              </Box>
            </Flex>
          </ErrorAlert>
          <Flex mt={6}>
            <Flex ml="auto">
              <SecondaryButton
                onClick={() => schedule()}
                isLoading={waiting}
                loadingText={t('Scheduling...')}
              >
                {t('Retry')}
              </SecondaryButton>
            </Flex>
          </Flex>
        </>
      )}
      {actionType === CertificateActionType.Requested && (
        <Flex
          align="center"
          borderWidth="1px"
          borderColor="gray.200"
          fontWeight={500}
          rounded="md"
          bg="gray.50"
          p={2}
        >
          <TimerIcon boxSize={4} color="muted" ml={1} mr={2} />
          <Text>{t('Test was requested...')}</Text>
        </Flex>
      )}
    </Flex>
  )
}

export function FlipsTh(props) {
  return (
    <Th
      textTransform="none"
      fontSize="md"
      fontWeight={400}
      color="muted"
      py={2}
      px={3}
      borderBottom="none"
      letterSpacing={0}
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
    <Stack flex={1}>
      <Flex color="muted">{title}</Flex>
      <Flex
        fontSize="base"
        fontWeight="500"
        color={isFailed ? 'red.500' : 'black'}
      >
        {isLoading ? <Skeleton mt={1} h={5} w={8} /> : value}
      </Flex>
    </Stack>
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
            {hash}
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
        <Text color="gray.500" fontWeight={500}>
          {isLoading ? (
            <Skeleton h={5} w={20} />
          ) : (
            capitalize(keywords[words[0]].name)
          )}
        </Text>
        <Text color="muted" mt={1 / 2}>
          {!isLoading && capitalize(keywords[words[0]].desc)}
        </Text>
        <Text color="gray.500" fontWeight={500} mt={3}>
          {isLoading ? (
            <Skeleton h={5} w={20} />
          ) : (
            capitalize(keywords[words[1]].name)
          )}
        </Text>
        <Text color="muted" mt={1 / 2}>
          {!isLoading && capitalize(keywords[words[1]].desc)}
        </Text>
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
            {answer === AnswerType.Left ? t('Left') : t('Right')}
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
