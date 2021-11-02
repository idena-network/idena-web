/* eslint-disable react/prop-types */
import * as React from 'react'
import {
  Box,
  Flex,
  Stack,
  Text,
  Link,
  FormControl,
  Alert,
  AlertIcon,
  AlertTitle,
  Divider,
} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {
  ExclamationMarkIcon,
  InfoIcon,
  LaptopIcon,
} from '../../shared/components/icons'
import {
  appendTxHash,
  DNA_SEND_CONFIRM_TRESHOLD,
  handleCallbackUrl,
  isValidUrl,
} from './utils'
import {callRpc} from '../../shared/utils/utils'
import {bufferToHex} from '../../shared/utils/string'
import {useIdentity} from '../../shared/providers/identity-context'
import {
  Avatar,
  Dialog,
  DialogBody,
  DialogFooter,
  ExternalLink,
  FormLabel,
  Input,
  Tooltip,
} from '../../shared/components/components'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {Transaction} from '../../shared/models/transaction'

export function DnaDialogStat({label, value, children, ...props}) {
  return (
    <Stack
      isInline
      spacing={4}
      align="center"
      justify="space-between"
      bg="gray.50"
      px={5}
      py={4}
      {...props}
    >
      <Box>
        {label && <Text color="muted">{label}</Text>}
        {value && <Text wordBreak="break-all">{value}</Text>}
      </Box>
      {children}
    </Stack>
  )
}

export function DnaAppUrl({url}) {
  const {t} = useTranslation()
  return (
    <Stack
      isInline
      align="center"
      spacing={3}
      color="muted"
      px={2}
      py={1.5}
      mt={16}
    >
      <LaptopIcon name="laptop" boxSize={5} />
      <Link href={url}>{t('Open in Idena app')}</Link>
    </Stack>
  )
}

export function DnaSendDialog({
  address: to,
  balance,
  amount,
  comment,
  callbackUrl,
  callbackFormat,
  onDepositSuccess,
  onDepositError,
  onSendTxFailed,
  onClose,
  ...props
}) {
  const {t} = useTranslation()

  const [{address: from}] = useIdentity()

  const shouldConfirmTx = React.useMemo(
    () => amount / balance > DNA_SEND_CONFIRM_TRESHOLD,
    [amount, balance]
  )

  const [confirmationAmount, setConfirmationAmount] = React.useState()

  const areSameAmounts = React.useMemo(() => +confirmationAmount === +amount, [
    amount,
    confirmationAmount,
  ])

  const isExceededBalance = React.useMemo(() => +amount > balance, [
    amount,
    balance,
  ])

  const [isSubmitting, setIsSubmitting] = React.useState()

  return (
    <Dialog title={t('Confirm transfer')} onClose={onClose} {...props}>
      <DialogBody>
        <DnaDialogSubtitle>
          {t(
            `You’re about to send iDNA from your wallet to the following address`
          )}
        </DnaDialogSubtitle>
        <DnaDialogAlert>
          {t(`Attention! This is irreversible operation`)}
        </DnaDialogAlert>
        <DnaDialogDetails>
          <DnaDialogPanel>
            <PanelRow>
              <Box mr={2}>
                <DnaDialogPanelLabel>{t('To')}</DnaDialogPanelLabel>
                <DnaDialogPanelValue>{to}</DnaDialogPanelValue>
              </Box>
              <PanelMediaCell>
                <Address address={to} />
              </PanelMediaCell>
            </PanelRow>
          </DnaDialogPanel>
          <DnaDialogPanelDivider />
          <DnaDialogPanel>
            <DnaDialogPanelLabel>{t('Amount')}, iDNA</DnaDialogPanelLabel>
            <DnaDialogPanelValue
              color={isExceededBalance ? 'red.500' : 'brandGray.500'}
            >
              <PanelRow justify="flex-start">
                <Box mr={1}>{amount}</Box>
                <Box mt="1/2" lineHeight="shorter">
                  {isExceededBalance && (
                    <Tooltip
                      label={t('The amount is larger than your balance')}
                    >
                      <ExclamationMarkIcon boxSize={4} color="red.500" />
                    </Tooltip>
                  )}
                </Box>
              </PanelRow>
            </DnaDialogPanelValue>
          </DnaDialogPanel>
          <DnaDialogPanelDivider />
          <DnaDialogPanel
            label={`${t('Available balance')}, iDNA`}
            value={balance}
          />
          <DnaDialogPanelDivider />
          <DnaDialogPanel label={t('Comment')} value={comment} />
        </DnaDialogDetails>
        {shouldConfirmTx && (
          <FormControl mt={5}>
            <FormLabel style={{fontWeight: 500}}>
              {t('Enter amount to confirm transfer')}
            </FormLabel>
            <Input
              isDisabled={isExceededBalance}
              value={confirmationAmount}
              onChange={e => setConfirmationAmount(e.target.value)}
            />
            {Number.isFinite(+confirmationAmount) && !areSameAmounts && (
              <AlertText>
                {t('Entered amount does not match target amount')}
              </AlertText>
            )}
          </FormControl>
        )}
      </DialogBody>
      <DnaDialogFooter>
        <SecondaryButton onClick={onClose}>{t('Cancel')}</SecondaryButton>
        <PrimaryButton
          isDisabled={isExceededBalance || (shouldConfirmTx && !areSameAmounts)}
          isLoading={isSubmitting}
          onClick={async () => {
            new Promise((resolve, reject) => {
              if (shouldConfirmTx) {
                return areSameAmounts
                  ? resolve()
                  : reject(
                      new Error(
                        t('Entered amount does not match target amount')
                      )
                    )
              }
              return resolve()
            })
              .then(() => setIsSubmitting(true))
              .then(() =>
                callRpc('dna_sendTransaction', {
                  from,
                  to,
                  amount,
                  payload: bufferToHex(new TextEncoder().encode(comment)),
                })
              )
              .then(async hash => {
                if (isValidUrl(callbackUrl)) {
                  const callbackUrlWithHash = appendTxHash(callbackUrl, hash)

                  global.logger.info('Received dna://send cb url', callbackUrl)
                  global.logger.info(
                    'Append hash to cb url',
                    callbackUrlWithHash.href
                  )

                  await handleCallbackUrl(callbackUrlWithHash, callbackFormat, {
                    onJson: ({success, error, url}) => {
                      if (success) {
                        onDepositSuccess({hash, url})
                      } else {
                        onDepositError({
                          error:
                            error ??
                            t('{{url}} responded with an unknown format', {
                              url: callbackUrlWithHash.href,
                            }),
                          url: url ?? callbackUrlWithHash,
                        })
                      }
                    },
                    onHtml: ({url}) => onDepositSuccess({hash, url}),
                  })
                    .catch(error => {
                      global.logger.error(error)
                      onDepositError({
                        error: error?.message,
                        url: callbackUrlWithHash.href,
                      })
                    })
                    .finally(() => setIsSubmitting(false))
                } else {
                  setIsSubmitting(false)
                  global.logger.error('Invalid dna://send cb url', callbackUrl)
                }
              })
              .catch(({message}) => {
                setIsSubmitting(false)
                global.logger.error(message)
                onSendTxFailed(message)
              })
              .finally(onClose)
          }}
        >
          {t('Confirm')}
        </PrimaryButton>
      </DnaDialogFooter>
    </Dialog>
  )
}

