import {useToken} from '@chakra-ui/react'
import {useMachine} from '@xstate/react'
import {assign, createMachine} from 'xstate'
import {log} from 'xstate/lib/actions'
import protobuf from 'protobufjs'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {useInfiniteQuery, useQuery, useQueries, useMutation} from 'react-query'
import dayjs from 'dayjs'
import nanoid from 'nanoid'
import {useAuthState} from '../../shared/providers/auth-context'
import db from '../../shared/utils/db'
import {
  areSameCaseInsensitive,
  byId,
  callRpc,
  eitherState,
  toLocaleDna,
} from '../../shared/utils/utils'
import {AdStatus} from './types'
import {
  buildAdReviewVoting,
  pollContractTx,
  buildAdKeyHex,
  buildProfileHex,
  pollTx,
  fetchProfileAds,
  currentOs,
  isRelevantAd,
  filterAdsByStatus,
  isApprovedVoting,
  fetchProfileAd,
  isClosedVoting,
  fetchVoting,
  createProfileProtoDecoder,
  sendAdToReview,
  publishAd,
  createProfileProtoEncoder,
} from './utils'
import {
  buildContractDeploymentArgs,
  createContractCaller,
  fetchNetworkSize,
  fetchOracleRewardsEstimates,
  minOracleRewardFromEstimates,
  votingBalance,
  votingMinStake,
} from '../oracles/utils'
import {ContractRpcMode} from '../oracles/types'
import {useFailToast} from '../../shared/hooks/use-toast'
import {useIdentity} from '../../shared/providers/identity-context'
import {capitalize} from '../../shared/utils/string'

const rpcQueryFetcher = ({queryKey: [method, ...params]}) =>
  callRpc(method, ...params)

const infiniteRpcQueryFetcher = ({queryKey: [method, ...params], pageParam}) =>
  callRpc(method, ...params.map(p => ({...p, token: pageParam})))

export function useAds() {
  // const pb = useProfileProtobuf()
  // const decodeProfile = createProfileDecoder(pb)
  // const decodeAd = createAdDecoder(pb)

  const {decodeProfile, decodeAd} = useProfileProtoDecoder()

  const {coinbase} = useAuthState()

  const profileCid = useProfileCid(coinbase)

  const {
    data: encodedProfile,
    error: profileError,
    status: encodedProfileStatus,
  } = useIpfs(profileCid, {
    select: data => decodeProfile(data),
  })

  console.log({profileError, encodedProfileStatus})

  const {data: burntCoins} = useBurntCoins()

  const profileAds = encodedProfile?.ads ?? []

  const profileAdHexes = useQueries(
    profileAds.map(({cid}) => ({
      queryKey: ['ipfs_get', cid],
      queryFn: rpcQueryFetcher,
      enabled: Boolean(cid),
      staleTime: Infinity,
    }))
  )

  const decodedProfileAds = useQueries(
    profileAds.map(({cid, key, votingAddress}, idx) => ({
      queryKey: ['decodedProfileAd', cid],
      queryFn: async () => {
        const hex = profileAdHexes[idx].data

        const {cover, ...ad} = decodeAd(hex)

        const voting = await fetchVoting(votingAddress)

        return {
          votingAddress,
          ...voting,
          ...ad,
          coverUrl: URL.createObjectURL(new Blob([cover], {type: 'image/png'})),
          ...key,

          status: (burntCoins ?? []).some(({address}) => address === coinbase)
            ? AdStatus.Showing
            : AdStatus.NotShowing,
          isPublished: true,

          competitorCount: 0,
          maxCompetitorPrice: 0,
          lastTxDate: Date.now(),
        }
      },
      enabled: profileAdHexes.some(({data}) => Boolean(data)),
      staleTime: 30 * 1000,
    }))
  )

  return {
    data: decodedProfileAds?.map(x => x.data) ?? [],
    status: encodedProfileStatus !== 'loading' ? 'ready' : 'pending',
  }
}

export function useAd(id) {
  const {data: ads} = useAds()

  const ad = ads.find(byId({id}))

  return {
    data: ad,
  }
}

