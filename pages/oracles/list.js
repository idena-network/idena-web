import React, {useEffect} from 'react'
import NextLink from 'next/link'
import {
  Box,
  Button,
  Divider,
  Flex,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useMachine} from '@xstate/react'
import {MobileApiStatus, Toast} from '../../shared/components/components'
import {votingListMachine} from '../../screens/oracles/machines'
import {
  VotingCardSkeleton,
  VotingSkeleton,
  FillPlaceholder,
  FillCenter,
  ScrollToTop,
  TodoVotingCountBadge,
} from '../../screens/oracles/components'
import {useEpoch} from '../../shared/providers/epoch-context'
import {
  VotingCard,
  VotingFilter,
  LaunchVotingDrawer,
} from '../../screens/oracles/containers'
import {useIdentity} from '../../shared/providers/identity-context'
import {eitherState} from '../../shared/utils/utils'
import {VotingListFilter} from '../../screens/oracles/types'
import {
  humanError,
  mapVotingStatus,
  votingStatuses,
} from '../../screens/oracles/utils'
import Layout from '../../shared/components/layout'
import {IdentityStatus} from '../../shared/types'
import {Page, PageTitleNew} from '../../screens/app/components'
import IconLink from '../../shared/components/icon-link'
import {PlusSolidIcon, UserIcon} from '../../shared/components/icons'
import {useAuthState} from '../../shared/providers/auth-context'
import useUnreadOraclesCount from '../../shared/hooks/use-unread-oracles-count'

export default function VotingListPage() {
  const {t} = useTranslation()

  const toast = useToast()

  const pageRef = React.useRef()
  const {coinbase} = useAuthState()
  const [{state}] = useIdentity()
  const epochData = useEpoch()

  const [, resetUnreadOraclesCount] = useUnreadOraclesCount()

  const [current, send] = useMachine(votingListMachine, {
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
      onResetLastVotingTimestamp: resetUnreadOraclesCount,
    },
  })

  useEffect(() => {
    if (epochData && coinbase) send('START', {epoch: epochData.epoch, coinbase})
  }, [coinbase, epochData, send])

  const {
    votings,
    filter,
    statuses,
    continuationToken,
    startingVotingRef,
  } = current.context

  const [todoCount] = useUnreadOraclesCount()

  return (
    <Layout>
      <Page ref={pageRef} pt={[4, 6]}>
        <MobileApiStatus left={4} />
        <PageTitleNew mb={4}>{t('Oracle voting')}</PageTitleNew>
        <Stack isInline spacing={20} w="full" flex={1}>
          <Stack spacing={8}>
            <VotingSkeleton isLoaded={!current.matches('preload')}>
              <Stack spacing={2} isInline>
                <Button
                  variant="tab"
                  onClick={() => send('FILTER', {value: VotingListFilter.Todo})}
                  isActive={filter === VotingListFilter.Todo}
                >
                  {todoCount > 0 ? (
                    <Stack isInline spacing={1} align="center">
                      <Text as="span">{t('To Do')}</Text>
                      <TodoVotingCountBadge>{todoCount}</TodoVotingCountBadge>
                    </Stack>
                  ) : (
                    t('To Do')
                  )}
                </Button>
                <Button
                  variant="tab"
                  onClick={() =>
                    send('FILTER', {value: VotingListFilter.Voting})
                  }
                  isActive={filter === VotingListFilter.Voting}
                >
                  {t('Running')}
                </Button>
                <Button
                  variant="tab"
                  onClick={() =>
                    send('FILTER', {value: VotingListFilter.Closed})
                  }
                  isActive={filter === VotingListFilter.Closed}
                >
                  {t('Closed')}
                </Button>
                <Button
                  variant="tab"
                  onClick={() => send('FILTER', {value: 'all'})}
                  isActive={filter === 'all'}
                >
                  {t('All')}
                </Button>
                <Divider orientation="vertical" h={6} alignSelf="center" />
                <Button
                  variant="tab"
                  onClick={() => send('FILTER', {value: 'own'})}
                  isActive={filter === 'own'}
                >
                  <Stack isInline>
                    <UserIcon boxSize={4} />
                    <Text>{t('My votings')}</Text>
                  </Stack>
                </Button>
              </Stack>
            </VotingSkeleton>
            <Stack spacing={6} w={480} flex={1}>
              {current.matches('failure') && (
                <FillPlaceholder>
                  {current.context.errorMessage}
                </FillPlaceholder>
              )}

              {eitherState(current, 'loading.late') &&
                Array.from({length: 5}).map((_, idx) => (
                  <VotingCardSkeleton key={idx} />
                ))}

              {current.matches('loaded') && votings.length === 0 && (
                <FillCenter justify="center">
                  <Stack spacing={4}>
                    <Text color="muted" textAlign="center">
                      {/* eslint-disable-next-line no-nested-ternary */}
                      {filter === VotingListFilter.Own
                        ? t(`There are no votings yet.`)
                        : [
                            IdentityStatus.Newbie,
                            IdentityStatus.Verified,
                            IdentityStatus.Human,
                          ].includes(state)
                        ? t(`There are no votings for you`)
                        : t(
                            `There are no votings for you because your status is not validated.`
                          )}
                    </Text>
                    <Box alignSelf="center">
                      <NextLink href="/oracles/new">
                        <Button variant="outline">
                          {t('Create new voting')}
                        </Button>
                      </NextLink>
                    </Box>
                  </Stack>
                </FillCenter>
              )}

              {current.matches('loaded') &&
                votings.map(({id, ref}, idx) => (
                  <Stack key={id} spacing={6}>
                    <VotingCard votingRef={ref} />
                    {idx < votings.length - 1 && (
                      <Divider orientation="horizontal" mt={0} mb={0} />
                    )}
                  </Stack>
                ))}

              {current.matches('loaded') && continuationToken && (
                <Button
                  variant="outline"
                  alignSelf="center"
                  isLoading={current.matches('loaded.loadingMore')}
                  loadingText={t('Loading')}
                  onClick={() => send('LOAD_MORE')}
                >
                  {t('Load more votings')}
                </Button>
              )}
            </Stack>
          </Stack>
          <VotingSkeleton isLoaded={!current.matches('preload')} w="200px">
            <Stack spacing={8} align="flex-start" w={48}>
              <IconLink
                icon={<PlusSolidIcon boxSize={5} />}
                href="/oracles/new"
                ml={-2}
              >
                {t('New voting')}
              </IconLink>
              <Stack>
                <Text fontWeight={500}>{t('Tags')}</Text>
                {!current.matches('preload') && (
                  <Flex wrap="wrap">
                    {votingStatuses(filter).map(status => (
                      <VotingFilter
                        key={status}
                        isChecked={statuses.includes(status)}
                        status={status}
                        cursor="pointer"
                        my={2}
                        mr={2}
                        onClick={() => {
                          send('TOGGLE_STATUS', {value: status})
                        }}
                      >
                        {t(mapVotingStatus(status))}
                      </VotingFilter>
                    ))}
                  </Flex>
                )}
              </Stack>
            </Stack>
          </VotingSkeleton>
        </Stack>

        {startingVotingRef && (
          <LaunchVotingDrawer votingService={startingVotingRef} />
        )}

        <ScrollToTop scrollableRef={pageRef}>{t('Back to top')}</ScrollToTop>
      </Page>
    </Layout>
  )
}
