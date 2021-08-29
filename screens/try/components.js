/* eslint-disable react/prop-types */
import {
  Avatar,
  Box,
  Divider,
  Flex,
  Heading,
  Stack,
  Td,
  Text,
  Th,
} from '@chakra-ui/react'
import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useQuery} from 'react-query'
import {getFlipCache} from '../../shared/api/self'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {
  ErrorAlert,
  Skeleton,
  SuccessAlert,
  TextLink,
} from '../../shared/components/components'
import {
  CertificateIcon,
  CertificateStarIcon,
  EmptyFlipIcon,
  TimerIcon,
} from '../../shared/components/icons'
import {useAuthState} from '../../shared/providers/auth-context'
import {useTestValidationDispatch} from '../../shared/providers/test-validation-context'
import {CertificateActionType, CertificateType} from '../../shared/types'
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
                <TextLink href={`/try/details/${id}`} color="green.500">
                  Details
                </TextLink>
              </Box>
            </Flex>
          </SuccessAlert>
          <Flex mt={6}>
            <Flex ml="auto" alignItems="center">
              <TextLink
                href={`/certificate/${id}`}
                fontWeight={500}
                mr={4}
                target="_blank"
              >
                <CertificateIcon boxSize={5} mr={1} />
                {t('Show certificate')}
              </TextLink>
              {/* <IconButton
                icon={<CertificateIcon boxSize={5} />}
                onClick={() => router.push(`/certificate/${id}`)}
              >
                {t('Show certificate')}
              </IconButton> */}
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
                <TextLink href={`/try/details/${id}`} color="red.500">
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
