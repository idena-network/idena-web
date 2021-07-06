import React, {useState} from 'react'
import {margin} from 'polished'
import {useTranslation} from 'react-i18next'
import {Flex as ChakraFlex, Text, useClipboard} from '@chakra-ui/core'
import QRCode from 'qrcode.react'
import {saveAs} from 'file-saver'
import {Input, Label, Button} from '../../shared/components'
import theme, {rem} from '../../shared/theme'
import Flex from '../../shared/components/flex'
import SettingsLayout from './layout'
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  PasswordInput,
} from '../../shared/components/components'
import {FlatButton, SecondaryButton} from '../../shared/components/button'
import {
  useAuthDispatch,
  useAuthState,
} from '../../shared/providers/auth-context'
import {Section} from '../../screens/settings/components'
import {useEpoch} from '../../shared/providers/epoch-context'
import {useNotificationDispatch} from '../../shared/providers/notification-context'

function Settings() {
  return (
    <SettingsLayout>
      <ExportPK />
      <ExportLogs />
    </SettingsLayout>
  )
}

function ExportLogs() {
  const epochData = useEpoch()
  const {t} = useTranslation()
  const {coinbase} = useAuthState()

  const {addError} = useNotificationDispatch()

  const getLogs = () => {
    try {
      const name = `logs-validation-${epochData.epoch - 1}`
      const data = localStorage.getItem(name)

      const blob = new Blob([data], {
        type: 'text/plain;charset=utf-8',
      })
      saveAs(blob, `${name}-${coinbase}.txt`)
    } catch (e) {
      addError({title: 'Cannot export logs', body: e.message})
    }
  }

  return (
    <Section title={t('Validation logs')}>
      <Button onClick={getLogs}>{t('Export')}</Button>
    </Section>
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

export default Settings
