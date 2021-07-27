import {Flex, Text} from '@chakra-ui/react'
import {margin, rem} from 'polished'
import {useEffect, useState} from 'react'
import {useQuery} from 'react-query'
import {useTranslation} from 'react-i18next'
import {ArrowUpIcon} from '@chakra-ui/icons'
import {SubHeading} from '../../shared/components'
import {
  useSettingsDispatch,
  useSettingsState,
} from '../../shared/providers/settings-context'
import theme from '../../shared/theme'
import {Avatar, FormLabel, Input} from '../../shared/components/components'
import {
  FlatButton,
  PrimaryButton,
  SecondaryButton,
} from '../../shared/components/button'
import {
  privateKeyToAddress,
  privateKeyToPublicKey,
} from '../../shared/utils/crypto'
import {
  getKeyById,
  getProvider,
  getRawTx,
  activateKey,
  getAvailableProviders,
} from '../../shared/api'
import {Transaction} from '../../shared/models/transaction'

// eslint-disable-next-line react/prop-types
export function ActivateInvite({privateKey, onBack, onSkip, onNext}) {
  const {t} = useTranslation()
  const [submitting, setSubmitting] = useState(false)

  const [state, setState] = useState({
    code: '',
  })
  const [error, setError] = useState('')

  const coinbase = privateKeyToAddress(privateKey)

  const {apiKeyId, apiKeyData} = useSettingsState()

  const {addPurchase, addPurchasedKey} = useSettingsDispatch()

  const {isLoading, data} = useQuery(
    ['get-key-by-id', apiKeyId],
    () => getKeyById(apiKeyId),
    {
      enabled: !!apiKeyId,
      retry: true,
      retryDelay: 5000,
    }
  )

  const {data: provider} = useQuery(
    ['get-provider-by-id', apiKeyData?.provider],
    () => getProvider(apiKeyData?.provider),
    {
      enabled: !!data && !!apiKeyData?.provider,
      retry: true,
    }
  )

  useEffect(() => {
    if (provider && data) {
      addPurchasedKey(provider.data.url, data.key, data.epoch)
      if (onNext) onNext()
    }
  }, [addPurchasedKey, data, onNext, provider])

  const activateInvite = async () => {
    setError('')
    setSubmitting(true)

    try {
      const trimmedCode = state.code.trim()
      const from = privateKeyToAddress(trimmedCode)

      const rawTx = await getRawTx(
        1,
        from,
        coinbase,
        0,
        0,
        privateKeyToPublicKey(privateKey),
        0,
        true
      )

      const tx = new Transaction().fromHex(rawTx)
      tx.sign(trimmedCode)

      const providers = await getAvailableProviders()

      const result = await activateKey(coinbase, `0x${tx.toHex()}`, providers)
      addPurchase(result.id, result.provider)
    } catch (e) {
      setError(
        `Failed to activate invite: ${
          e.response ? e.response.data : 'invitation is invalid'
        }`
      )
    } finally {
      setSubmitting(false)
    }
  }

  const waiting = submitting || isLoading

  return (
    <>
      <Flex width="100%">
        <Avatar address={coinbase} borderRadius={rem(20)} />
        <Flex
          direction="column"
          justify="center"
          flex="1"
          style={{marginLeft: rem(20)}}
        >
          <SubHeading color="white">{t('Enter invitation code')}</SubHeading>
          <Flex justify="space-between">
            <Text color="xwhite.050" fontSize={rem(14)}>
              {onSkip
                ? t(
                    'Enter an invitation code to get a free shared node connection or skip it to enter the invitation code later'
                  )
                : t(
                    'Enter an invitation code to get a free shared node connection'
                  )}
            </Text>
          </Flex>
        </Flex>
      </Flex>
      <Flex
        width="100%"
        style={{
          ...margin(theme.spacings.medium24, 0, 0, 0),
        }}
      >
        <form
          onSubmit={async e => {
            e.preventDefault()
            await activateInvite()
          }}
          style={{width: '100%'}}
        >
          <FormLabel htmlFor="code" style={{color: 'white', fontSize: rem(13)}}>
            {t('Invitation code')}
          </FormLabel>
          <Flex width="100%" style={{marginBottom: rem(20)}}>
            <Input
              id="code"
              value={state.code}
              borderColor="xblack.008"
              backgroundColor="xblack.016"
              onChange={e => setState({...state, code: e.target.value})}
              placeholder={t('Your invitation code')}
              color="white"
            />
          </Flex>

          <Flex
            style={{
              ...margin(theme.spacings.xlarge, 0, 0, 0),
            }}
            justify="space-between"
          >
            <FlatButton color="white" onClick={onBack} disabled={waiting}>
              <ArrowUpIcon
                boxSize={5}
                style={{transform: 'rotate(-90deg)', marginTop: -3}}
              />
              {t('Back')}
            </FlatButton>

            <Flex>
              {onSkip && (
                <SecondaryButton
                  type="button"
                  mr={rem(10)}
                  fontSize={rem(13)}
                  onClick={onSkip}
                  isDisabled={waiting}
                >
                  {t('Skip for now')}
                </SecondaryButton>
              )}
              <PrimaryButton
                isLoading={waiting}
                loadingText={t('Mining...')}
                type="submit"
                ml="auto"
              >
                {t('Activate')}
              </PrimaryButton>
            </Flex>
          </Flex>
          {error && (
            <Flex
              style={{
                marginTop: rem(30, theme.fontSizes.base),
                backgroundColor: theme.colors.danger,
                borderRadius: rem(9, theme.fontSizes.base),
                fontSize: rem(14, theme.fontSizes.base),
                padding: `${rem(18, theme.fontSizes.base)} ${rem(
                  24,
                  theme.fontSizes.base
                )}`,
                color: 'white',
              }}
            >
              {error}
            </Flex>
          )}
        </form>
      </Flex>
    </>
  )
}