export function useAdAction(props) {
  const initialAd = props?.ad

  const {coinbase} = useAuthState()

  const sendToReviewMutation = useMutation(sendAdToReview)

  const publishMutation = useMutation(publishAd)

  const removeMutation = useMutation(db.table('ads').delete)

  const burnMutation = useBurnDna({ad: initialAd, from: coinbase})

  const createMutation = useCreateAd()

  return {
    sendToReview({ad = initialAd, from = coinbase}) {
      return sendToReviewMutation.mutate({ad, from})
    },
    publish({ad = initialAd, from = coinbase}) {
      return publishMutation.mutate({ad, from})
    },
    burn: burnMutation.mutate,
    remove(id = initialAd.id) {
      return removeMutation.mutate(id)
    },
    create: createMutation.mutate,
  }
}

export function useBurnDna({ad, from}) {
  const {encodeAdKey} = useProfileProtoEncoder()

  return useMutation(amount =>
    callRpc('dna_burn', {
      from,
      amount,
      key: encodeAdKey(ad),
    })
  )
}

export function useCreateAd() {
  return useMutation(ad =>
    db.table('ads').put({...ad, id: nanoid(), status: AdStatus.Draft})
  )
}

export function useUpdateAd() {
  return useMutation(ad => db.table('ads').update(ad.id, {...ad}))
}

export function useAdRotation2(limit = 5) {
  const {encodeAdKey, decodeAdKey} = useProfileProto()

  const [identity] = useIdentity()

  const {data: relevantBurntCoins} = useBurntCoins({
    enabled: Boolean(identity.address),
    refetchOnWindowFocus: false,
    select: data =>
      (data ?? [])
        .filter(({key}) =>
          isRelevantAd(
            {...decodeAdKey(key)},
            {
              language: new Intl.Locale(navigator?.language).language,
              os: currentOs(),
              age: identity.age,
              stake: identity.stake,
            }
          )
        )
        .slice(0, limit),
  })

  const {data: rotatingAds, status} = useQuery(
    [
      'relevantBurntCoins',
      ...(relevantBurntCoins ?? []).map(({address, key}) => address + key),
    ],
    async () =>
      Promise.all(
        relevantBurntCoins.map(async ({address, key}) =>
          Promise.all(
            (await fetchProfileAds(address)).map(async ad =>
              encodeAdKey(ad.key) === key
                ? {
                    ...ad,
                    ...(await fetchProfileAd(ad.cid)),
                    voting: await fetchVoting(ad.votingAddress),
                  }
                : null
            )
          )
        )
      ),
    {
      enabled: Boolean(relevantBurntCoins),
      select: profileAds =>
        profileAds
          .flat()
          .filter(
            ad =>
              Boolean(ad) &&
              areSameCaseInsensitive(ad?.cid, ad?.voting.adCid) &&
              isApprovedVoting(ad?.voting)
          ),
    }
  )

  return {
    ads: rotatingAds ?? [],
    status: status === 'success' ? 'done' : 'pending',
  }
}

function useBurntCoins(options) {
  // eslint-disable-next-line no-use-before-define
  return useQuery(['bcn_burntCoins'], rpcQueryFetcher, {
    staleTime: 60 * 1000,
    options,
  })
}

export function usePersistedAds(options) {
  return useQuery(
    ['persistedAds'],
    () =>
      db
        .table('ads')
        .toCollection()
        .reverse()
        .sortBy('modifiedAt'),
    {
      select: data =>
        data.map(({cover, ...ad}) => ({
          coverUrl: URL.createObjectURL(new Blob([cover], {type: 'image/png'})),
          ...ad,
        })),
      ...options,
    }
  )
}

export function usePersistedAd(id) {
  return usePersistedAds({
    select: data => data.find(byId({id})),
  })
}

function useProfileCid(address) {
  return useIdentityQuery(address, {
    select: identity => identity.profileHash,
  }).data
}

function useIdentityQuery(address, options) {
  return useQuery(['dna_identity', address], rpcQueryFetcher, {
    enabled: Boolean(address),
    ...options,
  })
}

function useIpfs(cid, options) {
  // eslint-disable-next-line no-use-before-define
  return useQuery(['ipfs_get', cid], rpcQueryFetcher, {
    enabled: Boolean(cid),
    staleTime: Infinity,
    ...options,
  })
}

export function useBalance(coinbase) {
  const {data} = useQuery(['dna_getBalance', coinbase], rpcQueryFetcher, {
    enabled: Boolean(coinbase),
  })

  return data?.balance
}

