/* eslint-disable react/prop-types */
import * as React from 'react'
import {
  Image,
  Stack,
  Text,
  HStack,
  Alert,
  AlertIcon,
  AlertTitle,
  Box,
  Flex,
} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {
  Dialog,
  DialogBody,
  DialogFooter,
  ExternalLink,
  FormControlWithLabel,
  Input,
  Tooltip,
} from '../../shared/components/components'
import {
  DnaDialog,
  DnaDialogAlert,
  DnaDialogAvatar,
  SimpleDnaDialogStat,
  DnaDialogStat,
  DnaDialogStatLabel,
  DnaDialogStatValue,
  MediaDnaDialogStat,
  DnaDialogAlertText,
} from './components'
import {useAuthState} from '../../shared/providers/auth-context'
import {toHexString} from '../../shared/utils/buffers'
import {openExternalUrl, toLocaleDna} from '../../shared/utils/utils'
import {Transaction} from '../../shared/models/transaction'
import {
  appendTxHash,
  authenticate,
  DNA_SEND_CONFIRM_TRESHOLD,
  handleCallbackUrl,
  isValidUrl,
  startSession,
} from './utils'
import {ExclamationMarkIcon, GlobeIcon} from '../../shared/components/icons'
import {useIdentity} from '../../shared/providers/identity-context'
import {getRawTx, sendRawTx} from '../../shared/api'
import {dnaSign} from '../../shared/utils/crypto'
import {TxType} from '../../shared/types'
import {useFormatDna} from '../ads/hooks'

