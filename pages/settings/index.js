import React, {useState} from 'react'
import {margin} from 'polished'
import {useTranslation} from 'react-i18next'
import {
  Flex as ChakraFlex,
  Box,
  Text,
  Button,
  useBreakpointValue,
  useClipboard,
} from '@chakra-ui/react'
import QRCode from 'qrcode.react'
import {saveAs} from 'file-saver'
import theme, {rem} from '../../shared/theme'
import Flex from '../../shared/components/flex'
import SettingsLayout from './layout'
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  FormLabel,
  Input,
  PasswordInput,
} from '../../shared/components/components'
import {FlatButton, PrimaryButton} from '../../shared/components/button'
import {
  useAuthDispatch,
  useAuthState,
} from '../../shared/providers/auth-context'
import {Section} from '../../screens/settings/components'
import {useEpoch} from '../../shared/providers/epoch-context'
import {useNotificationDispatch} from '../../shared/providers/notification-context'
import {readValidationLogs} from '../../shared/utils/logs'
import {CopyIcon} from '../../shared/components/icons'
import {useSuccessToast} from '../../shared/hooks/use-toast'

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

  const size = useBreakpointValue(['lg', 'md'])

  const getLogs = async () => {
    try {
      const epoch = epochData.epoch - 1

      const logs = await readValidationLogs(epoch)

      const blob = new Blob(
        [logs.map(x => `${x.timestamp} - ${JSON.stringify(x.log)}`).join('\n')],
        {
          type: 'text/plain;charset=utf-8',
        }
      )
      saveAs(blob, `validation-${epoch}-${coinbase}.txt`)
    } catch (e) {
      addError({title: 'Cannot export logs', body: e.message})
    }
  }

  return (
    <Section title={t('Validation logs')}>
      <PrimaryButton size={size} w={['100%', 'auto']} onClick={getLogs}>
        {t('Export')}
      </PrimaryButton>
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

  const size = useBreakpointValue(['lg', 'md'])
  const variantSecondary = useBreakpointValue(['secondaryFlat', 'secondary'])
  const justify = useBreakpointValue(['center', 'flex-end'])
  const inputWidth = useBreakpointValue(['100%', '300px'])
  const buttonWidth = useBreakpointValue(['100%', 'auto'])
  const successToast = useSuccessToast()

  return (
    <Section title={t('Export private key')}>
      <ChakraFlex
        justify={['center', 'flex-start']}
        textAlign={['center', 'start']}
        w={['100%', 'auto']}
      >
        <Box w={['80%', 'auto']}>
          <Text fontSize={['mdx', 'md']} mb={2}>
            {t('Create a new password to export your private key')}
          </Text>
        </Box>
      </ChakraFlex>
      <form
        onSubmit={e => {
          e.preventDefault()
          const key = exportKey(password)
          setPk(key)
          setShowDialog(true)
        }}
      >
        <ChakraFlex
          direction={['column', 'row']}
          align={['flex-start', 'center']}
        >
          <FormLabel
            fontSize={['base', 'md']}
            w={['auto', '100px']}
            htmlFor="url"
          >
            {t('New password')}
          </FormLabel>
          <PasswordInput
            size={size}
            value={password}
            mr={[0, '15px']}
            width={inputWidth}
            disabled={showDialog}
            onChange={e => setPassword(e.target.value)}
          />
        </ChakraFlex>
        <Flex css={{marginTop: 10}}>
          <PrimaryButton
            size={size}
            ml={[0, '110px']}
            w={['100%', '100px']}
            type="submit"
            disabled={!password}
          >
            {t('Export')}
          </PrimaryButton>
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
          <ChakraFlex display={['none', 'flex']} justify="space-between">
            <FormLabel style={{fontSize: rem(13)}}>
              Your encrypted private key
            </FormLabel>
            {hasCopied ? (
              <FormLabel style={{fontSize: rem(13)}}>Copied!</FormLabel>
            ) : (
              <FlatButton onClick={onCopy} marginBottom={rem(10)}>
                Copy
              </FlatButton>
            )}
          </ChakraFlex>
          <ChakraFlex
            width="100%"
            style={{marginBottom: rem(20), position: 'relative'}}
          >
            <Input size={size} value={pk} width="100%" pr={[10, 0]} disabled />
            <Box
              display={['initial', 'none']}
              position="absolute"
              top={3}
              right={3}
            >
              <CopyIcon
                boxSize={6}
                fill="muted"
                opacity="0.4"
                onClick={() => {
                  onCopy()
                  successToast({
                    title: 'Private key copied!',
                    duration: '5000',
                  })
                }}
              />
            </Box>
          </ChakraFlex>
        </DialogBody>
        <DialogFooter justifyContent={justify}>
          <Button
            variant={variantSecondary}
            size={size}
            w={buttonWidth}
            onClick={() => setShowDialog(false)}
          >
            {t('Close')}
          </Button>
        </DialogFooter>
      </Dialog>
    </Section>
  )
}

export default Settings