export function useTxs(options) {
  const {coinbase} = useAuthState()

  const {
    data,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery(
    ['bcn_transactions', {address: coinbase, count: 100}],
    infiniteRpcQueryFetcher,
    {
      enabled: Boolean(coinbase),
      keepPreviousData: true,
      getNextPageParam: lastPage => lastPage.token,
      ...options,
    }
  )

  React.useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  return data?.pages?.flatMap(({transactions}) => transactions) ?? []
}

export function useBurnTxs({lastTxDate}) {
  return useTxs({
    select: data =>
      data.filter(
        ({timestamp, type}) =>
          type === 'burn' && dayjs(dayjs.unix(timestamp)).isAfter(lastTxDate)
      ),
  })
}

export function useBurnAmount({lastTxDate}) {
  const txs = useBurnTxs({lastTxDate})

  return txs.reduce(
    (agg, {amount, usedFee}) => agg + Number(amount) + Number(usedFee),
    0
  )
}

function useProfileProtobuf() {
  const {data} = useQuery(['profileProtobufRoot'], () =>
    protobuf.load('/static/pb/profile.proto')
  )
  return data
}

export function useProfileProto() {
  return {
    ...useProfileProtoEncoder(),
    ...useProfileProtoDecoder(),
  }
}

export function useProfileProtoEncoder() {
  const pb = useProfileProtobuf()

  const encodeAd = React.useMemo(
    ad =>
      Boolean(pb) &&
      Boolean(ad) &&
      createProfileProtoEncoder(pb, 'AdContent')(ad),
    [pb]
  )

  const encodeAdKey = React.useMemo(
    adKey =>
      Boolean(pb) &&
      Boolean(adKey) &&
      createProfileProtoEncoder(pb, 'AdKey')(adKey),
    [pb]
  )

  const encodeProfile = React.useMemo(
    profile =>
      Boolean(pb) &&
      Boolean(profile) &&
      createProfileProtoEncoder(pb, 'Profile')(profile),
    [pb]
  )

  return {
    encodeAd,
    encodeAdKey,
    encodeProfile,
  }
}

export function useProfileProtoDecoder() {
  const pb = useProfileProtobuf()

  const decodeAd = React.useMemo(
    ad =>
      Boolean(pb) &&
      Boolean(ad) &&
      createProfileProtoDecoder(pb, 'AdContent')(ad),
    [pb]
  )

  const decodeAdKey = React.useMemo(
    adKey =>
      Boolean(pb) &&
      Boolean(adKey) &&
      createProfileProtoDecoder(pb, 'AdKey')(adKey),
    [pb]
  )

  const decodeProfile = React.useMemo(
    profile =>
      Boolean(pb) &&
      Boolean(profile) &&
      createProfileProtoDecoder(pb, 'Profile')(profile),
    [pb]
  )

  return {
    decodeAd,
    decodeAdKey,
    decodeProfile,
  }
}

export function useAdStatusColor(status, fallbackColor = 'muted') {
  const statusColor = {
    [AdStatus.Showing]: 'green',
    [AdStatus.NotShowing]: 'red',
    [AdStatus.PartiallyShowing]: 'orange',
    [AdStatus.Rejected]: 'red',
  }

  const color = useToken('colors', `${statusColor[status]}.500`, fallbackColor)

  return color
}

export function useAdStatusText(status) {
  const {t} = useTranslation()

  const statusText = {
    [AdStatus.Showing]: t('Showing'),
    [AdStatus.NotShowing]: t('Not showing'),
    [AdStatus.PartiallyShowing]: t('Partially showing'),
  }

  return statusText[status] ?? capitalize(status)
}

const adListMachine = createMachine({
  id: 'adList',
  context: {
    selectedAd: {},
    ads: [],
    filteredAds: [],
  },
  initial: 'load',
  states: {
    load: {
      invoke: {
        src: 'load',
        onDone: {
          target: 'ready',
          actions: [
            assign({
              ads: (_, {data: {ads}}) => ads,
              filteredAds: (_, {data: {ads, filter}}) =>
                filterAdsByStatus(ads, filter),
              filter: (_, {data: {filter}}) => filter ?? AdStatus.Active,
            }),
            log(),
          ],
        },
        onError: {target: 'fail', actions: [log()]},
      },
    },
    ready: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            FILTER: {
              actions: [
                assign({
                  filter: (_, {value}) => value,
                  filteredAds: ({ads}, {value}) =>
                    filterAdsByStatus(ads, value),
                }),
                ({filter}) => localStorage.setItem('adListFilter', filter),
                log(),
              ],
            },
            SEND_AD_TO_REVIEW: {
              target: 'sendToReview',
              actions: [
                assign({
                  selectedAd: ({ads}, {id}) => ads.find(byId({id})),
                }),
              ],
            },
            PUBLISH_AD: {
              target: 'publish',
              actions: [
                assign({
                  selectedAd: ({ads}, {id}) => ads.find(byId({id})),
                }),
              ],
            },
            SELECT_AD: {
              actions: [
                assign({
                  selectedAd: ({ads}, {id}) => ads.find(byId({id})),
                }),
              ],
            },
            REMOVE_AD: 'removeAd',
          },
        },
        sendToReview: {
          on: {
            CANCEL: 'idle',
          },
          initial: 'preview',
          states: {
            preview: {
              on: {
                SUBMIT: {
                  target: 'submitting',
                  actions: [
                    assign({
                      oracleAmount: (_, {amount}) => amount,
                    }),
                  ],
                },
              },
            },
            submitting: {
              entry: [log()],
              invoke: {
                src: 'sendToReview',
                onDone: {
                  target: 'mineDeployVoting',
                  actions: [
                    assign(
                      (
                        // eslint-disable-next-line no-shadow
                        {ads, selectedAd, filter, ...context},
                        {data: {deployVotingTxHash, votingAddress, adCid}}
                      ) => {
                        const mapToReviewingAd = ad => ({
                          ...ad,
                          status: AdStatus.Reviewing,
                          deployVotingTxHash,
                          votingAddress,
                          adCid,
                        })

                        const nextAds = ads.map(ad =>
                          ad.id === selectedAd.id ? mapToReviewingAd(ad) : ad
                        )

                        return {
                          ...context,
                          ads: nextAds,
                          filteredAds: nextAds.filter(
                            ad => ad.status === filter
                          ),
                          selectedAd: mapToReviewingAd(selectedAd),
                        }
                      }
                    ),
                  ],
                },
                onError: {actions: ['onError', log()]},
              },
            },
            mineDeployVoting: {
              invoke: {src: 'mineDeployVoting'},
              on: {
                MINED: 'startVoting',
                MINING_FAILED: 'miningFailed',
                TX_NULL: {actions: ['onError']},
              },
            },
            startVoting: {
              invoke: {
                src: 'startVoting',
                onDone: {
                  target: 'mineStartVoting',
                  actions: [
                    assign(
                      (
                        // eslint-disable-next-line no-unused-vars
                        {ads, selectedAd, filter, oracleAmount, ...context},
                        {data: {startVotingTxHash}}
                      ) => {
                        const mapToStartedReviewingAd = ad => ({
                          ...ad,
                          startVotingTxHash,
                        })

                        const nextAds = ads.map(ad =>
                          ad.id === selectedAd.id
                            ? mapToStartedReviewingAd(ad)
                            : ad
                        )

                        return {
                          ...context,
                          ads: nextAds,
                          filteredAds: nextAds.filter(
                            ad => ad.status === filter
                          ),
                          selectedAd: mapToStartedReviewingAd(selectedAd),
                          filter,
                        }
                      }
                    ),
                  ],
                },
              },
            },
            mineStartVoting: {
              invoke: {src: 'mineStartVoting'},
              on: {
                MINED: '#adList.ready.idle',
                MINING_FAILED: 'miningFailed',
                TX_NULL: {actions: ['onError']},
              },
            },
            miningFailed: {entry: ['onError']},
          },
        },
        publish: {
          on: {
            CANCEL: 'idle',
          },
          initial: 'preview',
          states: {
            preview: {
              entry: [log()],
              on: {SUBMIT: 'submitting'},
            },
            submitting: {
              entry: [log()],
              invoke: {
                src: 'publishAd',
                onDone: {
                  target: 'mining',
                  actions: [
                    assign(
                      (
                        // eslint-disable-next-line no-shadow
                        {ads, selectedAd, filter, ...context},
                        {data: {profileChangeHash, profileCid}}
                      ) => {
                        const mapToPublishedAd = ad => ({
                          ...ad,
                          profileChangeHash,
                          profileCid,
                        })

                        const nextAds = ads.map(ad =>
                          ad.id === selectedAd.id ? mapToPublishedAd(ad) : ad
                        )

                        return {
                          ...context,
                          ads: nextAds,
                          filteredAds: nextAds.filter(
                            ad => ad.status === filter
                          ),
                          selectedAd: mapToPublishedAd(selectedAd),
                        }
                      }
                    ),
                    log(),
                  ],
                },
                onError: {actions: [log()]},
              },
            },
            mining: {
              invoke: {src: 'minePublishAd'},
              on: {
                MINED: '#adList.ready.idle',
                TX_NULL: {actions: ['onError']},
              },
            },
          },
        },
        removeAd: {
          invoke: {
            src: 'removeAd',
            onDone: {
              target: 'idle',
              actions: [
                assign({
                  ads: ({ads}, {data: removedAd}) =>
                    ads.filter(ad => ad.id !== removedAd),
                  filteredAds: ({filteredAds}, {data: removedAd}) =>
                    filteredAds.filter(ad => ad.id !== removedAd),
                }),
                log(),
              ],
            },
            onError: {
              actions: ['onError'],
            },
          },
        },
      },
    },
    fail: {
      entry: ['onError'],
    },
  },
})

