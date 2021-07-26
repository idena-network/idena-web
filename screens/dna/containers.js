/* eslint-disable react/prop-types */
import * as React from 'react'
import {Box, Icon, Image, Stack, Text} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {FiGlobe} from 'react-icons/fi'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {
  Avatar,
  Dialog,
  DialogBody,
  DialogFooter,
} from '../../shared/components/components'
import {
  authenticate,
  isValidUrl,
  parseCallbackUrl,
  signNonceOffline,
  startSession,
} from '../../shared/utils/dna-link'
import {DnaDialogStat} from './components'
import {useAuthState} from '../../shared/providers/auth-context'
import {toHexString} from '../../shared/utils/buffers'
import {openExternalUrl} from '../../shared/utils/utils'

export function DnaSignInDialog({
  query = {},
  onDone,
  onError = console.error,
  ...props
}) {
  const {t} = useTranslation()

  const confirmButtonRef = React.useRef()

  const {coinbase, privateKey} = useAuthState()

  const [isAuthenticating, setIsAuthenticating] = React.useState()

  const {
    callback_url: callbackUrl,
    token,
    nonce_endpoint: nonceEndpoint,
    authentication_endpoint: authenticationEndpoint,
    favicon_url: faviconUrl,
  } = query

  const {
    hostname: callbackHostname,
    faviconUrl: callbackFaviconUrl,
  } = parseCallbackUrl({
    callbackUrl,
    faviconUrl,
  })

  return (
    <Dialog
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
          <Box borderRadius="lg" overflow="hidden">
            <DnaDialogStat
              label={t('Website')}
              value={callbackHostname}
              mb="px"
            >
              {callbackFaviconUrl ? (
                <Image borderRadius="md" size={10} src={callbackFaviconUrl} />
              ) : (
                <Icon as={FiGlobe} size={10} color="blue.500" />
              )}
            </DnaDialogStat>
            <DnaDialogStat label={t('My address')} value={coinbase} mb="px">
              <Avatar address={coinbase} size={10} />
            </DnaDialogStat>
            <DnaDialogStat label={t('Token')} value={token} />
          </Box>
        </Stack>
      </DialogBody>
      <DialogFooter>
        <SecondaryButton onClick={onDone}>{t('Cancel')}</SecondaryButton>
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
                  onDone()
                } else {
                  setIsAuthenticating(false)
                  onError('Invalid callback URL')
                }
              })
              .catch(error => {
                setIsAuthenticating(false)
                onError(error?.response?.data?.error)
              })
          }}
        >
          {t('Confirm')}
        </PrimaryButton>
      </DialogFooter>
    </Dialog>
  )
}
