/* eslint-disable react/prop-types */
import {Divider, Flex, Heading, Text} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {
  IconButton,
  PrimaryButton,
  SecondaryButton,
} from '../../shared/components/button'
import {ErrorAlert, SuccessAlert} from '../../shared/components/components'
import {CertificateIcon, TimerIcon} from '../../shared/components/icons'
import {useAuthState} from '../../shared/providers/auth-context'
import {useTestValidationDispatch} from '../../shared/providers/test-validation-context'
import {CertificateActionType} from '../../shared/types'

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
  const router = useRouter()

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

  return (
    <Flex
      alignSelf="stretch"
      direction="column"
      shadow="0 3px 12px 0 rgba(83, 86, 92, 0.1), 0 2px 3px 0 rgba(83, 86, 92, 0.2)"
      p={10}
      borderRadius="lg"
      borderTop="4px solid"
      borderTopColor="red.500"
      {...props}
    >
      <Heading as="h2" fontSize="lg" fontWeight={500} lineHeight="short" mb={2}>
        {title}
      </Heading>
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
          <SuccessAlert>{t('Passed successfully')}</SuccessAlert>
          <Flex mt={6}>
            <Flex ml="auto">
              <IconButton
                icon={<CertificateIcon boxSize={5} />}
                onClick={() => router.push(`/certificate/${id}`)}
              >
                {t('Show certificate')}
              </IconButton>
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
          <ErrorAlert>{t('Validation failed!')}</ErrorAlert>
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