export function useAdList() {
  const failToast = useFailToast()

  const {coinbase} = useAuthState()

  const burnTxs = [] // useRecentBurnTxs(dayjs.unix(0))

  const [current, send] = useMachine(adListMachine, {
    actions: {
      onError: (_, {data: {message}}) => {
        failToast(message)
      },
    },
    services: {
      load: async () => {
        const profileAds = await Promise.all(
          (await fetchProfileAds(coinbase)).map(async ad => ({
            ...ad,
            ...ad.key,
            ...(await fetchProfileAd(ad.cid)),
          }))
        )

        const persistedAds = (await db.ads.toArray()).filter(
          persistedAd => !profileAds.some(byId(persistedAd))
        )

        const ads = await Promise.all(
          [...profileAds, ...persistedAds].map(async ad => {
            if (ad.votingAddress) {
              try {
                const adVoting = await fetchVoting(ad.votingAddress)

                const encodedAdKey = await buildAdKeyHex(ad)

                const burntCoins = await callRpc('bcn_burntCoins')

                const sameKeyBurntCoins = (burntCoins ?? []).filter(
                  ({key}) => key === encodedAdKey
                )

                const competitorBurntCoins = sameKeyBurntCoins.filter(
                  ({address}) => address !== coinbase
                )

                const maxCompetitorPrice = Number(
                  competitorBurntCoins.sort(
                    (a, b) => Number(b.amount) - Number(a.amount)
                  )[0]?.amount ?? 0
                )

                const isBurningAd = sameKeyBurntCoins.some(
                  ({address}) => address === ad.author
                )

                // eslint-disable-next-line no-nested-ternary
                const status = isClosedVoting(adVoting)
                  ? // eslint-disable-next-line no-nested-ternary
                    isApprovedVoting(adVoting)
                    ? isBurningAd
                      ? AdStatus.Showing
                      : AdStatus.NotShowing
                    : AdStatus.Rejected
                  : adVoting.status

                return {
                  ...ad,
                  isPublished: Boolean(profileAds.find(({id}) => id === ad.id)),
                  competitorCount: competitorBurntCoins.length,
                  maxCompetitorPrice,
                  status,
                  lastTxDate: burnTxs[0]?.timestamp,
                }
              } catch {
                return ad
              }
            }

            return ad
          })
        )

        return {
          ads,
          filter: localStorage?.getItem('adListFilter'),
        }
      },
      sendToReview: async (
        {selectedAd: {id, title, url, cover}},
        {from = coinbase}
      ) => {
        const root = await protobuf.load('/static/pb/profile.proto')

        const AdContentMessage = root.lookupType('profile.AdContent')

        const adContent = AdContentMessage.create({
          id,
          title,
          url,
          cover: new Uint8Array(await cover.arrayBuffer()),
          author: from,
        })

        const adContentHex = Buffer.from(
          AdContentMessage.encode(adContent).finish()
        ).toString('hex')

        const adCid = await callRpc('ipfs_add', `0x${adContentHex}`, false)

        const voting = buildAdReviewVoting({title, adCid})

        const minStake = votingMinStake(await callRpc('bcn_feePerGas'))

        const {contract: votingAddress, gasCost, txFee} = await callRpc(
          'contract_estimateDeploy',
          buildContractDeploymentArgs(
            voting,
            {from, stake: minStake},
            ContractRpcMode.Estimate
          )
        )

        const txHash = await callRpc(
          'contract_deploy',
          buildContractDeploymentArgs(voting, {
            from,
            stake: minStake,
            gasCost,
            txFee,
          })
        )

        await db
          .table('ads')
          .update(id, {status: AdStatus.Reviewing, votingAddress, adCid})

        return {
          deployVotingTxHash: txHash,
          votingAddress,
          adCid,
        }
      },
      mineDeployVoting: (_, {data: {deployVotingTxHash}}) => cb =>
        pollContractTx(deployVotingTxHash, cb),
      startVoting: async ({selectedAd, oracleAmount}) => {
        const minOracleReward = minOracleRewardFromEstimates(
          await fetchOracleRewardsEstimates(100)
        )

        const committeeSize = await fetchNetworkSize()

        const minContractBalance = Math.max(
          Number.isFinite(oracleAmount) ? Number(oracleAmount) : 0,
          votingBalance({oracleReward: minOracleReward, committeeSize})
        )

        const {balance} = await callRpc('dna_getBalance', coinbase)

        if (balance < minContractBalance)
          throw new Error('Not enough balance to start voting')

        const {votingAddress} = selectedAd

        let callContract = createContractCaller({
          contractHash: votingAddress,
          from: coinbase,
          amount: minContractBalance,
        })

        const {error, gasCost, txFee} = await callContract(
          'startVoting',
          ContractRpcMode.Estimate
        )

        if (error) throw new Error(error)

        callContract = createContractCaller({
          contractHash: votingAddress,
          from: coinbase,
          amount: minContractBalance,
          gasCost: Number(gasCost),
          txFee: Number(txFee),
        })

        return {
          startVotingTxHash: await callContract('startVoting'),
        }
      },
      mineStartVoting: (_, {data: {startVotingTxHash}}) => cb =>
        pollContractTx(startVotingTxHash, cb),
      publishAd: async ({selectedAd}) => {
        const {id, language, age, stake, os, adCid, votingAddress} = selectedAd

        const ads = await fetchProfileAds(coinbase)

        const profileHex = await buildProfileHex([
          ...ads,
          {
            key: {language, age, stake, os},
            cid: adCid,
            votingAddress,
          },
        ])

        const profileCid = await callRpc('ipfs_add', `0x${profileHex}`, false)

        const profileChangeHash = await callRpc('dna_sendChangeProfileTx', {
          sender: coinbase,
          cid: profileCid,
        })

        await callRpc('dna_storeToIpfs', {
          cid: profileCid,
        })

        await db
          .table('ads')
          .update(id, {adKeyHex: await buildAdKeyHex(selectedAd), profileCid})

        return {
          profileChangeHash,
          profileCid,
        }
      },
      minePublishAd: (_, {data: {profileChangeHash}}) => cb =>
        pollTx(profileChangeHash, cb),
      removeAd: async (_, {id}) => {
        await db.table('ads').delete(id)
        return id
      },
    },
  })

  const eitherCurrentState = (...states) => eitherState(current, ...states)

  return [
    {
      ...current.context,
      ads: current.context.filteredAds,
      isReady: eitherCurrentState('ready'),
      isPublishing: eitherCurrentState('ready.publish'),
      isSendingToReview: eitherCurrentState('ready.sendToReview'),
      isMining: eitherCurrentState(
        'ready.sendToReview.mineDeployVoting',
        'ready.sendToReview.startVoting',
        'ready.sendToReview.mineStartVoting',
        'ready.publish.mining'
      ),
    },
    {
      filter(value) {
        send('FILTER', {value})
      },
      selectAd(id) {
        send('SELECT_AD', {id})
      },
      removeAd(id) {
        send('REMOVE_AD', {id})
      },
      sendAdToReview(id) {
        send('SEND_AD_TO_REVIEW', {id})
      },
      submitAdToReview(amount) {
        send('SUBMIT', {amount})
      },
      publishAd(id) {
        send('PUBLISH_AD', {id})
      },
      submitAd() {
        send('SUBMIT')
      },
      cancel() {
        send('CANCEL')
      },
    },
  ]
}

