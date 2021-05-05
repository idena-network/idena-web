import {Flex, Icon, Text} from '@chakra-ui/core'
import {margin, rem} from 'polished'
import {useEffect, useState} from 'react'
import {useQuery} from 'react-query'
import {Label, SubHeading} from '../../shared/components'
import {
  useSettingsDispatch,
  useSettingsState,
} from '../../shared/providers/settings-context'
import theme from '../../shared/theme'
import {Avatar, Input} from '../../shared/components/components'
import {
  FlatButton,
  PrimaryButton,
  SecondaryButton,
} from '../../shared/components/button'
import {
  privateKeyToAddress,
  privateKeyToPublicKey,
} from '../../shared/utils/crypto'
import {buyKey, getKeyById, getProvider, getRawTx} from '../../shared/api'
import {Transaction} from '../../shared/models/transaction'

// eslint-disable-next-line react/prop-types
export function ActivateInvite({privateKey, onBack, onSkip, onNext}) {
  const [submitting, setSubmitting] = useState(false)

  const [state, setState] = useState({
    code: '',
  })
  const [error, setError] = useState('')

  const coinbase = privateKeyToAddress(privateKey)

  const {apiKeyId} = useSettingsState()
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
    ['get-provider-by-id', process.env.NEXT_PUBLIC_IDENA_MAIN_PROVIDER],
    () => getProvider(process.env.NEXT_PUBLIC_IDENA_MAIN_PROVIDER),
    {
      retry: false,
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
      const result = await buyKey(
        coinbase,
        `0x${tx.toHex()}`,
        process.env.NEXT_PUBLIC_IDENA_MAIN_PROVIDER
      )
      addPurchase(result.id, process.env.NEXT_PUBLIC_IDENA_MAIN_PROVIDER)
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
          <SubHeading color="white">Enter invitation code</SubHeading>
          <Flex justify="space-between">
            <Text color="xwhite.050" fontSize={rem(14)}>
              Enter an invitation code to get a free shared node connection
              {onSkip ? ' or skip it to enter the invitation code later' : ''}.
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
          <Label htmlFor="code" style={{color: 'white', fontSize: rem(13)}}>
            Invitation code
          </Label>
          <Flex width="100%" style={{marginBottom: rem(20)}}>
            <Input
              id="code"
              value={state.code}
              borderColor="xblack.008"
              backgroundColor="xblack.016"
              onChange={e => setState({...state, code: e.target.value})}
              placeholder="Your invitation code"
              color="white"
            />
          </Flex>

          <Flex
            style={{
              ...margin(theme.spacings.xlarge, 0, 0, 0),
            }}
            justify="space-between"
          >
            <FlatButton
              color="white"
              onClick={onBack}
              style={{
                fontSize: rem(13),
                textAlign: 'center',
              }}
              disabled={waiting}
            >
              <Icon
                name="arrow-up"
                size={5}
                style={{transform: 'rotate(-90deg)', marginTop: -3}}
              ></Icon>
              Back
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
                  Skip for now
                </SecondaryButton>
              )}
              <PrimaryButton
                isLoading={waiting}
                loadingText="Mining..."
                type="submit"
                ml="auto"
              >
                Activate
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
