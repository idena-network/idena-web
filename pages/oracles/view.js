import React from 'react'
import {
  Stack,
  Box,
  Text,
  Heading,
  RadioGroup,
  Flex,
  Stat,
  StatNumber,
  StatLabel,
  useToast,
  CloseButton,
  Divider,
  Table,
  Thead,
  Tr,
  Tbody,
  useDisclosure,
} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useMachine} from '@xstate/react'
import {useRouter} from 'next/router'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import duration from 'dayjs/plugin/duration'
import {ArrowDownIcon, ArrowUpIcon, ViewIcon} from '@chakra-ui/icons'
import {
  Avatar,
  GoogleTranslateButton,
  Toast,
  Tooltip,
  VDivider,
  Dialog,
  DialogHeader,
  DialogFooter,
  DialogBody,
  SmallText,
  RoundedTh,
} from '../../shared/components/components'
import {
  IconButton,
  PrimaryButton,
  SecondaryButton,
} from '../../shared/components/button'
import {
  eitherState,
  openExternalUrl,
  toLocaleDna,
  toPercent,
} from '../../shared/utils/utils'
import {
  FillCenter,
  OraclesTxsValueTd,
  ReviewNewPendingVoteDialog,
  VotingBadge,
  VotingOption,
  VotingSkeleton,
} from '../../screens/oracles/components'
import {
  AddFundDrawer,
  VotingStatusBadge,
  VoteDrawer,
  AsideStat,
  VotingResult,
  LaunchDrawer,
  ProlongDrawer,
  VotingPhase,
  TerminateDrawer,
  FinishDrawer,
  Linkify,
  OracleAdDescription,
} from '../../screens/oracles/containers'
import {useEpoch} from '../../shared/providers/epoch-context'
import {VotingStatus} from '../../shared/types'
import {
  areSameCaseInsensitive,
  hasWinner,
  humanError,
  validateAdVoting,
  mapVotingStatus,
  quorumVotesCount,
  votingMinBalance,
} from '../../screens/oracles/utils'
import {
  ContractTransactionType,
  ContractCallMethod,
} from '../../screens/oracles/types'
import Layout from '../../shared/components/layout'
import {Page} from '../../screens/app/components'
import {
  AddFundIcon,
  CoinsLgIcon,
  OkIcon,
  RefreshIcon,
  StarIcon,
  UserIcon,
  UserTickIcon,
} from '../../shared/components/icons'
import {useAuthState} from '../../shared/providers/auth-context'
import {useBalance} from '../../shared/hooks/use-balance'
import {viewVotingMachine} from '../../screens/oracles/machines'
import {useDeferredVotes, useOracleActions} from '../../screens/oracles/hooks'
import {AdPreview} from '../../screens/ads/containers'
import {useIpfsAd} from '../../screens/ads/hooks'

dayjs.extend(relativeTime)
dayjs.extend(duration)