export function useAdRotation(limit = 5) {
  const [identity] = useIdentity()

  const [current, send] = useMachine(() =>
    createMachine({
      context: {
        ads: [],
        burntCoins: [],
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            START: 'fetchBurntCoins',
          },
        },
        fetchBurntCoins: {
          invoke: {
            src: async () => {
              const burntCoins = await callRpc('bcn_burntCoins')

              const decodedBurntCoins = await Promise.all(
                (burntCoins ?? []).map(async item => {
                  try {
                    const AdKeyType = (
                      await protobuf.load('/static/pb/profile.proto')
                    ).lookupType('profile.AdKey')

                    return {
                      ...item,
                      decodedAdKey: AdKeyType.decode(
                        Buffer.from(item.key, 'hex')
                      ),
                    }
                  } catch {
                    return item
                  }
                })
              )

              return decodedBurntCoins
            },
            onDone: {
              target: 'fetchAds',
              actions: [
                assign({
                  burntCoins: (_, {data}) =>
                    data
                      .filter(({decodedAdKey}) =>
                        isRelevantAd(
                          {...decodedAdKey},
                          {
                            language: new Intl.Locale(navigator?.language)
                              .language,
                            os: currentOs(),
                            age: identity.age,
                            stake: identity.stake,
                          }
                        )
                      )
                      ?.slice(0, limit) ?? [],
                }),
                log(),
              ],
            },
            onError: {actions: log()},
          },
        },
        fetchAds: {
          invoke: {
            src: ({burntCoins}) =>
              Promise.all(
                burntCoins.map(async ({address, key}) => {
                  const profileAds = await fetchProfileAds(address)

                  const ads = await Promise.all(
                    profileAds.map(async ad => ({
                      ...ad,
                      ...(await fetchProfileAd(ad.cid)),
                      decodedAdKey: await buildAdKeyHex(ad.key),
                      voting: await fetchVoting(ad.votingAddress),
                    }))
                  )

                  const relevantAds = ads.filter(
                    ({voting, decodedAdKey, ...ad}) =>
                      decodedAdKey === key &&
                      areSameCaseInsensitive(ad.cid, voting.adCid) &&
                      isApprovedVoting(voting)
                  )

                  return relevantAds
                })
              ),
            onDone: {
              target: 'done',
              actions: [
                assign({
                  ads: (_, {data}) => data.flat(),
                }),
                log(),
              ],
            },
            onError: {
              actions: [log()],
            },
          },
        },
        done: {
          type: 'final',
        },
      },
    })
  )

  React.useEffect(() => {
    if (identity.address) {
      send('START')
    }
  }, [identity.address, send])

  return {
    ads: current.context.ads,
    status: current.matches('done') ? 'done' : 'pending',
  }
}

