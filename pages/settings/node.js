import React, {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Alert, AlertIcon, FormControl, Stack, useBreakpointValue, useMediaQuery} from '@chakra-ui/react'
import {Link} from '../../shared/components'
import theme, {rem} from '../../shared/theme'
import Flex from '../../shared/components/flex'
import SettingsLayout from './layout'
import {
  useSettingsState,
  useSettingsDispatch,
  apiKeyStates,
} from '../../shared/providers/settings-context'
import {useNotificationDispatch} from '../../shared/providers/notification-context'
import {
  FormLabel,
  Input,
  PasswordInput,
} from '../../shared/components/components'
import {PrimaryButton} from '../../shared/components/button'
import {checkKey, getProvider} from '../../shared/api'

const BASIC_ERROR = 'Node is unavailable.'

function Settings() {
  const {t} = useTranslation()
  const {addNotification} = useNotificationDispatch()
  const settingsState = useSettingsState()
  const {saveConnection} = useSettingsDispatch()

  const [isDesktop] = useMediaQuery('(min-width: 481px)')
  const size = useBreakpointValue(['lg', 'md'])
  const fontSize = useBreakpointValue(['16px', '13px'])

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
      <Stack spacing={5} mt={rem(20)} width={['100%', '480px']}>
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
              <AlertIcon
                name="info"
                color="red.500"
                size={5}
                mr={3}
              ></AlertIcon>
              {t(offlineError, {nsSeparator: 'null'})}
            </Alert>
          )}
        <FormControl>
          <Flex justify="space-between">
            <FormLabel fontSize={['base', 'md']} color="brandGray.500" mb={2}>
              {t('Shared node URL')}
            </FormLabel>
            <Flex>
              <Link
                href="/node/rent"
                color={theme.colors.primary}
                fontSize={fontSize}
                style={{fontWeight: 500}}
              >
                {t('Rent a new node')} {isDesktop && '>'}
              </Link>
            </Flex>
          </Flex>
          <Input
            id="url"
            size={size}
            value={state.url}
            onChange={e => setState({...state, url: e.target.value})}
          />
        </FormControl>
        <FormControl>
          <FormLabel fontSize={['base', 'md']} color="brandGray.500" mb={2}>
            {t('Node API key')}
          </FormLabel>
          <PasswordInput
            id="key"
            size={size}
            value={state.apiKey}
            onChange={e => setState({...state, apiKey: e.target.value})}
          ></PasswordInput>
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