export default function ViewVotingPage() {
  const {t, i18n} = useTranslation()

  const [, {addVote}] = useDeferredVotes()

  const toast = useToast()

  const {
    query: {id},
    push: redirect,
  } = useRouter()

  const {epoch} = useEpoch() ?? {epoch: -1}

  const {coinbase, privateKey} = useAuthState()
  const {
    data: {balance: identityBalance},
  } = useBalance()

  const [current, send, service] = useMachine(viewVotingMachine, {
    actions: {
      onError: (context, {data: {message}}) => {
        toast({
          status: 'error',
          // eslint-disable-next-line react/display-name
          render: () => (
            <Toast title={humanError(message, context)} status="error" />
          ),
        })
      },
      addVote: (_, {data: {vote}}) => addVote(vote),
    },
  })

  React.useEffect(() => {
    send('RELOAD', {id, epoch, address: coinbase})
  }, [coinbase, epoch, id, send])

  const toDna = toLocaleDna(i18n.language)

  const {
    title,
    desc,
    contractHash,
    status,
    balance = 0,
    contractBalance = Number(balance),
    votingMinPayment = 0,
    publicVotingDuration = 0,
    quorum = 20,
    committeeSize,
    options = [],
    votes = [],
    voteProofsCount,
    finishDate,
    finishCountingDate,
    selectedOption,
    winnerThreshold = 50,
    balanceUpdates,
    ownerFee,
    totalReward,
    estimatedOracleReward,
    estimatedMaxOracleReward = estimatedOracleReward,
    isOracle,
    minOracleReward,
    estimatedTotalReward,
    pendingVote,
    adCid,
    issuer,
  } = current.context

  const [
    {canProlong, canFinish, canTerminate, isFetching: actionsIsFetching},
    refetchActions,
  ] = useOracleActions(id)

  const isLoaded = !current.matches('loading')

  const sameString = a => b => areSameCaseInsensitive(a, b)

  const eitherIdleState = (...states) =>
    eitherState(current, ...states.map(s => `idle.${s}`.toLowerCase())) ||
    states.some(sameString(status))

  const isClosed = eitherIdleState(
    VotingStatus.Archived,
    VotingStatus.Terminated
  )

  const didDetermineWinner = hasWinner({
    votes,
    votesCount: voteProofsCount,
    winnerThreshold,
    quorum,
    committeeSize,
    finishCountingDate,
  })

  const isMaxWinnerThreshold = winnerThreshold === 100

  const accountableVoteCount =
    votes?.reduce((agg, curr) => agg + curr?.count, 0) ?? 0

  const {data: ad} = useIpfsAd(adCid)

  const adPreviewDisclosure = useDisclosure()

  const isMaliciousAdVoting = React.useMemo(
    () => validateAdVoting({ad, voting: current.context}) === false,
    [ad, current.context]
  )

  return (
    <>
      <Layout>
        <Page pt={8}>
          <Stack spacing={10}>
            <VotingSkeleton isLoaded={isLoaded} h={6}>
              <Stack isInline spacing={2} align="center">
                <VotingStatusBadge status={status} fontSize="md">
                  {t(mapVotingStatus(status))}
                </VotingStatusBadge>
                <Box
                  as={VotingBadge}
                  bg="gray.100"
                  color="muted"
                  fontSize="md"
                  cursor="pointer"
                  pl="1/2"
                  transition="color 0.2s ease"
                  _hover={{
                    color: 'brandGray.500',
                  }}
                  onClick={() => {
                    openExternalUrl(
                      `https://scan.idena.io/contract/${contractHash}`
                    )
                  }}
                >
                  <Stack isInline spacing={1} align="center">
                    <Avatar size={5} address={contractHash} />
                    <Text>{contractHash}</Text>
                  </Stack>
                </Box>
                <CloseButton
                  sx={{
                    '&': {
                      marginLeft: 'auto!important',
                    },
                  }}
                  onClick={() => redirect('/oracles/list')}
                />
              </Stack>
            </VotingSkeleton>
            <Stack isInline spacing={10} w="full">
              <Box minWidth="lg" maxW="lg">
                <Stack spacing={6}>
                  <VotingSkeleton isLoaded={isLoaded}>
                    <Stack
                      spacing={8}
                      borderRadius="md"
                      bg="gray.50"
                      py={8}
                      px={10}
                    >
                      <Stack spacing={4}>
                        <Heading
                          overflow="hidden"
                          fontSize={21}
                          fontWeight={500}
                          display="-webkit-box"
                          sx={{
                            '&': {
                              WebkitBoxOrient: 'vertical',
                              WebkitLineClamp: '2',
                            },
                          }}
                        >
                          {isMaliciousAdVoting
                            ? t('Please reject malicious ad')
                            : title}
                        </Heading>
                        {ad ? (
                          <>
                            {isMaliciousAdVoting ? (
                              <Box position="relative" filter="blur(2px)">
                                <Box
                                  position="absolute"
                                  inset={0}
                                  backdropFilter="blur(2px)"
                                  zIndex="banner"
                                />
                                <OracleAdDescription ad={ad} />
                              </Box>
                            ) : (
                              <OracleAdDescription ad={ad} />
                            )}
                          </>
                        ) : (
                          <Text
                            isTruncated
                            lineHeight="tall"
                            whiteSpace="pre-wrap"
                          >
                            <Linkify
                              onClick={url => {
                                send('FOLLOW_LINK', {url})
                              }}
                            >
                              {desc}
                            </Linkify>
                          </Text>
                        )}
                      </Stack>
                      <Flex>
                        {adCid && (
                          <IconButton
                            icon={<ViewIcon boxSize={4} />}
                            _hover={{background: 'transparent'}}
                            onClick={adPreviewDisclosure.onOpen}
                          >
                            {t('Preview')}
                          </IconButton>
                        )}
                        <GoogleTranslateButton
                          phrases={[
                            title,
                            desc &&
                              encodeURIComponent(desc?.replace(/%/g, '%25')),
                            options.map(({value}) => value).join('\n'),
                          ]}
                          locale={i18n.language}
                          alignSelf="start"
                        />
                      </Flex>
                      <Divider orientation="horizontal" />
                      {isLoaded && <VotingPhase service={service} />}
                    </Stack>
                  </VotingSkeleton>

                  {eitherIdleState(
                    VotingStatus.Pending,
                    VotingStatus.Starting,
                    VotingStatus.Open,
                    VotingStatus.Voting,
                    VotingStatus.Voted,
                    VotingStatus.Prolonging
                  ) && (
                    <VotingSkeleton isLoaded={isLoaded}>
                      <Box>
                        <Text color="muted" fontSize="sm" mb={3}>
                          {t('Choose an option to vote')}
                        </Text>
                        {eitherIdleState(VotingStatus.Voted) ? (
                          <Stack spacing={3}>
                            {/* eslint-disable-next-line no-shadow */}
                            {options.map(({id, value}) => {
                              const isMine = id === selectedOption
                              return (
                                <Stack
                                  isInline
                                  spacing={2}
                                  align="center"
                                  bg={isMine ? 'blue.012' : 'gray.50'}
                                  borderRadius="md"
                                  minH={8}
                                  px={3}
                                  py={2}
                                  zIndex={1}
                                >
                                  <Flex
                                    align="center"
                                    justify="center"
                                    bg={
                                      isMine ? 'brandBlue.500' : 'transparent'
                                    }
                                    borderRadius="full"
                                    borderWidth={isMine ? 0 : '4px'}
                                    borderColor="gray.100"
                                    color="white"
                                    w={4}
                                    h={4}
                                  >
                                    {isMine && <OkIcon boxSize={3} />}
                                  </Flex>

                                  <Text
                                    isTruncated
                                    maxW="sm"
                                    title={value.length > 50 ? value : ''}
                                  >
                                    {value}
                                  </Text>
                                </Stack>
                              )
                            })}
                          </Stack>
                        ) : (
                          <RadioGroup
                            value={String(selectedOption)}
                            onChange={value => {
                              send('SELECT_OPTION', {
                                option: Number(value),
                              })
                            }}
                          >
                            <Stack spacing={2}>
                              {/* eslint-disable-next-line no-shadow */}
                              {options.map(({id, value}) => (
                                <VotingOption
                                  key={id}
                                  value={String(id)}
                                  isDisabled={eitherIdleState(
                                    VotingStatus.Pending,
                                    VotingStatus.Starting,
                                    VotingStatus.Voted
                                  )}
                                  annotation={
                                    isMaxWinnerThreshold
                                      ? null
                                      : t('{{count}} min. votes required', {
                                          count: toPercent(
                                            winnerThreshold / 100
                                          ),
                                        })
                                  }
                                >
                                  {value}
                                </VotingOption>
                              ))}
                            </Stack>
                          </RadioGroup>
                        )}
                      </Box>
                    </VotingSkeleton>
                  )}

                  {eitherIdleState(
                    VotingStatus.Counting,
                    VotingStatus.Finishing,
                    VotingStatus.Archived,
                    VotingStatus.Terminating,
                    VotingStatus.Terminated
                  ) && (
                    <VotingSkeleton isLoaded={isLoaded}>
                      <Stack spacing={3}>
                        <Text color="muted" fontSize="sm">
                          {t('Voting results')}
                        </Text>
                        <VotingResult votingService={service} spacing={3} />
                      </Stack>
                    </VotingSkeleton>
                  )}

                  <VotingSkeleton isLoaded={!actionsIsFetching}>
                    <Flex justify="space-between" align="center">
                      <Stack isInline spacing={2}>
                        {eitherIdleState(VotingStatus.Pending) && (
                          <PrimaryButton
                            loadingText={t('Launching')}
                            onClick={() => {
                              send('REVIEW_START_VOTING', {
                                from: coinbase,
                              })
                            }}
                          >
                            {t('Launch')}
                          </PrimaryButton>
                        )}
                        {eitherIdleState(VotingStatus.Open) &&
                          (isOracle ? (
                            <PrimaryButton
                              isDisabled={Boolean(adCid) && isMaliciousAdVoting}
                              onClick={() => send('REVIEW')}
                            >
                              {t('Vote')}
                            </PrimaryButton>
                          ) : (
                            <Box>
                              <Tooltip
                                label={t(
                                  'This vote is not available to you. Only validated identities randomly selected to the committee can vote.'
                                )}
                                placement="top"
                                zIndex="tooltip"
                              >
                                {/* TODO: pretending to be a Box until https://github.com/chakra-ui/chakra-ui/pull/2272 caused by https://github.com/facebook/react/issues/11972 */}
                                <PrimaryButton as={Box} isDisabled>
                                  {t('Vote')}
                                </PrimaryButton>
                              </Tooltip>
                            </Box>
                          ))}

                        {eitherIdleState(VotingStatus.Counting) && canFinish && (
                          <PrimaryButton
                            isLoading={current.matches(
                              `mining.${VotingStatus.Finishing}`
                            )}
                            loadingText={t('Finishing')}
                            onClick={() => send('FINISH', {from: coinbase})}
                          >
                            {didDetermineWinner
                              ? t('Distribute rewards')
                              : t('Refund')}
                          </PrimaryButton>
                        )}

                        {eitherIdleState(
                          VotingStatus.Open,
                          VotingStatus.Voting,
                          VotingStatus.Voted,
                          VotingStatus.Counting
                        ) &&
                          canProlong && (
                            <PrimaryButton
                              onClick={() => send('REVIEW_PROLONG_VOTING')}
                            >
                              {t('Prolong voting')}
                            </PrimaryButton>
                          )}

                        {(eitherIdleState(
                          VotingStatus.Voted,
                          VotingStatus.Voting
                        ) ||
                          (eitherIdleState(VotingStatus.Counting) &&
                            !canProlong &&
                            !canFinish)) && (
                          <PrimaryButton as={Box} isDisabled>
                            {t('Vote')}
                          </PrimaryButton>
                        )}

                        {!eitherIdleState(
                          VotingStatus.Terminated,
                          VotingStatus.Terminating
                        ) &&
                          canTerminate && (
                            <PrimaryButton
                              colorScheme="red"
                              variant="solid"
                              _active={{}}
                              onClick={() => send('TERMINATE')}
                            >
                              {t('Terminate')}
                            </PrimaryButton>
                          )}
                      </Stack>
                      <Stack isInline spacing={3} align="center">
                        {eitherIdleState(
                          VotingStatus.Archived,
                          VotingStatus.Terminated
                        ) &&
                          !didDetermineWinner && (
                            <Text color="red.500">
                              {t('No winner selected')}
                            </Text>
                          )}
                        <VDivider />
                        <Stack isInline spacing={2} align="center">
                          {didDetermineWinner ? (
                            <UserTickIcon color="muted" boxSize={4} />
                          ) : (
                            <UserIcon color="muted" boxSize={4} />
                          )}

                          <Text as="span">
                            {t('{{count}} published votes', {
                              count: eitherIdleState(VotingStatus.Open)
                                ? voteProofsCount
                                : accountableVoteCount,
                            })}{' '}
                            {eitherIdleState(VotingStatus.Counting) &&
                              t('out of {{count}}', {count: voteProofsCount})}
                          </Text>
                        </Stack>
                      </Stack>
                    </Flex>
                  </VotingSkeleton>

                  <VotingSkeleton isLoaded={isLoaded}>
                    <Stack spacing={5}>
                      <Box>
                        <Text fontWeight={500}>{t('Recent transactions')}</Text>
                      </Box>
                      <Table style={{tableLayout: 'fixed', fontWeight: 500}}>
                        <Thead>
                          <Tr>
                            <RoundedTh isLeft>{t('Transaction')}</RoundedTh>
                            <RoundedTh>{t('Date and time')}</RoundedTh>
                            <RoundedTh isRight textAlign="right">
                              {t('Amount')}
                            </RoundedTh>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {balanceUpdates.map(
                            ({
                              hash,
                              type,
                              timestamp,
                              from,
                              amount,
                              fee,
                              tips,
                              balanceChange = 0,
                              contractCallMethod,
                            }) => {
                              const isSender = areSameCaseInsensitive(
                                from,
                                coinbase
                              )

                              const txCost =
                                (isSender ? -amount : 0) + balanceChange
                              const totalTxCost =
                                txCost - ((isSender ? fee : 0) + tips)

                              const isCredit = totalTxCost > 0

                              const color =
                                // eslint-disable-next-line no-nested-ternary
                                totalTxCost === 0
                                  ? 'brandGray.500'
                                  : isCredit
                                  ? 'blue.500'
                                  : 'red.500'

                              return (
                                <Tr key={hash}>
                                  <OraclesTxsValueTd>
                                    <Stack isInline>
                                      <Flex
                                        align="center"
                                        justify="center"
                                        bg={isCredit ? 'blue.012' : 'red.012'}
                                        color={color}
                                        borderRadius="lg"
                                        minH={8}
                                        minW={8}
                                      >
                                        {isSender ? (
                                          <ArrowUpIcon boxSize={5} />
                                        ) : (
                                          <ArrowDownIcon boxSize={5} />
                                        )}
                                      </Flex>
                                      <Box isTruncated>
                                        {contractCallMethod ? (
                                          <Text>
                                            {
                                              ContractCallMethod[
                                                contractCallMethod
                                              ]
                                            }
                                          </Text>
                                        ) : (
                                          <Text>
                                            {ContractTransactionType[type]}
                                          </Text>
                                        )}
                                        <SmallText isTruncated title={from}>
                                          {hash}
                                        </SmallText>
                                      </Box>
                                    </Stack>
                                  </OraclesTxsValueTd>
                                  <OraclesTxsValueTd>
                                    <Text>
                                      {new Date(timestamp).toLocaleString()}
                                    </Text>
                                  </OraclesTxsValueTd>
                                  <OraclesTxsValueTd textAlign="right">
                                    <Text
                                      color={color}
                                      overflowWrap="break-word"
                                    >
                                      {toLocaleDna(i18n.language, {
                                        signDisplay: 'exceptZero',
                                      })(txCost)}
                                    </Text>
                                    {isSender && (
                                      <SmallText>
                                        {t('Fee')} {toDna(fee + tips)}
                                      </SmallText>
                                    )}
                                  </OraclesTxsValueTd>
                                </Tr>
                              )
                            }
                          )}
                          {balanceUpdates.length === 0 && (
                            <Tr>
                              <OraclesTxsValueTd colSpan={3}>
                                <FillCenter py={12}>
                                  <Stack spacing={4} align="center">
                                    <CoinsLgIcon
                                      boxSize={20}
                                      color="gray.100"
                                    />

                                    <Text color="muted">
                                      {t('No transactions')}
                                    </Text>
                                  </Stack>
                                </FillCenter>
                              </OraclesTxsValueTd>
                            </Tr>
                          )}
                        </Tbody>
                      </Table>
                    </Stack>
                  </VotingSkeleton>
                </Stack>
              </Box>
              <VotingSkeleton isLoaded={isLoaded} h={isLoaded ? 'auto' : 'lg'}>
                <Box mt={3}>
                  <Box mt={-2} mb={4}>
                    <IconButton
                      icon={<RefreshIcon boxSize={5} />}
                      px={1}
                      pr={3}
                      _focus={null}
                      onClick={() => {
                        send('REFRESH')
                        refetchActions()
                      }}
                    >
                      {t('Refresh')}
                    </IconButton>
                  </Box>
                  {!isClosed && (
                    <Stat mb={8}>
                      <StatLabel as="div" color="muted" fontSize="md">
                        <Stack isInline spacing={2} align="center">
                          <StarIcon boxSize={4} color="white" />
                          <Text fontWeight={500}>{t('Prize pool')}</Text>
                        </Stack>
                      </StatLabel>
                      <StatNumber fontSize="base" fontWeight={500}>
                        {toDna(estimatedTotalReward)}
                      </StatNumber>
                      <Box mt={1}>
                        <IconButton
                          icon={<AddFundIcon boxSize={5} />}
                          onClick={() => {
                            send('ADD_FUND')
                          }}
                        >
                          {t('Add funds')}
                        </IconButton>
                      </Box>
                    </Stat>
                  )}
                  <Stack spacing={6}>
                    {!isClosed && (
                      <Stat>
                        <StatLabel color="muted" fontSize="md">
                          <Tooltip
                            label={
                              // eslint-disable-next-line no-nested-ternary
                              Number(votingMinPayment) > 0
                                ? isMaxWinnerThreshold
                                  ? t('Deposit will be refunded')
                                  : t(
                                      'Deposit will be refunded if your vote matches the majority'
                                    )
                                : t('Free voting')
                            }
                            placement="top"
                          >
                            <Text
                              as="span"
                              borderBottom="dotted 1px"
                              borderBottomColor="muted"
                              cursor="help"
                            >
                              {t('Voting deposit')}
                            </Text>
                          </Tooltip>
                        </StatLabel>
                        <StatNumber fontSize="base" fontWeight={500}>
                          {toDna(votingMinPayment)}
                        </StatNumber>
                      </Stat>
                    )}
                    {!isClosed && (
                      <Stat>
                        <StatLabel color="muted" fontSize="md">
                          <Tooltip
                            label={t('Including your Voting deposit')}
                            placement="top"
                          >
                            <Text
                              as="span"
                              borderBottom="dotted 1px"
                              borderBottomColor="muted"
                              cursor="help"
                            >
                              {t('Min reward')}
                            </Text>
                          </Tooltip>
                        </StatLabel>
                        <StatNumber fontSize="base" fontWeight={500}>
                          {toDna(estimatedOracleReward)}
                        </StatNumber>
                      </Stat>
                    )}
                    {!isClosed && (
                      <Stat>
                        <StatLabel color="muted" fontSize="md">
                          {isMaxWinnerThreshold ? (
                            <Text as="span">{t('Your max reward')}</Text>
                          ) : (
                            <Tooltip
                              label={t(
                                `Including a share of minority voters' deposit`
                              )}
                              placement="top"
                            >
                              <Text
                                as="span"
                                borderBottom="dotted 1px"
                                borderBottomColor="muted"
                                cursor="help"
                              >
                                {t('Max reward')}
                              </Text>
                            </Tooltip>
                          )}
                        </StatLabel>
                        <StatNumber fontSize="base" fontWeight={500}>
                          {toDna(estimatedMaxOracleReward)}
                        </StatNumber>
                      </Stat>
                    )}
                    <AsideStat
                      label={t('Committee size')}
                      value={t('{{committeeSize}} oracles', {committeeSize})}
                    />
                    <AsideStat
                      label={t('Quorum required')}
                      value={t('{{count}} votes', {
                        count: quorumVotesCount({quorum, committeeSize}),
                      })}
                    />
                    <AsideStat
                      label={t('Majority threshold')}
                      value={
                        isMaxWinnerThreshold
                          ? t('N/A')
                          : toPercent(winnerThreshold / 100)
                      }
                    />
                    {isClosed && totalReward && (
                      <AsideStat
                        label={t('Prize paid')}
                        value={toDna(totalReward)}
                      />
                    )}
                  </Stack>
                </Box>
              </VotingSkeleton>
            </Stack>
          </Stack>
        </Page>
      </Layout>

      <VoteDrawer
        isOpen={
          eitherState(current, 'review', `mining.${VotingStatus.Voting}`) &&
          !eitherState(
            current,
            `mining.${VotingStatus.Voting}.reviewPendingVote`
          )
        }
        onClose={() => {
          send('CANCEL')
        }}
        // eslint-disable-next-line no-shadow
        option={options.find(({id}) => id === selectedOption)?.value}
        from={coinbase}
        to={contractHash}
        deposit={votingMinPayment}
        publicVotingDuration={publicVotingDuration}
        finishDate={finishDate}
        finishCountingDate={finishCountingDate}
        isLoading={current.matches(`mining.${VotingStatus.Voting}`)}
        onVote={() => {
          send('VOTE', {privateKey})
        }}
      />

      <AddFundDrawer
        isOpen={eitherState(
          current,
          'funding',
          `mining.${VotingStatus.Funding}`
        )}
        onClose={() => {
          send('CANCEL')
        }}
        from={coinbase}
        to={contractHash}
        available={identityBalance}
        ownerFee={ownerFee}
        isLoading={current.matches(`mining.${VotingStatus.Funding}`)}
        onAddFund={({amount}) => {
          send('ADD_FUND', {amount, privateKey})
        }}
      />

      <LaunchDrawer
        isOpen={eitherState(
          current,
          `idle.${VotingStatus.Pending}.review`,
          `mining.${VotingStatus.Starting}`
        )}
        onClose={() => {
          send('CANCEL')
        }}
        balance={contractBalance}
        requiredBalance={votingMinBalance(minOracleReward, committeeSize)}
        ownerFee={ownerFee}
        from={coinbase}
        available={identityBalance}
        isLoading={current.matches(`mining.${VotingStatus.Starting}`)}
        onLaunch={({amount}) => {
          send('START_VOTING', {amount, privateKey})
        }}
      />

      <FinishDrawer
        isOpen={eitherState(
          current,
          `idle.${VotingStatus.Counting}.finish`,
          `mining.${VotingStatus.Finishing}`
        )}
        onClose={() => {
          send('CANCEL')
        }}
        from={coinbase}
        available={identityBalance}
        isLoading={current.matches(`mining.${VotingStatus.Finishing}`)}
        onFinish={() => {
          send('FINISH', {privateKey})
        }}
        hasWinner={didDetermineWinner}
      />

      <ProlongDrawer
        isOpen={eitherState(
          current,
          'prolong',
          `mining.${VotingStatus.Prolonging}`
        )}
        onClose={() => {
          send('CANCEL')
        }}
        from={coinbase}
        available={identityBalance}
        isLoading={current.matches(`mining.${VotingStatus.Prolonging}`)}
        onProlong={() => {
          send('PROLONG_VOTING', {privateKey})
        }}
      />

      <TerminateDrawer
        isOpen={eitherState(
          current,
          `idle.terminating`,
          `mining.${VotingStatus.Terminating}`
        )}
        onClose={() => {
          send('CANCEL')
        }}
        contractAddress={contractHash}
        isLoading={current.matches(`mining.${VotingStatus.Terminating}`)}
        onTerminate={() => {
          send('TERMINATE', {privateKey})
        }}
      />

      {pendingVote && (
        <ReviewNewPendingVoteDialog
          isOpen={eitherState(
            current,
            `mining.${VotingStatus.Voting}.reviewPendingVote`
          )}
          onClose={() => {
            send('GOT_IT')
          }}
          vote={pendingVote}
          startCounting={finishDate}
          finishCounting={finishCountingDate}
        />
      )}

      {adCid && (
        <AdPreview
          ad={{...ad, author: issuer}}
          isMalicious={isMaliciousAdVoting}
          {...adPreviewDisclosure}
        />
      )}

      <Dialog
        isOpen={eitherIdleState('redirecting')}
        onClose={() => send('CANCEL')}
      >
        <DialogHeader>{t('Leaving Idena')}</DialogHeader>
        <DialogBody>
          <Text>{t(`You're about to leave Idena.`)}</Text>
          <Text>{t(`Are you sure?`)}</Text>
        </DialogBody>
        <DialogFooter>
          <SecondaryButton onClick={() => send('CANCEL')}>
            {t('Cancel')}
          </SecondaryButton>
          <PrimaryButton onClick={() => send('CONTINUE')}>
            {t('Continue')}
          </PrimaryButton>
        </DialogFooter>
      </Dialog>
    </>
  )
}