export function DnaSendSucceededDialog({hash, url, ...props}) {
  const {t} = useTranslation()
  return (
    <Dialog closeOnOverlayClick={false} closeOnEsc={false} {...props}>
      <DialogBody color="brandGray.500">
        <Stack spacing={5}>
          <Alert
            status="success"
            bg="green.010"
            borderRadius="lg"
            flexDirection="column"
            justifyContent="center"
            height={132}
          >
            <Stack spacing={2} align="center">
              <AlertIcon size={8} mr={0} />
              <AlertTitle fontSize="lg" fontWeight={500}>
                {t('Successfully sent')}
              </AlertTitle>
            </Stack>
          </Alert>
          <Stack spacing={1}>
            <Stack spacing={1} py={2}>
              <Box color="muted">{t('Tx hash')}</Box>
              <Box wordBreak="break-all" fontWeight={500}>
                {hash}
              </Box>
            </Stack>
            <ExternalLink href={`https://scan.idena.io/transaction/${hash}`}>
              {t('Open in blockchain explorer')}
            </ExternalLink>
          </Stack>
        </Stack>
      </DialogBody>
      <DialogFooter>
        {url ? (
          <PrimaryButton
            onClick={() => {
              global.openExternal(url)
              props.onClose()
            }}
          >
            {t('Continue')}
          </PrimaryButton>
        ) : (
          // eslint-disable-next-line react/destructuring-assignment
          <PrimaryButton onClick={props.onClose}>{t('Close')}</PrimaryButton>
        )}
      </DialogFooter>
    </Dialog>
  )
}

