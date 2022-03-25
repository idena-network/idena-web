/* eslint-disable react/prop-types */
import React, {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {
  Flex,
  Box,
  Text,
  Button,
  Divider,
  useBreakpointValue,
  useClipboard,
  useDisclosure,
} from '@chakra-ui/react'
import QRCode from 'qrcode.react'
import {saveAs} from 'file-saver'
import {useRouter} from 'next/router'
import {rem} from '../../shared/theme'
import SettingsLayout from './layout'
import {
  Dialog,
  DialogBody,
  DialogHeader,
  FormLabel,
  Input,
  PasswordInput,
} from '../../shared/components/components'
import {FlatButton} from '../../shared/components/button'
import {
  useAuthDispatch,
  useAuthState,
} from '../../shared/providers/auth-context'
import {LocaleSwitcher, Section} from '../../screens/settings/components'
import {useEpoch} from '../../shared/providers/epoch-context'
import {useNotificationDispatch} from '../../shared/providers/notification-context'
import {readValidationLogs} from '../../shared/utils/logs'
import {
  CopyIcon,
  PrivateKeyIcon,
  LogsIcon,
  AngleArrowBackIcon,
  OpenExplorerIcon,
} from '../../shared/components/icons'
import {useSuccessToast} from '../../shared/hooks/use-toast'
import {WideLink} from '../../screens/home/components'
import {PageTitleNew} from '../../screens/app/components'

function Settings() {
  const router = useRouter()
  const {t} = useTranslation()

  const [password, setPassword] = useState()
  const [showQR, setShowQR] = useState()
  const {
    isOpen: isOpenExportPKDialog,
    onOpen: onOpenExportPKDialog,
    onClose: onCloseExportPKDialog,
  } = useDisclosure()

  const [pk, setPk] = useState('')
  const {onCopy, hasCopied} = useClipboard(pk)

  const {exportKey} = useAuthDispatch()

  const size = useBreakpointValue(['lg', 'md'])
  const variantSecondary = useBreakpointValue(['secondaryFlat', 'secondary'])
  const variantPrimary = useBreakpointValue(['primaryFlat', 'primary'])
  const buttonWidth = useBreakpointValue(['100%', 'auto'])
  const successToast = useSuccessToast()

  const epochData = useEpoch()
  const {coinbase} = useAuthState()
  const {addError} = useNotificationDispatch()

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
            router.push('/')
          }}
        />
        <PageTitleNew mt={-2}>{t('Settings')}</PageTitleNew>
      </Box>
      <Language />
      <ExportPK
        display={['none', 'block']}
        onDialogOpen={onOpenExportPKDialog}
      />
      <ExportLogs display={['none', 'block']} getLogs={getLogs} />
      <Flex display={['flex', 'none']} direction="column" mt={6}>
        <MobileSettingsItem
          title={t('Node')}
          onClick={() => router.push('/settings/node')}
        />
        <MobileSettingsItem
          title={t('Affiliate program')}
          onClick={() => router.push('/settings/affiliate')}
          mb={6}
        />
        <WideLink
          label={t('Export my private key')}
          onClick={onOpenExportPKDialog}
        >
          <Box boxSize={8} backgroundColor="brandBlue.10" borderRadius="10px">
            <PrivateKeyIcon fill="#578FFF" boxSize={5} mt="6px" ml="6px" />
          </Box>
        </WideLink>
        <WideLink label={t('Export validation logs')} onClick={getLogs}>
          <Box boxSize={8} backgroundColor="brandBlue.10" borderRadius="10px">
            <OpenExplorerIcon boxSize={5} mt="6px" ml="6px" />
          </Box>
        </WideLink>
      </Flex>

      <Dialog
        size="mdx"
        isOpen={isOpenExportPKDialog}
        onClose={onCloseExportPKDialog}
      >
        <DialogHeader>{t('Encrypted private key')}</DialogHeader>
        <DialogBody mb={0}>
          {!showQR ? (
            <form
              onSubmit={e => {
                e.preventDefault()
                const key = exportKey(password)
                setPk(key)
                setShowQR(true)
              }}
            >
              <Flex direction="column" align="flex-start">
                <Text fontSize="mdx" color="gray.300">
                  {t('Create a new password to export your private key')}
                </Text>
                <FormLabel
                  fontSize={['base', 'md']}
                  mt={5}
                  mb={3}
                  w={['auto', '100px']}
                  htmlFor="url"
                >
                  {t('New password')}
                </FormLabel>
                <PasswordInput
                  size={size}
                  value={password}
                  mr={[0, '15px']}
                  width="100%"
                  disabled={showQR}
                  onChange={e => setPassword(e.target.value)}
                />
              </Flex>
              <Flex mt={6} justify="flex-end">
                <Button
                  variant={variantSecondary}
                  size={size}
                  w={buttonWidth}
                  onClick={onCloseExportPKDialog}
                >
                  {t('Close')}
                </Button>
                <Button
                  variant={variantPrimary}
                  size={size}
                  ml={[0, 2]}
                  w={buttonWidth}
                  type="submit"
                  disabled={!password}
                >
                  {t('Export')}
                </Button>
              </Flex>
            </form>
          ) : (
            <Box>
              <Text>
                {t(
                  'Scan QR by your mobile phone or copy code below for export privatekey.'
                )}
              </Text>
              <Flex justify="center" mx="auto" my={8}>
                <QRCode value={pk} />
              </Flex>
              <Flex display={['none', 'flex']} justify="space-between">
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
              </Flex>
              <Flex
                width="100%"
                style={{marginBottom: rem(20), position: 'relative'}}
              >
                <Input
                  size={size}
                  value={pk}
                  width="100%"
                  pr={[10, 0]}
                  disabled
                />
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
              </Flex>
              <Flex justify="flex-end">
                <Button
                  variant={variantSecondary}
                  size={size}
                  w={buttonWidth}
                  onClick={() => {
                    setPassword('')
                    setShowQR(false)
                    onCloseExportPKDialog()
                  }}
                >
                  {t('Close')}
                </Button>
              </Flex>
            </Box>
          )}
        </DialogBody>
      </Dialog>
    </SettingsLayout>
  )
}