export function DnaSignInDialog({
  token,
  nonceEndpoint,
  authenticationEndpoint,
  callbackUrl,
  faviconUrl,
  onCompleteSignIn,
  onSignInError = console.error,
  ...props
}) {
  const {t} = useTranslation()

  const confirmButtonRef = React.useRef()

  const {coinbase, privateKey} = useAuthState()

  const [isAuthenticating, setIsAuthenticating] = React.useState()

  const callbackUrlObject = React.useMemo(() => new URL(callbackUrl), [
    callbackUrl,
  ])

  const callbackFaviconUrl = React.useMemo(
    () => faviconUrl || new URL('favicon.ico', callbackUrlObject.origin),
    [callbackUrlObject.origin, faviconUrl]
  )

  return (
    <DnaDialog
      title={t('Login confirmation')}
      initialFocusRef={confirmButtonRef}
      {...props}
    >
      <DialogBody>
        <Stack spacing={5}>
          <Text>
            {t(
              'Please confirm that you want to use your public address for the website login'
            )}
          </Text>
          <Stack spacing="px" borderRadius="lg" overflow="hidden">
            <MediaDnaDialogStat
              label={t('Website')}
              value={callbackUrlObject.hostname || callbackUrl}
            >
              {callbackFaviconUrl ? (
                <Image borderRadius="md" size={10} src={callbackFaviconUrl} />
              ) : (
                <GlobeIcon boxSize={10} color="blue.500" />
              )}
            </MediaDnaDialogStat>
            <MediaDnaDialogStat label={t('My address')} value={coinbase}>
              <DnaDialogAvatar address={coinbase} />
            </MediaDnaDialogStat>
            <SimpleDnaDialogStat label={t('Token')} value={token} />
          </Stack>
        </Stack>
      </DialogBody>
      <DialogFooter>
        <SecondaryButton onClick={onCompleteSignIn}>
          {t('Cancel')}
        </SecondaryButton>
        <PrimaryButton
          ref={confirmButtonRef}
          maxH={8}
          maxW={48}
          overflow="hidden"
          wordBreak="break-all"
          isLoading={isAuthenticating}
          onClick={() => {
            setIsAuthenticating(true)
            startSession(nonceEndpoint, {
              token,
              coinbase,
            })
              .then(nonce => dnaSign(nonce, privateKey))
              .then(bytes =>
                authenticate(authenticationEndpoint, {
                  token,
                  signature: toHexString(bytes, true),
                })
              )
              .then(() => {
                if (isValidUrl(callbackUrl)) {
                  openExternalUrl(callbackUrl)
                  onCompleteSignIn()
                } else {
                  setIsAuthenticating(false)
                  onSignInError('Invalid callback URL')
                }
              })
              .catch(error => {
                setIsAuthenticating(false)
                onSignInError(error?.response?.data?.error)
              })
          }}
        >
          {t('Confirm')}
        </PrimaryButton>
      </DialogFooter>
    </DnaDialog>
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
  onCompleteSend,
  ...props
}) {
  const {
    t,
    i18n: {language},
  } = useTranslation()

  const {privateKey} = useAuthState()

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

  const dna = toLocaleDna(language)

  return (
    <DnaDialog title={t('Confirm transfer')} {...props}>
      <DialogBody>
        <Stack spacing={5}>
          <Text>
            {t(
              `You’re about to send iDNA from your wallet to the following address`
            )}
          </Text>
          <DnaDialogAlert>
            {t(`Attention! This is irreversible operation`)}
          </DnaDialogAlert>
          <Stack spacing="px" borderRadius="lg" overflow="hidden">
            <MediaDnaDialogStat label={t('To')} value={to}>
              <DnaDialogAvatar address={to} />
            </MediaDnaDialogStat>
            <DnaDialogStat>
              <DnaDialogStatLabel>{t('Amount')}</DnaDialogStatLabel>
              <DnaDialogStatValue
                color={isExceededBalance ? 'red.500' : 'brandGray.500'}
              >
                {isExceededBalance ? (
                  <HStack spacing={1}>
                    <Text as="span">{dna(amount)}</Text>
                    <Tooltip
                      label={t('The amount is larger than your balance')}
                    >
                      <ExclamationMarkIcon boxSize={4} color="red.500" />
                    </Tooltip>
                  </HStack>
                ) : (
                  dna(amount)
                )}
              </DnaDialogStatValue>
            </DnaDialogStat>
            <SimpleDnaDialogStat
              label={t('Available balance')}
              value={dna(balance)}
            />
            <SimpleDnaDialogStat label={t('Comment')} value={comment} />
          </Stack>
          {shouldConfirmTx && (
            <FormControlWithLabel label={t('Enter amount to confirm transfer')}>
              <Input
                isDisabled={isExceededBalance}
                value={confirmationAmount}
                onChange={e => setConfirmationAmount(e.target.value)}
              />
              {Number.isFinite(+confirmationAmount) && !areSameAmounts && (
                <DnaDialogAlertText>
                  {t('Entered amount does not match target amount')}
                </DnaDialogAlertText>
              )}
            </FormControlWithLabel>
          )}
        </Stack>
      </DialogBody>
      <DialogFooter>
        <SecondaryButton onClick={onCompleteSend}>
          {t('Cancel')}
        </SecondaryButton>
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
              .then(async () => {
                const tx = new Transaction().fromHex(
                  await getRawTx(
                    0,
                    from,
                    to,
                    amount,
                    null,
                    toHexString(new TextEncoder().encode(comment), true)
                  )
                )
                tx.sign(privateKey)
                return {hash: `0x${tx.hash}`, tx: `0x${tx.toHex()}`}
              })
              .then(async ({hash, tx}) => {
                async function sendDna() {
                  return sendRawTx(tx)
                }

                if (isValidUrl(callbackUrl)) {
                  const callbackUrlWithHash = appendTxHash(callbackUrl, hash)

                  console.info('Received dna://send cb url', callbackUrl)
                  console.info(
                    'Append hash to cb url',
                    callbackUrlWithHash.href
                  )

                  handleCallbackUrl(callbackUrlWithHash, callbackFormat, {
                    onJson: async ({success, error, url}) => {
                      if (success) {
                        await sendDna()
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
                    onHtml: ({url}) =>
                      sendDna().then(() => onDepositSuccess({hash, url})),
                  })
                    .catch(error => {
                      console.error(error)
                      onDepositError({
                        error: error?.message,
                        url: callbackUrlWithHash.href,
                      })
                    })
                    .finally(() => setIsSubmitting(false))
                } else if (callbackUrl) {
                  setIsSubmitting(false)
                  console.error('Invalid dna send cb url', callbackUrl)
                } else {
                  await sendDna()
                  setIsSubmitting(false)
                  onDepositSuccess({hash})
                }
              })
              .catch(({message}) => {
                setIsSubmitting(false)
                console.error(message)
                onSendTxFailed(message)
              })
          }}
        >
          {t('Confirm')}
        </PrimaryButton>
      </DialogFooter>
    </DnaDialog>
  )
}

