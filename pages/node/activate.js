import {Flex, Text} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {activateKey, getAvailableProviders, getRawTx} from '../../shared/api'
import {SubHeading} from '../../shared/components'
import {FlatButton, PrimaryButton} from '../../shared/components/button'
import {Avatar, FormLabel, Input} from '../../shared/components/components'
import {ArrowUpIcon} from '../../shared/components/icons'
import Layout from '../../shared/components/layout'
import useApikeyPurchasing from '../../shared/hooks/use-apikey-purchasing'
import {useFailToast} from '../../shared/hooks/use-toast'
import {Transaction} from '../../shared/models/transaction'
import {useAuthState} from '../../shared/providers/auth-context'
import {sendActivateInvitation} from '../../shared/utils/analytics'
import {
  privateKeyToAddress,
  privateKeyToPublicKey,
} from '../../shared/utils/crypto'
import {validateInvitationCode} from '../../shared/utils/utils'

export default function Activate() {
  const {privateKey} = useAuthState()
  const router = useRouter()

  const {t} = useTranslation()
  const [submitting, setSubmitting] = useState(false)

  const [state, setState] = useState({
    code: '',
  })

  const failToast = useFailToast()

  const coinbase = privateKeyToAddress(privateKey)

  const {isPurchasing, savePurchase} = useApikeyPurchasing()

  const activateInvite = async () => {
    setSubmitting(true)

    try {
      const trimmedCode = state.code.trim()
      if (!validateInvitationCode(trimmedCode)) throw new Error()

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
      savePurchase(result.id, result.provider)
      sendActivateInvitation(coinbase)
    } catch (e) {
      failToast(
        `Failed to activate invite: ${
          e.response ? e.response.data : 'invitation is invalid'
        }`
      )
    } finally {
      setSubmitting(false)
    }
  }

  const waiting = submitting || isPurchasing

  return (
    <Layout canRedirect={false}>
      <Flex
        bg="graphite.500"
        alignItems="center"
        justifyContent="center"
        height="100%"
        direction="column"
        justify="center"
        flex="1"
      >
        <Flex direction="column" maxWidth="480px">
          <Flex width="100%">
            <Avatar address={coinbase} />
            <Flex direction="column" justify="center" flex="1" ml={5}>
              <SubHeading color="white">
                {t('Enter invitation code')}
              </SubHeading>
              <Flex justify="space-between">
                <Text color="xwhite.050" fontSize="mdx">
                  {t(
                    'Enter an invitation code to get a free shared node connection'
                  )}
                </Text>
              </Flex>
            </Flex>
          </Flex>
          <Flex width="100%" mt={6}>
            <form
              onSubmit={async e => {
                e.preventDefault()
                await activateInvite()
              }}
              style={{width: '100%'}}
            >
              <FormLabel htmlFor="code" fontSize="md" color="white">
                {t('Invitation code')}
              </FormLabel>
              <Flex width="100%" mb={5}>
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

              <Flex mt={3} justify="space-between">
                <FlatButton
                  color="white"
                  onClick={() => router.back()}
                  disabled={waiting}
                >
                  <ArrowUpIcon
                    boxSize={5}
                    style={{transform: 'rotate(-90deg)', marginTop: -3}}
                  />
                  {t('Back')}
                </FlatButton>

                <Flex>
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
            </form>
          </Flex>
        </Flex>
      </Flex>
    </Layout>
  )
}
