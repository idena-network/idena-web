import {
  Box,
  CloseButton,
  Flex,
  Link,
  Radio,
  Stack,
  Text,
  useDisclosure,
} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {rem} from 'polished'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useQuery} from 'react-query'
import {BuySharedNodeForm} from '../../screens/node/components'
import {getLastBlock} from '../../shared/api/indexer'
import {
  checkProvider,
  checkProviderSyncing,
  getProviders,
} from '../../shared/api/marketplace'
import {GetProviderPrice} from '../../screens/node/utils'
import {Page, PageTitle} from '../../screens/app/components'
import {
  Table,
  TableCol,
  TableHeaderCol,
  TableRow,
} from '../../shared/components'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import Layout from '../../shared/components/layout'
import {useAuthState} from '../../shared/providers/auth-context'
import {SYNCING_DIFF} from '../../shared/providers/settings-context'
import {fetchIdentity} from '../../shared/api'

// eslint-disable-next-line react/prop-types
function ProviderStatus({url}) {
  const {t} = useTranslation()

  const {isLoading, isError, isSuccess} = useQuery(
    ['provider-status', url],
    () => checkProvider(url),
    {retry: false, refetchOnWindowFocus: false}
  )

  const {isSuccess: isSuccessSyncing, data: syncingData} = useQuery(
    ['provider-status-syncing', url],
    () => checkProviderSyncing(url),
    {retry: false, refetchOnWindowFocus: false}
  )

  const {data: indexerData, isSuccess: indexerIsSuccess} = useQuery(
    ['last-block'],
    () => getLastBlock(),
    {
      retry: false,
      refetchOnWindowFocus: false,
    }
  )

  const blocksCount = indexerData?.height - syncingData?.currentBlock

  const outOfSync =
    isSuccess &&
    isSuccessSyncing &&
    indexerIsSuccess &&
    blocksCount > SYNCING_DIFF

  return (
    <>
      {isLoading && (
        <Flex>
          <Text color="muted" fontSize="sm">
            {t('Connecting...')}
          </Text>
        </Flex>
      )}
      {isError && (
        <Flex>
          <Text color="muted" fontSize="sm">
            {t('Not available')}
          </Text>
        </Flex>
      )}
      {isSuccess && !outOfSync && (
        <Flex>
          <Text color="green.500" fontSize="sm">
            {t('Online')}
          </Text>
        </Flex>
      )}
      {isSuccess && outOfSync && (
        <Flex>
          <Text color="warning.500" fontSize="sm">
            {t('Synchronizing: {{blocksCount}} blocks left', {
              blocksCount,
            })}
          </Text>
        </Flex>
      )}
    </>
  )
}

export default function Rent() {
  const router = useRouter()

  const {coinbase} = useAuthState()

  const buySharedNodeDisclosure = useDisclosure()

  const [state, setState] = useState(0)

  const {data: providers} = useQuery(['providers'], getProviders, {
    initialData: [],
  })

  const {data: identity} = useQuery(
    ['fetch-identity', coinbase],
    () => fetchIdentity(coinbase, true),
    {
      enabled: !!coinbase,
    }
  )

  const sortedProviders = providers
    .filter(x => Boolean(x.slots))
    .sort((a, b) => b.slots - a.slots)

  const selectedProvider = sortedProviders.length && sortedProviders[state]

  return (
    <Layout canRedirect={false}>
      <Page mb={14}>
        <Box w="full">
          <Flex align="center" justify="space-between">
            <PageTitle>Rent a shared node</PageTitle>
            <CloseButton onClick={() => router.back()} />
          </Flex>
          <Box>
            <Table>
              <thead>
                <TableRow>
                  <TableHeaderCol width={rem(40)}></TableHeaderCol>
                  <TableHeaderCol>Node URL</TableHeaderCol>
                  <TableHeaderCol>Owner</TableHeaderCol>
                  <TableHeaderCol>Location</TableHeaderCol>
                  <TableHeaderCol className="text-right">
                    Slots available
                  </TableHeaderCol>
                  <TableHeaderCol className="text-right">
                    Price per validation
                  </TableHeaderCol>
                </TableRow>
              </thead>
              <tbody>
                {identity &&
                  sortedProviders.map((p, idx) => (
                    <TableRow isLast={idx === sortedProviders.length - 1}>
                      <TableCol>
                        <Radio
                          isChecked={state === idx}
                          onClick={() => setState(idx)}
                          borderColor="#d2d4d9"
                        />
                      </TableCol>
                      <TableCol>
                        <Flex direction="column">
                          <Flex>{p.data.url}</Flex>
                          <ProviderStatus url={p.data.url}></ProviderStatus>
                        </Flex>
                      </TableCol>
                      <TableCol>
                        <Link
                          target="_blank"
                          rel="noreferrer"
                          color="brandBlue.100"
                          href={`https://t.me/${p.data.ownerName}`}
                        >
                          {p.data.ownerName}
                        </Link>
                      </TableCol>
                      <TableCol>{p.data.location}</TableCol>
                      <TableCol className="text-right">{p.slots}</TableCol>
                      <TableCol className="text-right">
                        {GetProviderPrice(p.data, identity?.state)} iDNA
                      </TableCol>
                    </TableRow>
                  ))}
              </tbody>
            </Table>
          </Box>
        </Box>
        <Stack
          isInline
          spacing={2}
          justify="flex-end"
          bg="white"
          borderTop="1px"
          borderTopColor="gray.100"
          px={4}
          py={3}
          h={14}
          position="fixed"
          bottom={0}
          left={0}
          right={0}
        >
          <SecondaryButton onClick={router.back}>Cancel</SecondaryButton>
          <PrimaryButton onClick={buySharedNodeDisclosure.onOpen}>
            Continue
          </PrimaryButton>
        </Stack>
      </Page>
      <BuySharedNodeForm
        {...buySharedNodeDisclosure}
        providerId={selectedProvider && selectedProvider.id}
        url={selectedProvider && selectedProvider.data.url}
        from={coinbase}
        amount={
          selectedProvider &&
          GetProviderPrice(selectedProvider.data, identity?.state)
        }
        to={selectedProvider && selectedProvider.data.address}
      />
    </Layout>
  )
}
