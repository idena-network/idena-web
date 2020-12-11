import React, {useEffect, useState} from 'react'
import {margin} from 'polished'
import {useTranslation} from 'react-i18next'
import {Flex as ChakraFlex, Text, useClipboard} from '@chakra-ui/core'
import QRCode from 'qrcode.react'
import {Box, SubHeading, Input, Label, Button} from '../../shared/components'
import theme, {rem} from '../../shared/theme'
import Flex from '../../shared/components/flex'
import SettingsLayout from './layout'
import {
  useSettingsState,
  useSettingsDispatch,
} from '../../shared/providers/settings-context'
import {useNotificationDispatch} from '../../shared/providers/notification-context'
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  PasswordInput,
} from '../../shared/components/components'
import {FlatButton, SecondaryButton} from '../../shared/components/button'
import {useAuthDispatch} from '../../shared/providers/auth-context'

function Settings() {
  const {t} = useTranslation()
  const {addNotification} = useNotificationDispatch()
  const settingsState = useSettingsState()
  const {saveConnection} = useSettingsDispatch()
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
                width: rem(300),
              }}
            />
          </Flex>
          <Flex align="center" css={{marginTop: 10}}>
            <Label htmlFor="key" style={{width: 120}}>
              {`${t('Node api key')} `}
            </Label>
            <Box style={{position: 'relative'}}>
              <PasswordInput
                id="key"
                value={state.apiKey}
                width={rem(300)}
                onChange={e => setState({...state, apiKey: e.target.value})}
              ></PasswordInput>
            </Box>
          </Flex>
          <Flex css={{marginTop: 10}}>
            <Button
              css={{marginLeft: 120, width: 100}}
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
      <ExportPK />
    </SettingsLayout>
  )
}

function ExportPK() {
  const {t} = useTranslation()

  const [password, setPassword] = useState()
  const [showDialog, setShowDialog] = useState()

  const [pk, setPk] = useState('')
  const {onCopy, hasCopied} = useClipboard(pk)

  const {exportKey} = useAuthDispatch()

  return (
    <Section title={t('Export private key')}>
      <Text mb={2}>
        {t('Create a new password to export your private key')}
      </Text>
      <form
        onSubmit={e => {
          e.preventDefault()
          const key = exportKey(password)
          setPk(key)
          setShowDialog(true)
        }}
      >
        <Flex align="center">
          <Label htmlFor="url" style={{width: 120}}>
            {t('New password')}
          </Label>
          <PasswordInput
            value={password}
            width={rem(300)}
            style={{
              ...margin(0, theme.spacings.normal, 0, 0),
            }}
            disabled={showDialog}
            onChange={e => setPassword(e.target.value)}
          />
        </Flex>
        <Flex css={{marginTop: 10}}>
          <Button
            css={{marginLeft: 120, width: 100}}
            type="submit"
            disabled={!password}
          >
            {t('Export')}
          </Button>
        </Flex>
      </form>
      <Dialog isOpen={showDialog} onClose={() => setShowDialog(false)}>
        <DialogHeader>{t('Encrypted private key')}</DialogHeader>
        <DialogBody>
          <Text>
            {t(
              'Scan QR by your mobile phone or copy code below for export privatekey.'
            )}
          </Text>
          <ChakraFlex justify="center" mx="auto" my={8}>
            <QRCode value={pk} />
          </ChakraFlex>
          <ChakraFlex justify="space-between">
            <Label style={{fontSize: rem(13)}}>
              Your encrypted private key
            </Label>
            {hasCopied ? (
              <Label style={{fontSize: rem(13)}}>Copied!</Label>
            ) : (
              <FlatButton
                color={theme.colors.primary}
                onClick={onCopy}
                style={{
                  fontSize: rem(13),
                  marginBottom: rem(10),
                  textAlign: 'center',
                }}
              >
                Copy
              </FlatButton>
            )}
          </ChakraFlex>
          <ChakraFlex
            width="100%"
            style={{marginBottom: rem(20), position: 'relative'}}
          >
            <Input value={pk} width="100%" disabled />
          </ChakraFlex>
        </DialogBody>
        <DialogFooter>
          <SecondaryButton onClick={() => setShowDialog(false)}>
            {t('Close')}
          </SecondaryButton>
        </DialogFooter>
      </Dialog>
    </Section>
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
