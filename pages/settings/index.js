import React, {useState} from 'react'
import {margin, padding, borderRadius} from 'polished'
import {useTranslation} from 'react-i18next'
import {FiEye, FiEyeOff} from 'react-icons/fi'
import {Box, SubHeading, Input, Label, Button} from '../../shared/components'
import theme, {rem} from '../../shared/theme'
import Flex from '../../shared/components/flex'
import SettingsLayout from './layout'
import {
  useSettingsState,
  useSettingsDispatch,
} from '../../shared/providers/settings-context'
import {useNotificationDispatch} from '../../shared/providers/notification-context'

function Settings() {
  const {t} = useTranslation()
  const {addNotification} = useNotificationDispatch()
  const settingsState = useSettingsState()
  const {saveConnection} = useSettingsDispatch()
  const [state, setState] = useState({
    url: settingsState.url,
    apiKey: settingsState.apiKey,
  })

  const notify = () =>
    addNotification({
      title: 'Settings updated',
      body: `Connected to url ${state.url}`,
    })

  const [revealApiKey, setRevealApiKey] = useState(false)
  return (
    <SettingsLayout>
      <Section title={t('Node')}>
        <Box py={theme.spacings.xlarge}>
          <Flex align="center">
            <Label htmlFor="url" style={{width: 120}}>
              {t('Node address')}
            </Label>
            <Input
              id="url"
              value={state.url}
              onChange={e => setState({...state, url: e.target.value})}
              style={{
                ...margin(0, theme.spacings.normal, 0, theme.spacings.small),
                width: rem(300),
              }}
            />
          </Flex>
          <Flex align="center" css={{marginTop: 10}}>
            <Label htmlFor="key" style={{width: 120}}>
              {`${t('Node api key')} `}
            </Label>
            <Box style={{position: 'relative'}}>
              <Input
                id="key"
                value={state.apiKey}
                type={revealApiKey ? 'text' : 'password'}
                onChange={e => setState({...state, apiKey: e.target.value})}
                style={{
                  ...margin(0, theme.spacings.normal, 0, theme.spacings.small),
                  width: rem(300),
                }}
              ></Input>
              <Box
                style={{
                  background: theme.colors.gray2,
                  ...borderRadius('right', rem(6)),
                  cursor: 'pointer',
                  fontSize: rem(20),
                  position: 'absolute',
                  ...padding(0, rem(8)),
                  top: 0,
                  height: '100%',
                  right: '12px',
                }}
                onClick={() => setRevealApiKey(!revealApiKey)}
              >
                {revealApiKey ? (
                  <FiEyeOff style={{transform: 'translate(0, 50%)'}} />
                ) : (
                  <FiEye style={{transform: 'translate(0, 50%)'}} />
                )}
              </Box>
            </Box>
          </Flex>
          <Flex css={{marginTop: 10}}>
            <Button
              css={{marginLeft: 126, width: 100}}
              onClick={() => {
                saveConnection(state.url, state.apiKey)
                notify()
              }}
            >
              {t('Save')}
            </Button>
          </Flex>
        </Box>
      </Section>
    </SettingsLayout>
  )
}

// eslint-disable-next-line react/prop-types
function Section({title, children}) {
  return (
    <Box my={rem(theme.spacings.medium32)}>
      <SubHeading css={margin(0, 0, theme.spacings.small, 0)}>
        {title}
      </SubHeading>
      <Box my={rem(theme.spacings.small8)}>{children}</Box>
    </Box>
  )
}

export default Settings