export const editAdMachine = createMachine({
  id: 'editAd',
  context: {
    status: AdStatus.Draft,
  },
  initial: 'init',
  states: {
    init: {
      invoke: {
        src: 'init',
        onDone: {
          target: 'editing',
          actions: [assign((ctx, {data}) => ({...ctx, ...data})), log()],
        },
        onFail: {
          actions: [log()],
        },
      },
    },
    editing: {
      on: {
        UPDATE: {
          actions: [assign((ctx, {ad}) => ({...ctx, ...ad})), log()],
        },
        SUBMIT: 'submitting',
        CLOSE: 'closing',
      },
    },
    submitting: {
      invoke: {
        src: 'submit',
        onDone: 'success',
        onError: 'failure',
      },
    },
    failure: {
      entry: [log()],
      on: {
        RETRY: 'submitting',
      },
    },
    success: {
      entry: ['onSuccess', log()],
      type: 'final',
    },
    closing: {
      invoke: {
        src: 'close',
        onDone: {
          actions: ['onBeforeClose'],
        },
      },
    },
  },
})

export function useDnaFormatter() {
  const {
    i18n: {language},
  } = useTranslation()

  const dna = React.useCallback(value => toLocaleDna(language)(value), [
    language,
  ])

  return {
    format: dna,
  }
}
