import {DownloadIcon} from '@chakra-ui/icons'
import {Checkbox, Flex, RadioGroup, Stack, Text} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useQuery} from 'react-query'
import {BuySharedNodeForm, ChooseItemRadio} from '../../screens/node/components'
import {getProvider} from '../../shared/api'

import {SubHeading} from '../../shared/components'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {Avatar, TextLink} from '../../shared/components/components'
import Layout from '../../shared/components/layout'
import {useAuthState} from '../../shared/providers/auth-context'
import {useSettings} from '../../shared/providers/settings-context'
import {loadPersistentState, persistState} from '../../shared/utils/persist'

const options = {
  PROLONG: 0,
  BUY: 1,
  ENTER_KEY: 2,
}

export default function Restricted() {
  const [{apiKeyData}] = useSettings()
  const {coinbase} = useAuthState()
  const auth = useAuthState()
  const router = useRouter()
  const {t} = useTranslation()

  const [state, setState] = useState(options.PROLONG)
  const [dontShow, setDontShow] = useState(false)

  const [showDrawer, setShowDrawer] = useState(false)

  const persistCheckbox = () => {
    const current = loadPersistentState('restricted-modal')
    persistState('restricted-modal', {...current, dontShow})
  }

  const notNow = () => {
    persistCheckbox()
    router.back()
  }

  const process = () => {
    persistCheckbox()
    if (state === options.PROLONG) {
      setShowDrawer(true)
    } else if (state === options.ENTER_KEY) {
      return router.push('/settings/node')
    } else return router.push('/node/rent')
  }

  const {data: provider, isError} = useQuery(
    ['get-provider-by-id', apiKeyData && apiKeyData.provider],
    () => getProvider(apiKeyData && apiKeyData.provider),
    {
      enabled: apiKeyData && !!apiKeyData.provider,
      retry: false,
      refetchOnWindowFocus: false,
    }
  )

  useEffect(() => {
    if ((provider && !provider.slots) || isError) {
      setState(options.BUY)
    }
  }, [isError, provider])

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
        <Flex flexGrow={1} align="center" justify="center" mt="44px">
          <Flex direction="column" maxWidth="480px">
            <Flex>
              <Avatar address={auth.coinbase} />
              <Flex direction="column" justify="center" flex="1" ml={5}>
                <SubHeading color="white" css={{wordBreak: 'break-word'}}>
                  {auth.coinbase}
                </SubHeading>
              </Flex>
            </Flex>
            <Flex
              direction="column"
              mt={6}
              bg="gray.500"
              borderRadius="lg"
              px={10}
              py={7}
            >
              <Flex>
                <Text color="white" fontSize="lg">
                  {t(
                    'You cannot use the shared node for the upcoming validation ceremony'
                  )}
                </Text>
              </Flex>

              <Flex mt={7}>
                <Text color="white" fontSize="sm" opacity={0.5}>
                  {t('Choose an option')}
                </Text>
              </Flex>
              <Flex mt={4}>
                <RadioGroup>
                  <Stack direction="column" spacing={3}>
                    {provider && provider.slots && (
                      <ChooseItemRadio
                        isChecked={state === options.PROLONG}
                        onChange={() => setState(options.PROLONG)}
                      >
                        <Text color="white">
                          {t('Prolong node access')}{' '}
                          {provider ? `(${provider.data.price} iDNA)` : ''}
                        </Text>
                      </ChooseItemRadio>
                    )}
                    <ChooseItemRadio
                      isChecked={state === options.BUY}
                      onChange={() => setState(options.BUY)}
                    >
                      <Text color="white">{t('Rent another shared node')}</Text>
                    </ChooseItemRadio>
                    <ChooseItemRadio
                      isChecked={state === options.ENTER_KEY}
                      onChange={() => setState(options.ENTER_KEY)}
                    >
                      <Text color="white">
                        {t('Enter shared node API key')}
                      </Text>
                    </ChooseItemRadio>
                  </Stack>
                </RadioGroup>
              </Flex>
              <Flex mt={10} justifyContent="space-between">
                <Flex>
                  <Checkbox
                    order={[2, 1]}
                    mt={[9, 0]}
                    textAlign={['left', 'initial']}
                    value={dontShow}
                    isChecked={dontShow}
                    onChange={e => setDontShow(e.target.checked)}
                    color="white"
                  >
                    {t('Don’t show again')}
                  </Checkbox>
                </Flex>
                <Flex>
                  <SecondaryButton onClick={notNow} mr={2}>
                    {t('Not now')}
                  </SecondaryButton>
                  <PrimaryButton onClick={process}>
                    {t('Continue')}
                  </PrimaryButton>
                </Flex>
              </Flex>
            </Flex>
          </Flex>
        </Flex>
        <Flex
          justify="center"
          mb={8}
          direction="column"
          justifyContent="center"
        >
          <Text color="white" fontSize="mdx" opacity="0.5" mb={1}>
            You can run your own node at your desktop computer.
          </Text>
          <TextLink
            href="https://idena.io/download"
            target="_blank"
            color="white"
            textAlign="center"
          >
            <DownloadIcon boxSize={4} mx={2} />
            Download Idena
          </TextLink>
        </Flex>
      </Flex>
      {provider && (
        <BuySharedNodeForm
          isOpen={showDrawer}
          onClose={() => setShowDrawer(false)}
          providerId={provider.id}
          url={provider.data.url}
          from={coinbase}
          amount={provider.data.price}
          to={provider.data.address}
        />
      )}
    </Layout>
  )
}
