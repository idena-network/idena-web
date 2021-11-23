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
  signNonceOffline,
  startSession,
} from './utils'
import {ExclamationMarkIcon, GlobeIcon} from '../../shared/components/icons'
import {useIdentity} from '../../shared/providers/identity-context'
import {bufferToHex} from '../../shared/utils/string'
import {getRawTx, sendRawTx} from '../../shared/api'

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
              .then(nonce => signNonceOffline(nonce, privateKey))
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
  onClose,
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
    <DnaDialog title={t('Confirm transfer')} onClose={onClose} {...props}>
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
              .then(async () => {
                const tx = new Transaction().fromHex(
                  await getRawTx(
                    0,
                    from,
                    to,
                    amount,
                    null,
                    bufferToHex(new TextEncoder().encode(comment))
                  )
                )
                tx.sign(privateKey)
                return sendRawTx(`0x${tx.toHex()}`)
              })
              .then(hash => {
                if (isValidUrl(callbackUrl)) {
                  const callbackUrlWithHash = appendTxHash(callbackUrl, hash)

                  global.logger.info('Received dna://send cb url', callbackUrl)
                  global.logger.info(
                    'Append hash to cb url',
                    callbackUrlWithHash.href
                  )

                  handleCallbackUrl(callbackUrlWithHash, callbackFormat, {
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
      </DialogFooter>
    </DnaDialog>
  )
}

export function DnaRawDialog({
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
  const {
    t,
    i18n: {language},
  } = useTranslation()

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

  const dna = toLocaleDna(language)

  return (
    <DnaDialog title={t('Confirm transaction')} onClose={onClose} {...props}>
      <DialogBody>
        <Stack spacing={5}>
          <Text>{t('You’re about to sign and send tx from your wallet')}</Text>
          <DnaDialogAlert>
            {t('Attention! This is irreversible operation')}
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
            <DnaDialogStat>
              <DnaDialogStatLabel>
                {t('Transaction details')}
              </DnaDialogStatLabel>
              <DnaDialogStatValue>
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
              </DnaDialogStatValue>
            </DnaDialogStat>
          </Stack>
          {shouldConfirmTx && (
            <FormControlWithLabel label={t('Enter amount to confirm transfer')}>
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
        </Stack>
      </DialogBody>
      <DialogFooter>
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
              .then(() => sendRawTx(tx))
              .then(hash => {
                if (isValidUrl(callbackUrl)) {
                  const callbackUrlWithHash = appendTxHash(callbackUrl, hash)

                  global.logger.info('Received dna://rawTx cb url', callbackUrl)
                  global.logger.info(
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
      </DialogFooter>
    </DnaDialog>
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
