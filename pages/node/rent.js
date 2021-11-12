import {
  Box,
  CloseButton,
  Flex,
  Link,
  Radio,
  Stack,
  Text,
} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {rem} from 'polished'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useQuery} from 'react-query'
import {Page, PageTitle} from '../../screens/app/components'
import {BuySharedNodeForm} from '../../screens/node/components'
import {getLastBlock} from '../../shared/api/indexer'
import {
  checkProvider,
  checkProviderSyncing,
  getProviders,
} from '../../shared/api/marketplace'
import {GetProviderPrice} from '../../screens/node/utils'
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
import {useIdentity} from '../../shared/providers/identity-context'

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

  const blocksCount =
    indexerData?.result?.height - syncingData?.result?.currentBlock

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

  const [showDrawer, setShowDrawer] = useState(false)

  const [state, setState] = useState(0)

  const fetchProviders = () => getProviders()

  const {data: providers} = useQuery(['providers'], fetchProviders, {
    initialData: [],
  })

  const [{state: identityState}] = useIdentity()

  const sortedProviders = providers
    .filter(x => x.slots)
    .sort((a, b) => b.slots - a.slots)

  const selectedProvider = sortedProviders.length && sortedProviders[state]

  return (
    <Layout canRedirect={false}>
      <Page p={0} overflowY="hidden">
        <Flex
          direction="column"
          flex={1}
          alignSelf="stretch"
          pt={6}
          px={20}
          mx={-20}
          pb={9}
          overflowY="auto"
        >
          <Flex align="center" alignSelf="stretch" justify="space-between">
            <PageTitle>Rent a shared node</PageTitle>
            <CloseButton onClick={() => router.back()} />
          </Flex>
          <Flex width="100%">
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
                {sortedProviders.map((p, idx) => (
                  <TableRow>
                    <TableCol>
                      <Radio
                        isChecked={state === idx}
                        onClick={() => setState(idx)}
                        borderColor="#d2d4d9"
                      ></Radio>
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
                      {GetProviderPrice(p.data, identityState)} iDNA
                    </TableCol>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </Flex>
        </Flex>
        <Box
          alignSelf="stretch"
          borderTop="1px"
          borderTopColor="gray.100"
          mt="auto"
          px={4}
          py={3}
        >
          <Stack isInline spacing={2} justify="flex-end">
            <SecondaryButton onClick={() => router.back()}>
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={() => setShowDrawer(true)}>
              Continue
            </PrimaryButton>
          </Stack>
        </Box>
        <BuySharedNodeForm
          isOpen={showDrawer}
          onClose={() => setShowDrawer(false)}
          providerId={selectedProvider && selectedProvider.id}
          url={selectedProvider && selectedProvider.data.url}
          from={coinbase}
          amount={
            selectedProvider &&
            GetProviderPrice(selectedProvider.data, identityState)
          }
          to={selectedProvider && selectedProvider.data.address}
        />
      </Page>
    </Layout>
  )
}
