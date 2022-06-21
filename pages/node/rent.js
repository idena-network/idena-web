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
import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useQuery} from 'react-query'
import {BuySharedNodeForm} from '../../screens/node/components'
import {getLastBlock} from '../../shared/api/indexer'
import {checkProviderSyncing, getProviders} from '../../shared/api/marketplace'
import {GetProviderPrice} from '../../screens/node/utils'
import {Page, PageTitleNew} from '../../screens/app/components'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import Layout from '../../shared/components/layout'
import {useAuthState} from '../../shared/providers/auth-context'
import {SYNCING_DIFF} from '../../shared/providers/settings-context'
import {fetchIdentity} from '../../shared/api'
import {Drawer, RoundedTh, Skeleton} from '../../shared/components/components'
import {AngleArrowBackIcon, SoftStarIcon} from '../../shared/components/icons'
import {useIsDesktop} from '../../shared/utils/utils'
import {shuffle} from '../../shared/utils/arr'

const MAX_DURATION = 99999

const ProviderStatus = {
  Loading: 0,
  Success: 1,
  Error: 2,
  OutOfSync: 3,
}

function ProviderStatusLabel({status, blocksLeft, fontSize, color}) {
  const {t} = useTranslation()

  return (
    <>
      {status === ProviderStatus.Loading && (
        <Flex>
          <Text color={color || 'muted'} fontSize={[fontSize || 'md', 'sm']}>
            {t('Connecting...')}
          </Text>
        </Flex>
      )}
      {status === ProviderStatus.Error && (
        <Flex>
          <Text color={color || 'muted'} fontSize={[fontSize || 'md', 'sm']}>
            {t('Not available')}
          </Text>
        </Flex>
      )}
      {status === ProviderStatus.Success && (
        <Flex>
          <Text
            color={color || 'green.500'}
            fontSize={[fontSize || 'md', 'sm']}
          >
            {t('Online')}
          </Text>
        </Flex>
      )}
      {status === ProviderStatus.OutOfSync && (
        <Flex>
          <Text
            color={color || 'warning.500'}
            fontSize={[fontSize || 'md', 'sm']}
          >
            {t('Synchronizing: {{blocksCount}} blocks left', {
              blocksCount: blocksLeft,
              nsSeparator: '|',
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
  const {t} = useTranslation()
  return (
    <Drawer placement="right" size="full" {...props}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerHeader>
          <AngleArrowBackIcon
            stroke="#578FFF"
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
            <ProviderStatusLabel
              status={p.status}
              blocksLeft={p.blocksLeft}
              fontSize="mdx"
            />
          </Flex>
        </DrawerHeader>
        <DrawerBody pt={0} px={8}>
          <ProviderInfoRow title="Node URL">
            <Text color="brandBlue.500">{p.data.url}</Text>
          </ProviderInfoRow>
          <ProviderInfoRow display="none" title="Website">
            <Text color="brandBlue.500">FILL_WEBSITE</Text>
          </ProviderInfoRow>
          <ProviderInfoRow title="Owner">
            <Link
              target="_blank"
              rel="noreferrer"
              color="brandBlue.500"
              href={`https://t.me/${p.data.ownerName}`}
            >
              {p.data.ownerName}
            </Link>
          </ProviderInfoRow>
          <ProviderInfoRow title="Location">
            <Text color="muted">{p.data.location}</Text>
          </ProviderInfoRow>
          <Flex justify="space-between">
            <ProviderInfoRow title="Slots available" w="46%">
              <Flex>
                <Text color="gray.500" mr={1}>
                  {p.slots}
                </Text>
                <Text display="none" color="muted">
                  / FILL
                </Text>
              </Flex>
            </ProviderInfoRow>
            <ProviderInfoRow title="Price per validation" w="50%">
              <Text color="muted">
                {GetProviderPrice(p.data, identity?.state, identity?.age)} iDNA
              </Text>
            </ProviderInfoRow>
          </Flex>
          <ProviderInfoRow display="none" title="Users for the last validation">
            <Text color="muted">FILL_USERS</Text>
          </ProviderInfoRow>
          <Flex display="none" justify="space-between">
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
            {t('Continue with this node')}
          </Button>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  )
}

function mergeProviders(prev, provider) {
  if (prev.find(x => x.id === provider.id)) return prev

  const success = prev.filter(x => x.status === ProviderStatus.Success)
  const outOfSync = prev.filter(x => x.status === ProviderStatus.OutOfSync)
  const error = prev.filter(
    x => ![ProviderStatus.Success, ProviderStatus.OutOfSync].includes(x.status)
  )
  if (provider.status === ProviderStatus.Success) success.push(provider)
  else if (provider.status === ProviderStatus.OutOfSync)
    outOfSync.push(provider)
  else error.push(provider)

  success.sort((a, b) => {
    if (a.duration === b.duration) return a.id > b.id
    return a.duration - b.duration
  })

  return [...success, ...outOfSync, ...error]
}

export default function Rent() {
  const router = useRouter()
  const {t} = useTranslation()

  const {coinbase} = useAuthState()

  const buySharedNodeDisclosure = useDisclosure()

  const [state, setState] = useState(0)

  const [checkedProviders, setCheckedProviders] = useState([])

  const {
    data: indexerData,
    isFetched: indexerIsFetched,
    isLoading: indexerIsLoading,
  } = useQuery(['last-block'], () => getLastBlock(), {
    retry: false,
    refetchOnWindowFocus: false,
  })

  const {data: identity, isLoading: identityIsLoading} = useQuery(
    ['fetch-identity', coinbase],
    () => fetchIdentity(coinbase, true),
    {
      enabled: !!coinbase,
      refetchOnWindowFocus: false,
    }
  )

  const {data: providers, isLoading: providersIsLoading} = useQuery(
    ['providers'],
    getProviders,
    {
      initialData: [],
      enabled: !!indexerIsFetched,
      refetchOnWindowFocus: false,
    }
  )

  const indexerLastBlock = indexerData?.height || 0

  useEffect(() => {
    async function updateStatus() {
      const shuffled = shuffle(providers.filter(x => Boolean(x.slots)))
      shuffled.forEach(provider => {
        checkProviderSyncing(provider.data.url)
          .then(response =>
            setCheckedProviders(prev => {
              const blocksLeft = indexerLastBlock - response?.currentBlock
              return mergeProviders(prev, {
                ...provider,
                duration: response.duration,
                blocksLeft,
                status:
                  blocksLeft > SYNCING_DIFF
                    ? ProviderStatus.OutOfSync
                    : ProviderStatus.Success,
              })
            })
          )
          .catch(() =>
            setCheckedProviders(prev =>
              mergeProviders(prev, {
                ...provider,
                duration: MAX_DURATION,
                status: ProviderStatus.Error,
              })
            )
          )
      })
    }
    if (providers.length) updateStatus()
  }, [indexerLastBlock, providers])

  const isLoading = indexerIsLoading || identityIsLoading || providersIsLoading

  const isDesktop = useIsDesktop()

  const {
    isOpen: isOpenRentDetailDrawer,
    onOpen: onOpenRentDetailDrawer,
    onClose: onCloseRentDetailDrawer,
  } = useDisclosure()

  const selectedProvider = checkedProviders.length && checkedProviders[state]

  return (
    <Layout canRedirect={false}>
      <Page mb={14} pt={[4, 6]}>
        <Box w="full">
          <Flex align="center" justify="space-between">
            <AngleArrowBackIcon
              stroke="#578FFF"
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
            <PageTitleNew>{t('Rent a shared node')}</PageTitleNew>
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
                  <RoundedTh>{t('Node URL')}</RoundedTh>
                  <RoundedTh>{t('Owner')}</RoundedTh>
                  <RoundedTh>{t('Location')}</RoundedTh>
                  <RoundedTh>{t('Latency, sec')}</RoundedTh>
                  <RoundedTh textAlign="right">
                    {t('Slots available')}
                  </RoundedTh>
                  <RoundedTh isRight textAlign="right">
                    {t('Price per validation')}
                  </RoundedTh>
                </Tr>
              </Thead>
              <Tbody>
                {isLoading
                  ? new Array(10).fill(0).map((_, idx) => (
                      <Tr key={idx}>
                        <Td colSpan={7} px={0}>
                          <Skeleton h={[32, 8]} />
                        </Td>
                      </Tr>
                    ))
                  : checkedProviders.map((p, idx) => (
                      <Tr key={idx}>
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
                              if (!isDesktop) onOpenRentDetailDrawer()
                            }}
                          >
                            <Flex justifyContent="flex-start">
                              <Flex
                                direction="column"
                                maxW={['100%', 'initial']}
                              >
                                <Text
                                  fontSize={['mdx', 'md']}
                                  fontWeight={[500, 400]}
                                  isTruncated
                                >
                                  {p.data.url}
                                </Text>
                                <ProviderStatusLabel
                                  status={p.status}
                                  blocksLeft={p.blocksLeft}
                                ></ProviderStatusLabel>
                              </Flex>
                              <Flex display="none">
                                <Text
                                  fontSize="mdx"
                                  fontWeight={500}
                                  color="gray.064"
                                >
                                  FILL_RATING
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
                                <Text>{t('Latency, sec')}</Text>
                                <Flex>
                                  <Text color="gray.500" mr={1}>
                                    {p.status === ProviderStatus.Error
                                      ? '—'
                                      : (p.duration / 1000).toFixed(3)}
                                  </Text>
                                  <Text display="none">/ FILL_SLOTS</Text>
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
                                    {GetProviderPrice(
                                      p.data,
                                      identity?.state,
                                      identity?.age
                                    )}{' '}
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
                        <Td display={['none', 'table-cell']}>
                          {p.status === ProviderStatus.Error
                            ? '—'
                            : (p.duration / 1000).toFixed(3)}
                        </Td>
                        <Td display={['none', 'table-cell']} textAlign="right">
                          {p.slots}
                        </Td>
                        <Td display={['none', 'table-cell']} textAlign="right">
                          {GetProviderPrice(
                            p.data,
                            identity?.state,
                            identity?.age
                          )}{' '}
                          iDNA
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
            {t('Continue')}
          </PrimaryButton>
        </Stack>
      </Page>

      {selectedProvider && identity && (
        <ProviderInfoDrawer
          p={selectedProvider}
          identity={identity}
          isOpen={isOpenRentDetailDrawer}
          onClose={onCloseRentDetailDrawer}
          onSubmit={buySharedNodeDisclosure.onOpen}
        />
      )}

      <BuySharedNodeForm
        {...buySharedNodeDisclosure}
        providerId={selectedProvider && selectedProvider.id}
        url={selectedProvider && selectedProvider.data.url}
        from={coinbase}
        amount={
          selectedProvider &&
          GetProviderPrice(
            selectedProvider.data,
            identity?.state,
            identity?.age
          )
        }
        to={selectedProvider && selectedProvider.data.address}
      />
    </Layout>
  )
}
