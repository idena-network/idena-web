/* eslint-disable react/prop-types */
import {
  Box,
  CloseButton,
  Divider,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Button,
  Link,
  Radio,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Thead,
  Tr,
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
import {Page, PageTitleNew} from '../../screens/app/components'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import Layout from '../../shared/components/layout'
import {useAuthState} from '../../shared/providers/auth-context'
import {SYNCING_DIFF} from '../../shared/providers/settings-context'
import {fetchIdentity} from '../../shared/api'
import {Drawer, RoundedTh} from '../../shared/components/components'
import {AngleArrowBackIcon, SoftStarIcon} from '../../shared/components/icons'

function ProviderStatus({url, fontSize, color}) {
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
          <Text color={color || 'muted'} fontSize={[fontSize || 'md', 'sm']}>
            {t('Connecting...')}
          </Text>
        </Flex>
      )}
      {isError && (
        <Flex>
          <Text color={color || 'muted'} fontSize={[fontSize || 'md', 'sm']}>
            {t('Not available')}
          </Text>
        </Flex>
      )}
      {isSuccess && !outOfSync && (
        <Flex>
          <Text
            color={color || 'green.500'}
            fontSize={[fontSize || 'md', 'sm']}
          >
            {t('Online')}
          </Text>
        </Flex>
      )}
      {isSuccess && outOfSync && (
        <Flex>
          <Text
            color={color || 'warning.500'}
            fontSize={[fontSize || 'md', 'sm']}
          >
            {t('Synchronizing: {{blocksCount}} blocks left', {
              blocksCount,
            })}
          </Text>
        </Flex>
      )}
    </>
  )
}

function ProviderInfoRow({title, children, ...props}) {
  return (
    <Flex direction="column" mt={2} {...props}>
      <Text fontSize="base" fontWeight={500} color="brandGray.500">
        {title}
      </Text>
      {children}
      <Divider mt="10px" />
    </Flex>
  )
}