function ExportLogs({getLogs, ...props}) {
  const {t} = useTranslation()

  return (
    <Section title={t('Logs')} w={['100%', '480px']} {...props}>
      <Divider />
      <Flex justify="space-between" align="center" py={6}>
        <Flex>
          <LogsIcon h={5} w={5} />
          <Text ml={3} fontSize="mdx" fontWeight={500}>
            {t('Validation logs')}
          </Text>
        </Flex>
        <Flex align="center">
          <Button variant="link" color="blue.500" onClick={getLogs}>
            {t('Export')}
          </Button>
        </Flex>
      </Flex>
      <Divider />
    </Section>
  )
}

function Language(props) {
  const {t} = useTranslation()

  return (
    <Section title={t('Interface')} w={['100%', '480px']} {...props}>
      <Flex alignItems="center">
        <Text color="muted" fontWeight="normal" w={32}>
          {t('Language')}
        </Text>
        <LocaleSwitcher />
      </Flex>
    </Section>
  )
}

function ExportPK({onDialogOpen, ...props}) {
  const {t} = useTranslation()

  return (
    <Section title={t('Private key')} w={['100%', '480px']} {...props}>
      <Divider display={['none', 'block']} />
      <Flex justify="space-between" align="center" py={6}>
        <Flex>
          <PrivateKeyIcon fill="#53565C" mr={2} h={5} w={5} />
          <Text ml={[0, 3]} fontSize="mdx" fontWeight={500}>
            {t('My private key')}
          </Text>
        </Flex>
        <Flex align="center">
          <Button variant="link" color="blue.500" onClick={onDialogOpen}>
            {t('Export')}
          </Button>
        </Flex>
      </Flex>
      <Divider display={['none', 'block']} />
    </Section>
  )
}

function MobileSettingsItem({title, ...props}) {
  return (
    <Box w="100%" {...props}>
      <Flex h={12} w="100%" align="center" justify="space-between">
        <Text fontSize="base" fontWeight={500}>
          {title}
        </Text>
        <AngleArrowBackIcon
          stroke="#D8D8D8"
          h={4}
          w={4}
          transform="rotate(180deg)"
        />
      </Flex>
      <Divider />
    </Box>
  )
}

export default Settings
