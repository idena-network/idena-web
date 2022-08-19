import React, {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {
  Alert,
  AlertIcon,
  Box,
  Flex,
  Text,
  FormControl,
  Heading,
  Stack,
  useBreakpointValue,
} from '@chakra-ui/react'
import SettingsLayout from './layout'
import {
  useSettingsState,
  useSettingsDispatch,
  ApiKeyStates,
} from '../../shared/providers/settings-context'
import {useNotificationDispatch} from '../../shared/providers/notification-context'
import {
  FormLabel,
  Input,
  PasswordInput,
} from '../../shared/components/components'
import {PrimaryButton} from '../../shared/components/button'
import {checkKey, getProvider} from '../../shared/api'
import {Link} from '../../shared/components'
import {ChevronDownIcon} from '../../shared/components/icons'

function Settings() {
  const {t} = useTranslation()
  const {addNotification} = useNotificationDispatch()
  const settingsState = useSettingsState()
  const {saveConnection} = useSettingsDispatch()

  const size = useBreakpointValue(['lg', 'md'])
  const flexDirection = useBreakpointValue(['column', 'row'])
  const flexJustify = useBreakpointValue(['flex-start', 'space-between'])

  const [state, setState] = useState({
    url: settingsState.url || '',
    apiKey: settingsState.apiKey || '',
  })

  const [nodeProvider, setNodeProvider] = useState('')

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
        setNodeProvider(provider.data.ownerName)
        // eslint-disable-next-line no-empty
      } catch (e) {}
    }

    if (settingsState.apiKeyState === ApiKeyStates.OFFLINE) check()
  }, [settingsState.apiKeyState, settingsState.url, settingsState.apiKey])

  return (
    <SettingsLayout title={t('Node')}>
      <Stack
        spacing={5}
        mt={[3, 8]}
        width={['100%', '480px']}
        position="relative"
      >
        {settingsState.apiKeyState === ApiKeyStates.RESTRICTED && (
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
        {settingsState.apiKeyState === ApiKeyStates.OFFLINE &&
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
              <Text>
                {nodeProvider
                  ? t(
                      'This node is unavailable. Please contact the node owner:',
                      {
                        nsSeparator: 'null',
                      }
                    )
                  : t('Node is unavailable.')}{' '}
                {nodeProvider && (
                  <Link
                    color="#578fff"
                    href={`https://t.me/${nodeProvider}`}
                    target="_blank"
                    ml={1}
                  >
                    {nodeProvider}
                  </Link>
                )}
              </Text>
            </Alert>
          )}
        <Flex display={['none', 'flex']} justify="space-between">
          <Heading as="h1" fontSize="lg" fontWeight={500} textAlign="start">
            {t('Node settings')}
          </Heading>
          <Box mt="3px">
            <Link
              color="#578fff"
              fontSize="13px"
              fontWeight="500"
              height="17px"
              href="/node/rent"
            >
              {t('Rent a new node')}
              <ChevronDownIcon boxSize={4} transform="rotate(-90deg)" />
            </Link>
          </Box>
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
            <Box display={['block', 'none']}>
              <Link
                fontSize="16px"
                fontWeight="500"
                color="#578fff"
                href="/node/rent"
              >
                {t('Rent a new node')}
              </Link>
            </Box>
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

        {settingsState.apiKeyState === ApiKeyStates.ONLINE && (
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
              saveConnection(state.url, state.apiKey, true)
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
