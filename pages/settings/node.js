import React, {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Alert, AlertIcon, FormControl, Stack} from '@chakra-ui/core'
import {Box, Label, Button, Link} from '../../shared/components'
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
import {Section} from '../../screens/settings/components'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {getKeyById, getProvider} from '../../shared/api'

function Settings() {
  const {t} = useTranslation()
  const {addNotification, addError} = useNotificationDispatch()
  const settingsState = useSettingsState()
  const {saveConnection, addPurchasedKey} = useSettingsDispatch()

  const [state, setState] = useState({
    url: settingsState.url || '',
    apiKey: settingsState.apiKey || '',
  })

  useEffect(() => {
    setState({url: settingsState.url, apiKey: settingsState.apiKey})
  }, [settingsState])

  const notify = () =>
    addNotification({
      title: 'Settings updated',
      body: `Connected to url ${state.url}`,
    })

  const restorePurchase = async () => {
    try {
      const result = await getKeyById(settingsState.apiKeyId)
      const provider = await getProvider(settingsState.apiKeyData.provider)
      addPurchasedKey(provider.data.url, result.key, result.epoch)
    } catch {
      addError({title: 'Restore failed. Please, try again.'})
    }
  }

  return (
    <SettingsLayout>
      <Stack spacing={5} mt={rem(20)} width={rem(480)}>
        {[apiKeyStates.EXPIRED, apiKeyStates.OFFLINE].includes(
          settingsState.apiKeyState
        ) && (
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
            {settingsState.apiKeyState === apiKeyStates.EXPIRED
              ? t(
                  'API key is expired. You can not use the node for the upcoming validation ceremony'
                )
              : t('Node is unreachable.')}
          </Alert>
        )}
        <FormControl>
          <Flex justify="space-between">
            <FormLabel color="brandGray.500" mb={2}>
              {t('Node address')}
            </FormLabel>
            <Flex>
              <Link
                href="/node/rent"
                color={theme.colors.primary}
                fontSize={rem(13)}
                style={{fontWeight: 500}}
              >
                Rent a new node {'>'}
              </Link>
            </Flex>
          </Flex>
          <Input
            id="url"
            value={state.url}
            onChange={e => setState({...state, url: e.target.value})}
          />
        </FormControl>
        <FormControl>
          <FormLabel color="brandGray.500" mb={2}>
            {t('Node API key')}
          </FormLabel>
          <PasswordInput
            id="key"
            value={state.apiKey}
            onChange={e => setState({...state, apiKey: e.target.value})}
          ></PasswordInput>
        </FormControl>

        <Flex justify="space-between">
          {settingsState.apiKeyId && (
            <SecondaryButton onClick={restorePurchase}>
              {t('Restore purchase')}
            </SecondaryButton>
          )}
          <PrimaryButton
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