function ProviderInfoDrawer({p, identity, onClose, onSubmit, ...props}) {
  return (
    <Drawer placement="right" size="full" {...props}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerHeader>
          <AngleArrowBackIcon
            position="absolute"
            left={4}
            top={4}
            onClick={onClose}
          />
          <Flex
            direction="column"
            textAlign="center"
            fontWeight="normal"
            align="center"
            mt="2px"
          >
            <Text fontSize="base" fontWeight="bold" color="gray.500">
              {p.data.url}
            </Text>
            <ProviderStatus url={p.data.url} fontSize="mdx" />
          </Flex>
        </DrawerHeader>
        <DrawerBody pt={0} px={8}>
          <ProviderInfoRow title="Node URL">
            <Text color="brandBlue.500">{p.data.url}</Text>
          </ProviderInfoRow>
          <ProviderInfoRow title="Website">
            <Text color="brandBlue.500">{p.data.url}</Text>
          </ProviderInfoRow>
          <ProviderInfoRow title="Owner">
            <Text color="brandBlue.500">{p.data.ownerName}</Text>
          </ProviderInfoRow>
          <ProviderInfoRow title="Location">
            <Text color="muted">{p.data.location}</Text>
          </ProviderInfoRow>
          <Flex justify="space-between">
            <ProviderInfoRow title="Slots available" w="47%">
              <Flex>
                <Text color="gray.500" mr={1}>
                  {p.slots}
                </Text>
                <Text color="muted">/ FILL</Text>
              </Flex>
            </ProviderInfoRow>
            <ProviderInfoRow title="Price per validator" w="47%">
              <Text color="muted">
                {GetProviderPrice(p.data, identity?.state)} iDNA
              </Text>
            </ProviderInfoRow>
          </Flex>
          <ProviderInfoRow title="Users for the last validation">
            <Text color="muted">FILL_USERS</Text>
          </ProviderInfoRow>
          <Flex justify="space-between">
            <ProviderInfoRow title="Success ratio" w="47%">
              <Text color="muted">FILL_RATIO</Text>
            </ProviderInfoRow>
            <ProviderInfoRow title="Rating" w="47%">
              <Text color="muted">FILL_RATING</Text>
            </ProviderInfoRow>
          </Flex>
          <Button
            variant="primary"
            size="lg"
            mt={6}
            w="100%"
            onClick={onSubmit}
          >
            Continue with this node
          </Button>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
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

  const {
    isOpen: isOpenRentDetailDrawer,
    onOpen: onOpenRentDetailDrawer,
    onClose: onCloseRentDetailDrawer,
  } = useDisclosure()

  const sharedNodeRating = '5.0'
  const sharedNodeCapacity = '1000'

  const sortedProviders = providers
    .filter(x => Boolean(x.slots))
    .sort((a, b) => b.slots - a.slots)

  const selectedProvider = sortedProviders.length && sortedProviders[state]

  return (
    <Layout canRedirect={false}>
      <Page mb={14} pt={[4, 6]}>
        <Box w="full">
          <Flex align="center" justify="space-between">
            <AngleArrowBackIcon
              display={['block', 'none']}
              position="absolute"
              left={4}
              top={4}
              h="28px"
              w="28px"
              onClick={() => {
                router.back()
              }}
            />
            <PageTitleNew>Rent a shared node</PageTitleNew>
            <CloseButton
              display={['none', 'flex']}
              onClick={() => router.back()}
            />
          </Flex>
          <Box>
            <Table>
              <Thead display={['none', 'table-header-group']}>
                <Tr>
                  <RoundedTh isLeft width={rem(40)}></RoundedTh>
                  <RoundedTh>Node URL</RoundedTh>
                  <RoundedTh>Owner</RoundedTh>
                  <RoundedTh>Location</RoundedTh>
                  <RoundedTh textAlign="right">Slots available</RoundedTh>
                  <RoundedTh isRight textAlign="right">
                    Price per validation
                  </RoundedTh>
                </Tr>
              </Thead>
              <Tbody>
                {identity &&
                  sortedProviders.map((p, idx) => (
                    <Tr>
                      <Td display={['none', 'table-cell']}>
                        <Radio
                          isChecked={state === idx}
                          onClick={() => setState(idx)}
                          borderColor="#d2d4d9"
                        />
                      </Td>
                      <Td
                        borderBottom={['solid 0px', 'solid 1px #e8eaed']}
                        px={[0, 3]}
                        py={[1, 2]}
                      >
                        <Flex
                          direction="column"
                          border={['solid 1px', 'initial']}
                          borderColor={['gray.100', 'inherit']}
                          borderRadius={['8px', 0]}
                          p={[4, 0]}
                          onClick={() => {
                            setState(idx)
                            onOpenRentDetailDrawer()
                          }}
                        >
                          <Flex
                            justifyContent={['space-between', 'flex-start']}
                          >
                            <Flex direction="column" maxW={['80%', 'initial']}>
                              <Text
                                fontSize={['mdx', 'md']}
                                fontWeight={[500, 400]}
                                isTruncated
                              >
                                {p.data.url}
                              </Text>
                              <ProviderStatus url={p.data.url}></ProviderStatus>
                            </Flex>
                            <Flex display={['flex', 'none']}>
                              <Text
                                fontSize="mdx"
                                fontWeight={500}
                                color="gray.064"
                              >
                                {sharedNodeRating}
                              </Text>
                              <SoftStarIcon mt="3px" ml="3px" h={4} w={4} />
                            </Flex>
                          </Flex>
                          <Flex
                            display={['flex', 'none']}
                            justifyContent="flex-start"
                          >
                            <Flex
                              direction="column"
                              fontSize="base"
                              color="gray.064"
                              mt={4}
                              w="50%"
                            >
                              <Text>Slots available</Text>
                              <Flex>
                                <Text color="gray.500" mr={1}>
                                  {p.slots}
                                </Text>
                                <Text>{`/ ${sharedNodeCapacity}`}</Text>
                              </Flex>
                            </Flex>
                            <Flex
                              direction="column"
                              fontSize="base"
                              color="gray.064"
                              mt={4}
                              w="50%"
                            >
                              <Text>Price</Text>
                              <Flex>
                                <Text color="gray.500">
                                  {GetProviderPrice(p.data, identity?.state)}{' '}
                                  iDNA
                                </Text>
                              </Flex>
                            </Flex>
                          </Flex>
                        </Flex>
                      </Td>
                      <Td display={['none', 'table-cell']}>
                        <Link
                          target="_blank"
                          rel="noreferrer"
                          color="brandBlue.100"
                          href={`https://t.me/${p.data.ownerName}`}
                        >
                          {p.data.ownerName}
                        </Link>
                      </Td>
                      <Td display={['none', 'table-cell']}>
                        {p.data.location}
                      </Td>
                      <Td display={['none', 'table-cell']} textAlign="right">
                        {p.slots}
                      </Td>
                      <Td display={['none', 'table-cell']} textAlign="right">
                        {GetProviderPrice(p.data, identity?.state)} iDNA
                      </Td>
                    </Tr>
                  ))}
              </Tbody>
            </Table>
          </Box>
        </Box>
        <Stack
          display={['none', 'flex']}
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

      <ProviderInfoDrawer
        p={selectedProvider}
        identity={identity}
        isOpen={isOpenRentDetailDrawer}
        onClose={onCloseRentDetailDrawer}
        onSubmit={buySharedNodeDisclosure.onOpen}
      />

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
