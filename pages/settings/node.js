import React, {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {
  Alert,
  AlertIcon,
  Box,
  Flex,
  FormControl,
  Heading,
  Link,
  Stack,
  useBreakpointValue,
} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import SettingsLayout from './layout'
import {
  useSettingsState,
  useSettingsDispatch,
  apiKeyStates,
} from '../../shared/providers/settings-context'
import {useNotificationDispatch} from '../../shared/providers/notification-context'
import {
  ExternalLink,
  FormLabel,
  Input,
  PasswordInput,
} from '../../shared/components/components'
import {PrimaryButton} from '../../shared/components/button'
import {checkKey, getProvider} from '../../shared/api'
import {AngleArrowBackIcon} from '../../shared/components/icons'
import {PageTitleNew} from '../../screens/app/components'
import {useIsDesktop} from '../../shared/utils/utils'

const BASIC_ERROR = 'Node is unavailable.'

function Settings() {
  const router = useRouter()
  const {t} = useTranslation()
  const {addNotification} = useNotificationDispatch()
  const settingsState = useSettingsState()
  const {saveConnection} = useSettingsDispatch()

  const size = useBreakpointValue(['lg', 'md'])
  const fontSize = useBreakpointValue(['16px', '13px'])
  const flexDirection = useBreakpointValue(['column', 'row'])
  const flexJustify = useBreakpointValue(['flex-start', 'space-between'])

  const isDesktop = useIsDesktop()
  const ComponentLink = isDesktop ? ExternalLink : Link

  const [state, setState] = useState({
    url: settingsState.url || '',
    apiKey: settingsState.apiKey || '',
  })

  const [offlineError, setOfflineError] = useState(BASIC_ERROR)

  useEffect(() => {
    setState({url: settingsState.url, apiKey: settingsState.apiKey})
  }, [settingsState])

  const notify = () =>
    addNotification({
      title: 'Settings updated',
      body: `Connected to url ${state.url}`,
    })

  useEffect(() => {
    async function check() {
      try {
        const result = await checkKey(settingsState.apiKey)
        const provider = await getProvider(result.provider)
        setOfflineError(
          `This node is unavailable. Please contact the node owner: ${provider.data.ownerName}`
        )
      } catch (e) {
        setOfflineError(BASIC_ERROR)
      }
    }

    if (settingsState.apiKeyState === apiKeyStates.OFFLINE) check()
    else setOfflineError('')
  }, [settingsState.apiKeyState, settingsState.url, settingsState.apiKey])

  return (
    <SettingsLayout>
      <Box display={['block', 'none']}>
        <AngleArrowBackIcon
          stroke="#578FFF"
          position="absolute"
          left={4}
          top={4}
          h="28px"
          w="28px"
          onClick={() => {
            router.push('/settings')
          }}
        />
        <PageTitleNew mt={-2}>{t('Node')}</PageTitleNew>
      </Box>
      <Stack
        spacing={5}
        mt={[3, 8]}
        width={['100%', '480px']}
        position="relative"
      >
        {settingsState.apiKeyState === apiKeyStates.RESTRICTED && (
          <Alert
            status="error"
            bg="red.010"
            borderWidth="1px"
            borderColor="red.050"
            fontWeight={500}
            rounded="md"
            px={3}
            py={2}
          >
            <AlertIcon name="info" color="red.500" size={5} mr={3}></AlertIcon>
            {t(
              'The shared node access is restricted. You cannot use the node for the upcoming validation ceremony.'
            )}
          </Alert>
        )}
        {settingsState.apiKeyState === apiKeyStates.OFFLINE &&
          !!settingsState.url &&
          !!settingsState.apiKey && (
            <Alert
              status="error"
              bg="red.010"
              borderWidth="1px"
              borderColor="red.050"
              fontWeight={500}
              rounded="md"
              px={3}
              py={2}
            >
              <AlertIcon name="info" color="red.500" size={5} mr={3} />
              {t(offlineError, {nsSeparator: 'null'})}
            </Alert>
          )}
        <Flex display={['none', 'flex']} justify="space-between">
          <Heading as="h1" fontSize="lg" fontWeight={500} textAlign="start">
            {t('Node settings')}
          </Heading>
          <ExternalLink
            height={6}
            href="/node/rent"
          >
            {t('Rent a new node')}
          </ExternalLink>
        </Flex>
        <FormControl
          as={Flex}
          direction={flexDirection}
          justify={flexJustify}
          mt={[0, 5]}
        >
          <Flex justify="space-between">
            <FormLabel
              fontSize={['base', 'md']}
              color={['brandGray.500', 'muted']}
              fontWeight={[500, 400]}
              mb={[2, 0]}
              lineHeight={[6, 8]}
            >
              {t('Shared node URL')}
            </FormLabel>
            <Link
              display={['block', 'none']}
              fontSize={['base', 'md']}
              fontWeight={500}
              color="brandBlue.500"
              href="/node/rent"
            >
              {t('Rent a new node')}
            </Link>
          </Flex>
          <Input
            id="url"
            w={['100%', '360px']}
            size={size}
            value={state.url}
            onChange={e => setState({...state, url: e.target.value})}
          />
        </FormControl>
        <FormControl as={Flex} direction={flexDirection} justify={flexJustify}>
          <FormLabel
            fontSize={['base', 'md']}
            color={['brandGray.500', 'muted']}
            fontWeight={[500, 400]}
            mb={[2, 0]}
            lineHeight={[6, 8]}
          >
            {t('Node API key')}
          </FormLabel>
          <PasswordInput
            id="key"
            w={['100%', '360px']}
            size={size}
            value={state.apiKey}
            onChange={e => setState({...state, apiKey: e.target.value})}
          />
        </FormControl>

        {settingsState.apiKeyState === apiKeyStates.ONLINE && (
          <Alert
            status="warning"
            bg="warning.020"
            borderWidth="1px"
            borderColor="warning.100"
            fontWeight={500}
            rounded="md"
            px={3}
            py={2}
          >
            <AlertIcon size={5} mr={3} colo="warning.500"></AlertIcon>
            {t(
              'Please do not use the API key on multiple devices at the same time as this will cause the validation failure.'
            )}
          </Alert>
        )}

        <Flex justify="space-between">
          <PrimaryButton
            size={size}
            w={['100%', 'auto']}
            onClick={() => {
              saveConnection(state.url, state.apiKey)
              notify()
            }}
            ml="auto"
          >
            {t('Save')}
          </PrimaryButton>
        </Flex>
      </Stack>
    </SettingsLayout>
  )
}

export default Settings