export function DnaSendFailedDialog({
  error,
  url,
  onRetrySucceeded,
  onRetryFailed,
  ...props
}) {
  const {t} = useTranslation()
  return (
    <Dialog closeOnOverlayClick={false} closeOnEsc={false} {...props}>
      <DialogBody>
        <Stack spacing={5}>
          <Alert
            status="error"
            bg="red.010"
            borderRadius="lg"
            flexDirection="column"
            justifyContent="center"
            textAlign="center"
            minH={132}
          >
            <Stack align="center" spacing={1}>
              <AlertIcon name="delete" size={10} mr={0} />
              <Stack spacing={1}>
                <AlertTitle fontSize="lg" fontWeight={500}>
                  {t('Something went wrong')}
                </AlertTitle>
                <Text color="muted" wordBreak="break-all">
                  {error}
                </Text>
              </Stack>
            </Stack>
          </Alert>
        </Stack>
      </DialogBody>
      <DialogFooter>
        <SecondaryButton
          onClick={async () => {
            const requestedUrl = new URL(url)
            await handleCallbackUrl(url, 'json', {
              // eslint-disable-next-line no-shadow
              onJson: ({success, error, url}) => {
                if (success) {
                  onRetrySucceeded({
                    hash: requestedUrl.searchParams.get('tx'),
                    url: url ?? requestedUrl.href,
                  })
                } else {
                  onRetryFailed({
                    error:
                      error ??
                      t('{{url}} responded with an unknown format', {
                        url: requestedUrl.href,
                      }),
                    url: url ?? requestedUrl,
                  })
                }
              },
            }).catch(error => {
              global.logger.error(error)
              onRetryFailed({
                error: error?.message,
                url,
              })
            })
          }}
        >
          {t('Retry')}
        </SecondaryButton>
        <PrimaryButton
          onClick={() => {
            props.onClose()
            global.openExternal(url)
          }}
        >
          {t('Open in browser')}
        </PrimaryButton>
      </DialogFooter>
    </Dialog>
  )
}

export function DnaRawTxDialog({
  balance,
  tx,
  callbackUrl,
  callbackFormat,
  onClose,
  onSendSuccess,
  onSendError,
  onSendRawTxFailed,
  ...props
}) {
  const {t} = useTranslation()

  const {amount, to} = React.useMemo(() => {
    if (tx) {
      const {amount: txAmount, ...restTx} = new Transaction().fromHex(tx)
      return {amount: +txAmount / 10 ** 18, ...restTx}
    }
    return {amount: null, to: null}
  }, [tx])

  const [confirmationAmount, setConfirmationAmount] = React.useState()

  const shouldConfirmTx = React.useMemo(
    () => amount / balance > DNA_SEND_CONFIRM_TRESHOLD,
    [amount, balance]
  )

  const didConfirmAmount = React.useMemo(
    () => +confirmationAmount === +amount,
    [amount, confirmationAmount]
  )

  const isExceededBalance = React.useMemo(() => +amount > balance, [
    amount,
    balance,
  ])

  const [isSubmitting, setIsSubmitting] = React.useState()

  return (
    <Dialog m={0} title={t('Confirm transaction')} onClose={onClose} {...props}>
      <DialogBody>
        <DnaDialogSubtitle>
          {t('You’re about to sign and send tx from your wallet')}
        </DnaDialogSubtitle>
        <DnaDialogAlert>
          {t('Attention! This is irreversible operation')}
        </DnaDialogAlert>
        <DnaDialogDetails>
          <DnaDialogPanel>
            <PanelRow>
              <Box>
                <DnaDialogPanelLabel>{t('To')}</DnaDialogPanelLabel>
                <DnaDialogPanelValue>{to}</DnaDialogPanelValue>
              </Box>
              <PanelMediaCell>
                <Address address={to} />
              </PanelMediaCell>
            </PanelRow>
          </DnaDialogPanel>
          <DnaDialogPanelDivider />
          <DnaDialogPanel>
            <DnaDialogPanelLabel>{t('Amount')}, iDNA</DnaDialogPanelLabel>
            <DnaDialogPanelValue
              color={isExceededBalance ? 'red.500' : 'brandGray.500'}
            >
              <PanelRow justify="flex-start">
                <Box mr={1}>{amount}</Box>
                <Box mt="1/2" lineHeight="shorter">
                  {isExceededBalance && (
                    <Tooltip
                      label={t('The amount is larger than your balance')}
                    >
                      <ExclamationMarkIcon boxSize={4} color="red.500" />
                    </Tooltip>
                  )}
                </Box>
              </PanelRow>
            </DnaDialogPanelValue>
          </DnaDialogPanel>
          <DnaDialogPanelDivider />
          <DnaDialogPanel
            label={`${t('Available balance')}, iDNA`}
            value={balance}
          />
          <DnaDialogPanelDivider />
          <DnaDialogPanel label={t('Transaction details')}>
            <Tooltip label={tx} zIndex="tooltip" wordBreak="break-all">
              <Text
                display="-webkit-box"
                overflow="hidden"
                style={{
                  '-webkit-box-orient': 'vertical',
                  '-webkit-line-clamp': '2',
                }}
                wordBreak="break-all"
              >
                {tx}
              </Text>
            </Tooltip>
          </DnaDialogPanel>
        </DnaDialogDetails>
        {shouldConfirmTx && (
          <FormControl mt={5}>
            <FormLabel style={{fontWeight: 500}}>
              {t('Enter amount to confirm transfer')}
            </FormLabel>
            <Input
              disabled={isExceededBalance}
              value={confirmationAmount}
              onChange={e => setConfirmationAmount(e.target.value)}
            />
            {Number.isFinite(+confirmationAmount) && !didConfirmAmount && (
              <AlertText>
                {t('Entered amount does not match target amount')}
              </AlertText>
            )}
          </FormControl>
        )}
      </DialogBody>
      <DnaDialogFooter>
        <SecondaryButton onClick={onClose}>{t('Cancel')}</SecondaryButton>
        <PrimaryButton
          isDisabled={
            isExceededBalance || (shouldConfirmTx && !didConfirmAmount)
          }
          isLoading={isSubmitting}
          onClick={async () => {
            new Promise((resolve, reject) => {
              if (shouldConfirmTx) {
                return didConfirmAmount
                  ? resolve()
                  : reject(
                      new Error(
                        t('Entered amount does not match target amount')
                      )
                    )
              }
              return resolve()
            })
              .then(() => setIsSubmitting(true))
              .then(() => callRpc('bcn_sendRawTx', tx))
              .then(async hash => {
                if (isValidUrl(callbackUrl)) {
                  const callbackUrlWithHash = appendTxHash(callbackUrl, hash)

                  global.logger.info('Received dna://rawTx cb url', callbackUrl)
                  global.logger.info(
                    'Append hash to cb url',
                    callbackUrlWithHash.href
                  )

                  await handleCallbackUrl(callbackUrlWithHash, callbackFormat, {
                    // eslint-disable-next-line no-shadow
                    onJson: ({success, error, url}) => {
                      if (success) {
                        onSendSuccess({hash, url})
                      } else {
                        onSendError({
                          error:
                            error ??
                            t('{{url}} responded with an unknown format', {
                              url: callbackUrlWithHash.href,
                            }),
                          url: url ?? callbackUrlWithHash,
                        })
                      }
                    },
                    // eslint-disable-next-line no-shadow
                    onHtml: ({url}) => onSendSuccess({hash, url}),
                  })
                    .catch(error => {
                      global.logger.error(error)
                      onSendError({
                        error: error?.message,
                        url: callbackUrlWithHash.href,
                      })
                    })
                    .finally(() => setIsSubmitting(false))
                } else {
                  setIsSubmitting(false)
                  global.logger.error('Invalid dna://send cb url', callbackUrl)
                }
              })
              .catch(({message}) => {
                setIsSubmitting(false)
                global.logger.error(message)
                onSendRawTxFailed(message)
              })
              .finally(onClose)
          }}
        >
          {t('Confirm')}
        </PrimaryButton>
      </DnaDialogFooter>
    </Dialog>
  )
}

