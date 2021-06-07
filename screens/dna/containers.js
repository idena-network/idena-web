/* eslint-disable react/prop-types */
import * as React from 'react'
import {Box, Icon, Image, Stack, Text} from '@chakra-ui/core'
import {useTranslation} from 'react-i18next'
import {FiGlobe} from 'react-icons/fi'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {
  Avatar,
  Dialog,
  DialogBody,
  DialogFooter,
} from '../../shared/components/components'
import {useIdentity} from '../../shared/providers/identity-context'
import {
  authenticate,
  isValidUrl,
  parseCallbackUrl,
  signNonceOffline,
  startSession,
} from '../../shared/utils/dna-link'
import {DnaDialogStat} from './components'
import {useAuthState} from '../../shared/providers/auth-context'

export function DnaSignInDialog({
  query = {},
  onDone,
  onError = console.error,
  ...props
}) {
  const {t} = useTranslation()

  const [{address}] = useIdentity()
  const {privateKey} = useAuthState()

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
    <Dialog title={t('Login confirmation')} {...props}>
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
            <DnaDialogStat label={t('My address')} value={address} mb="px">
              <Avatar address={address} size={10} />
            </DnaDialogStat>
            <DnaDialogStat label={t('Token')} value={token} />
          </Box>
        </Stack>
      </DialogBody>
      <DialogFooter>
        <SecondaryButton onClick={onDone}>{t('Cancel')}</SecondaryButton>
        <PrimaryButton
          maxH={8}
          maxW={48}
          overflow="hidden"
          wordBreak="break-all"
          isLoading={isAuthenticating}
          onClick={() => {
            setIsAuthenticating(true)
            startSession(nonceEndpoint, {
              token,
              address,
            })
              .then(nonce => signNonceOffline(nonce, privateKey))
              .then(signature =>
                authenticate(authenticationEndpoint, {
                  token,
                  signature,
                })
              )
              .then(() => {
                if (isValidUrl(callbackUrl)) {
                  window.open(callbackUrl, '_blank')
                  onDone()
                } else onError('Invalid callback URL')
              })
              .catch(({message}) => {
                onError(message)
              })
              .finally(() => {
                setIsAuthenticating(false)
              })
          }}
        >
          {t('Confirm')}
        </PrimaryButton>
      </DialogFooter>
    </Dialog>
  )
}