export function DnaRawDialog({
  balance,
  tx,
  callbackUrl,
  callbackFormat,
  onSendSuccess,
  onSendError,
  onSendRawTxFailed,
  onCompleteSend,
  ...props
}) {
  const {t} = useTranslation()

  const {privateKey} = useAuthState()

  const parsedTx = React.useMemo(
    () =>
      tx
        ? new Transaction().fromHex(tx)
        : {type: null, amount: null, to: null, maxFee: null},
    [tx]
  )

  const toDna = num => +num / 10 ** 18

  const {type, to, amount: parsedAmount, maxFee: parsedMaxFee} = parsedTx

  const amount = toDna(parsedAmount)
  const maxFee = toDna(parsedMaxFee)

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

  const formatDna = useFormatDna({maximumFractionDigits: 5})

  return (
    <DnaDialog title={t('Confirm transaction')} {...props}>
      <DialogBody>
        <Stack spacing="5">
          <Stack spacing="4">
            <Text>
              {t('You’re about to sign and send tx from your wallet')}
            </Text>
            <Stack spacing="3">
              <DnaDialogAlert>
                {t('Attention! This is irreversible operation')}
              </DnaDialogAlert>
              <Stack spacing="px" borderRadius="lg" overflow="hidden">
                <SimpleDnaDialogStat
                  label={t('Transaction type')}
                  value={Object.entries(TxType).find(([, v]) => v === type)[0]}
                />

                {to && <SimpleDnaDialogStat label={t('To')} value={to} />}

                <Flex align="center" justify="space-between">
                  <DnaDialogStat>
                    <DnaDialogStatLabel>{t('Amount')}</DnaDialogStatLabel>
                    <DnaDialogStatValue
                      color={isExceededBalance ? 'red.500' : 'brandGray.500'}
                    >
                      {isExceededBalance ? (
                        <HStack spacing={1}>
                          <Text as="span">{formatDna(amount)}</Text>
                          <Tooltip
                            label={t('The amount is larger than your balance')}
                          >
                            <ExclamationMarkIcon boxSize={4} color="red.500" />
                          </Tooltip>
                        </HStack>
                      ) : (
                        formatDna(amount)
                      )}
                    </DnaDialogStatValue>
                  </DnaDialogStat>

                  <SimpleDnaDialogStat
                    label={t('Max fee')}
                    value={formatDna(maxFee)}
                  />
                </Flex>

                <DnaDialogStat>
                  <DnaDialogStatLabel>
                    {t('Transaction details')}
                  </DnaDialogStatLabel>
                  <DnaDialogStatValue>
                    <Tooltip label={tx} zIndex="tooltip" wordBreak="break-all">
                      <Text
                        display="-webkit-box"
                        overflow="hidden"
                        noOfLines={2}
                      >
                        {tx}
                      </Text>
                    </Tooltip>
                  </DnaDialogStatValue>
                </DnaDialogStat>
              </Stack>
            </Stack>
          </Stack>
          <Stack spacing="2">
            {shouldConfirmTx && (
              <FormControlWithLabel
                label={t('Enter amount to confirm transfer')}
              >
                <Input
                  isDisabled={isExceededBalance}
                  value={confirmationAmount}
                  onChange={e => setConfirmationAmount(e.target.value)}
                />
                {Number.isFinite(+confirmationAmount) && !didConfirmAmount && (
                  <DnaDialogAlertText>
                    {t('Entered amount does not match target amount')}
                  </DnaDialogAlertText>
                )}
              </FormControlWithLabel>
            )}
            <Flex justify="space-between">
              <Text color="muted">{t('Available balance')}</Text>
              <Text>{formatDna(balance)}</Text>
            </Flex>
          </Stack>
        </Stack>
      </DialogBody>
      <DialogFooter>
        <SecondaryButton onClick={onCompleteSend}>
          {t('Cancel')}
        </SecondaryButton>
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
              .then(() =>
                sendRawTx(
                  new Transaction()
                    .fromHex(tx)
                    .sign(privateKey)
                    .toHex(true)
                )
              )
              .then(hash => {
                if (isValidUrl(callbackUrl)) {
                  const callbackUrlWithHash = appendTxHash(callbackUrl, hash)

                  console.info('Received dna://rawTx cb url', callbackUrl)
                  console.info(
                    'Append hash to cb url',
                    callbackUrlWithHash.href
                  )

                  handleCallbackUrl(callbackUrlWithHash, callbackFormat, {
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
                      console.error(error)
                      onSendError({
                        error: error?.message,
                        url: callbackUrlWithHash.href,
                      })
                    })
                    .finally(() => setIsSubmitting(false))
                } else {
                  setIsSubmitting(false)
                  console.error('Invalid dna://send cb url', callbackUrl)
                }
              })
              .catch(({message}) => {
                setIsSubmitting(false)
                console.error(message)
                onSendRawTxFailed(message)
              })
          }}
        >
          {t('Confirm')}
        </PrimaryButton>
      </DialogFooter>
    </DnaDialog>
  )
}

export function DnaSendSucceededDialog({hash, url, onCompleteSend, ...props}) {
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
              openExternalUrl(url)
              onCompleteSend()
            }}
          >
            {t('Continue')}
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={onCompleteSend}>{t('Close')}</PrimaryButton>
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
  onOpenFailUrl,
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
          onClick={() => {
            const requestedUrl = new URL(url)
            handleCallbackUrl(url, 'json', {
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
              console.error(error)
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
            openExternalUrl(url)
            onOpenFailUrl()
          }}
        >
          {t('Open in browser')}
        </PrimaryButton>
      </DialogFooter>
    </Dialog>
  )
}