function DnaDialogSubtitle(props) {
  return <Text mb={5} {...props} />
}

function DnaDialogAlert(props) {
  return (
    <Stack
      isInline
      align="center"
      bg="red.020"
      borderColor="red.500"
      borderWidth={1}
      borderRadius="md"
      px={3}
      py={2}
      mb={5}
    >
      <InfoIcon boxSize={4} color="red.500" />
      <Text fontWeight={500} {...props} />
    </Stack>
  )
}

function DnaDialogDetails(props) {
  return <Box bg="gray.50" borderRadius="lg" px={5} {...props} />
}

function DnaDialogPanel({label, value, children, ...props}) {
  return (
    <Box py={4} mb="1px" {...props}>
      {label && <DnaDialogPanelLabel>{label}</DnaDialogPanelLabel>}
      {value && <DnaDialogPanelValue>{value}</DnaDialogPanelValue>}
      {children}
    </Box>
  )
}

function DnaDialogPanelLabel(props) {
  return <Text color="muted" lineHeight="short" {...props} />
}

function DnaDialogPanelValue(props) {
  return <Box fontWeight={500} wordBreak="break-all" minW={10} {...props} />
}

function DnaDialogPanelDivider() {
  return <Divider border="none" borderColor="white" mx={-5} />
}

function PanelRow(props) {
  return <Flex align="center" justify="space-between" {...props} />
}

function PanelMediaCell(props) {
  return <Box minW={10} {...props} />
}

function DnaDialogFooter(props) {
  return <DialogFooter {...props} />
}

function Address({address}) {
  return (
    <Avatar
      address={address}
      size={10}
      bg="white"
      borderRadius="md"
      borderWidth={1}
      borderColor="gray.300"
    />
  )
}

function AlertText(props) {
  return (
    <Box color="red.500" fontWeight={500} fontSize="sm" mt={1} {...props} />
  )
}
