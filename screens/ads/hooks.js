/* eslint-disable no-use-before-define */
import {useToken, useInterval} from '@chakra-ui/react'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {useMutation, useQueries, useQuery, useQueryClient} from 'react-query'
import {CID, bytes} from 'multiformats'
import {Ad} from '../../shared/models/ad'
import {AdTarget} from '../../shared/models/adKey'
import {Profile} from '../../shared/models/profile'
import {useIdentity} from '../../shared/providers/identity-context'
import {
  callRpc,
  toLocaleDna,
  prependHex,
  HASH_IN_MEMPOOL,
} from '../../shared/utils/utils'
import {AdRotationStatus, AdStatus} from './types'
import {
  adFallbackSrc,
  areCompetingAds,
  buildAdReviewVoting,
  currentOs,
  estimateSignedTx,
  getAdVoting,
  fetchProfileAds,
  isApprovedVoting,
  isRejectedVoting,
  isValidImage,
  selectProfileHash,
  sendSignedTx,
  sendToIpfs,
  adVotingDefaults,
  isTargetedAd,
  calculateTotalAdScore,
} from './utils'
import {TxType} from '../../shared/types'
import {capitalize} from '../../shared/utils/string'
import {useAuthState} from '../../shared/providers/auth-context'
import {
  argsToSlice,
  BLOCK_TIME,
  buildContractDeploymentArgs,
  minOwnerDeposit,
  votingMinStake,
} from '../oracles/utils'
import {DeployContractAttachment} from '../../shared/models/deployContractAttachment'
import {CallContractAttachment} from '../../shared/models/callContractAttachment'
import db from '../../shared/utils/db'
import {ChangeProfileAttachment} from '../../shared/models/changeProfileAttachment'
import {BurnAttachment} from '../../shared/models/burnAttachment'
import {AdBurnKey} from '../../shared/models/adBurnKey'
import {useLanguage} from '../../shared/hooks/use-language'
import {fetchNetworkSize} from '../../shared/api'

export function useRotatingAds(limit = 3) {
  const rpcFetcher = useRpcFetcher()

  const burntCoins = useTargetedAds()

  const addresses = [...new Set(burntCoins?.map(({address}) => address))]

  const profileHashes = useQueries(
    addresses.map(address => ({
      queryKey: ['dna_identity', [address]],
      queryFn: rpcFetcher,
      staleTime: 5 * 60 * 1000,
      notifyOnChangeProps: ['data', 'error'],
      select: selectProfileHash,
    }))
  )

  const {decodeAd, decodeProfile, decodeAdTarget} = useProtoProfileDecoder()

  const profiles = useQueries(
    profileHashes.map(({data: cid}) => ({
      queryKey: ['ipfs_get', [cid]],
      queryFn: rpcFetcher,
      enabled: Boolean(cid),
      select: decodeProfile,
      staleTime: Infinity,
      notifyOnChangeProps: ['data'],
    }))
  )

  const profileAdVotings = useQueries(
    profiles
      .map(({data}) => data?.ads)
      .flat()
      .map(ad => ({
        queryKey: ['profileAdVoting', ad?.contract],
        queryFn: () => getAdVoting(ad?.contract),
        enabled: Boolean(ad?.contract),
        staleTime: 5 * 60 * 1000,
        select: data => ({...data, cid: ad?.cid}),
      }))
  )

  const approvedProfileAdVotings = profileAdVotings?.filter(({data}) =>
    isApprovedVoting(data, data?.cid)
  )

  const queryClient = useQueryClient()

  const decodedProfileAds = useQueries(
    burntCoins
      ?.filter(({key}) =>
        approvedProfileAdVotings.some(
          ({data}) => data?.cid === AdBurnKey.fromHex(key).cid
        )
      )
      .map(({key, address, amount}) => {
        const {cid} = AdBurnKey.fromHex(key)
        return {
          queryKey: ['decodedRotatingAd', [cid]],
          queryFn: async () => ({
            ...decodeAd(
              await queryClient
                .fetchQuery({
                  queryKey: ['ipfs_get', [cid]],
                  queryFn: rpcFetcher,
                  staleTime: Infinity,
                })
                .catch(() => '')
            ),
            cid,
            author: address,
            amount: Number(amount),
          }),
          enabled: Boolean(cid),
          staleTime: Infinity,
        }
      }) ?? []
  )

  return (
    (
      decodedProfileAds
        // eslint-disable-next-line array-callback-return
        ?.map(({data}) => {
          if (data) {
            const burn = burntCoins.find(({cid}) => cid === data.cid)

            if (burn) {
              return {
                ...data,
                totalScore: calculateTotalAdScore({
                  target: decodeAdTarget(burn.target),
                  burnAmount: burn.amount,
                }),
              }
            }

            return data
          }
        })
        .filter(Boolean) ?? []
    )
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit)
  )
}

export function useCurrentBannerAd() {
  const ads = useRotatingAds()

  const timing = React.useMemo(() => [12, 10, 8], [])

  const {currentIndex} = useRotateAds(timing)

  return ads[currentIndex]
}

export function useRotateAds(maybeTiming) {
  const ads = useRotatingAds()

  const timing = React.useMemo(() => maybeTiming ?? [10, 7, 5], [maybeTiming])

  const intervalsRef = React.useRef(timing)

  React.useEffect(() => {
    intervalsRef.current = timing
  }, [timing])

  const [currentIndex, setCurrentIndex] = React.useState(0)

  useInterval(
    () => {
      setCurrentIndex((currentIndex + 1) % ads.length)
    },
    ads.length > 0 ? intervalsRef.current[currentIndex] * 1000 : null
  )

  return {
    ads,
    currentIndex,
    prev() {
      setCurrentIndex((currentIndex - 1 + ads.length) % ads.length)
    },
    next() {
      setCurrentIndex((currentIndex + 1) % ads.length)
    },
    setCurrentIndex,
  }
}

export function useTargetedAds() {
  const [{age, stake}] = useIdentity()

  const language = useLanguage()

  const currentTarget = React.useMemo(
    () =>
      new AdTarget({
        language: language.lng,
        os: typeof window !== 'undefined' ? currentOs() : '',
        age,
        stake,
      }),
    [age, language, stake]
  )

  const {decodeAdTarget} = useProtoProfileDecoder()

  const {data: approvedBurntCoins} = useApprovedBurntCoins()

  return React.useMemo(
    () =>
      approvedBurntCoins?.filter(burn =>
        isTargetedAd(
          decodeAdTarget(AdBurnKey.fromHex(burn.key).target),
          currentTarget
        )
      ),
    [approvedBurntCoins, currentTarget, decodeAdTarget]
  )
}

export function useCompetingAds(cid, target) {
  const {decodeAdTarget} = useProtoProfileDecoder()

  const {data: approvedBurntCoins} = useApprovedBurntCoins()

  return React.useMemo(() => {
    if (Boolean(cid) && Boolean(target)) {
      return approvedBurntCoins?.filter(burn => {
        const key = AdBurnKey.fromHex(burn.key)
        return (
          cid !== key.cid &&
          target.toHex() !== key.target &&
          areCompetingAds(decodeAdTarget(key.target), target)
        )
      })
    }
  }, [approvedBurntCoins, cid, decodeAdTarget, target])
}

export function useBurntCoins(options) {
  return useRpc('bcn_burntCoins', [], {
    staleTime: 5 * 60 * 1000,
    notifyOnChangeProps: 'tracked',
    ...options,
  })
}

export function useApprovedBurntCoins() {
  const queryClient = useQueryClient()

  const {decodeProfile, decodeAdBurnKey} = useProtoProfileDecoder()

  const {data: burntCoins, status: burntCoinsStatus} = useBurntCoins({
    select: data =>
      data?.map(({address, key, amount}) => ({
        address,
        key,
        ...decodeAdBurnKey(key),
        amount,
      })) ?? [],
    notifyOnChangeProps: 'tracked',
  })

  const rpcFetcher = useRpcFetcher()

  return useQuery({
    queryKey: ['approvedAdOffers'],
    queryFn: () =>
      Promise.all(
        burntCoins.map(async burn => {
          const identity = await queryClient.fetchQuery({
            queryKey: ['dna_identity', [burn.address]],
            queryFn: rpcFetcher,
            staleTime: 5 * 60 * 1000,
          })

          if (identity.profileHash) {
            const profile = await queryClient.fetchQuery({
              queryKey: ['ipfs_get', [identity.profileHash]],
              queryFn: rpcFetcher,
              staleTime: Infinity,
            })

            const {ads} = decodeProfile(profile)

            const ad = ads.find(({cid}) => cid === burn.cid)

            if (ad && ad.contract) {
              const voting = await getAdVoting(ad.contract)
              return isApprovedVoting(voting, ad.cid) ? burn : null
            }
          }
        })
      ),
    enabled: burntCoinsStatus === 'success',
    select: React.useCallback(data => data.filter(Boolean), []),
    notifyOnChangeProps: 'tracked',
  })
}

export function useProfileAds() {
  const rpcFetcher = useRpcFetcher()

  const [{profileHash}, {forceUpdate: forceIdentityUpdate}] = useIdentity()

  const {decodeProfile, decodeAd, decodeAdTarget} = useProtoProfileDecoder()

  const {data: profile, status: profileStatus} = useQuery({
    queryKey: ['ipfs_get', [profileHash]],
    queryFn: rpcFetcher,
    enabled: Boolean(profileHash),
    select: decodeProfile,
    staleTime: Infinity,
    notifyOnChangeProps: 'tracked',
  })

  const queryClient = useQueryClient()

  const decodedProfileAds = useQueries(
    profile?.ads?.map(({cid, target, ...ad}) => ({
      queryKey: ['decodedProfileAd', cid, target],
      queryFn: async () => ({
        ...decodeAd(
          await queryClient
            .fetchQuery({
              queryKey: ['ipfs_get', [cid]],
              queryFn: rpcFetcher,
              staleTime: Infinity,
            })
            .catch(() => '')
        ),
        ...decodeAdTarget(target),
        cid,
        target,
        ...ad,
      }),
      enabled: Boolean(cid),
      staleTime: Infinity,
    })) ?? []
  )

  const profileAds = useQueries(
    decodedProfileAds
      .filter(({data}) => Boolean(data?.contract))
      .map(({data}) => {
        const {cid, contract, target, ...ad} = data
        return {
          queryKey: ['profileAd', cid, contract, target],
          queryFn: async () => ({
            ...ad,
            cid,
            target,
            status: AdStatus.Published,
          }),
        }
      })
  )

  const status =
    profileStatus === 'loading' ||
    (profileHash === undefined
      ? true
      : Boolean(profileHash) && profileStatus === 'idle') ||
    decodedProfileAds.some(ad => ad.status === 'loading') ||
    profileAds.some(ad => ad.status === 'loading')
      ? 'loading'
      : 'done'

  return {
    data: profileAds.map(({data}) => data) ?? [],
    status,
    refetch: forceIdentityUpdate,
  }
}

export function usePersistedAds(options) {
  const coinbase = useCoinbase()

  return useQuery(
    'usePersistedAds',
    async () => {
      const ads = await db
        .table('ads')
        .where({author: coinbase})
        .toArray()

      return Promise.all(
        ads.map(async ({status, contract, thumb, media, ...ad}) => {
          const voting = contract ? await getAdVoting(contract) : null

          return {
            ...ad,
            thumb: isValidImage(thumb)
              ? URL.createObjectURL(thumb)
              : adFallbackSrc,
            media: isValidImage(media)
              ? URL.createObjectURL(media)
              : adFallbackSrc,
            contract,
            status:
              // eslint-disable-next-line no-nested-ternary
              voting
                ? // eslint-disable-next-line no-nested-ternary
                  isApprovedVoting(voting, ad.cid)
                  ? AdStatus.Approved
                  : isRejectedVoting(voting)
                  ? AdStatus.Rejected
                  : AdStatus.Reviewing
                : status,
          }
        })
      )
    },
    {
      enabled: Boolean(coinbase),
      notifyOnChangeProps: 'tracked',
      staleTime: (BLOCK_TIME / 2) * 1000,
      ...options,
    }
  )
}

export function usePersistedAd(id) {
  return usePersistedAds({
    enabled: Boolean(id),
    select: data => data.find(ad => ad.id === id),
  })
}

export function useIpfsAd(cid, options) {
  const {decodeAd} = useProtoProfileDecoder()

  return useRpc('ipfs_get', [cid], {
    enabled: Boolean(cid),
    select: decodeAd,
    staleTime: Infinity,
    notifyOnChangeProps: 'tracked',
    ...options,
  })
}

export function useReviewAd({
  rewardsFund,
  onBeforeSubmit,
  onDeployContract,
  onStartVoting,
  onError,
}) {
  const {data: deployData, mutate} = useDeployAdContract({
    onBeforeSubmit,
    onSubmit: onDeployContract,
    onError,
  })

  useTrackTx(deployData?.hash, {
    onMined: React.useCallback(() => {
      startVoting(deployData)
    }, [deployData, startVoting]),
    onError,
  })

  const {data: startVotingHash, mutate: startVoting} = useStartAdVoting({
    rewardsFund,
    onError,
  })

  useTrackTx(startVotingHash, {
    onMined: React.useCallback(() => {
      onStartVoting(deployData)
    }, [deployData, onStartVoting]),
    onError,
  })

  return {
    submit: mutate,
  }
}

function useDeployAdContract({onBeforeSubmit, onSubmit, onError}) {
  const {encodeAd} = useProtoProfileEncoder()

  const coinbase = useCoinbase()

  const privateKey = usePrivateKey()

  const {data: deployAmount} = useDeployContractAmount()

  return useMutation(
    async ad => {
      const unpublishedVoting = buildAdReviewVoting({title: ad.title})

      const {cid} = await sendToIpfs(
        encodeAd({
          ...ad,
          version: 0,
          votingParams: unpublishedVoting,
        }),
        {
          from: coinbase,
          privateKey,
        }
      )

      const voting = {
        ...unpublishedVoting,
        adCid: cid,
      }

      const deployPayload = prependHex(
        bytes.toHex(
          new DeployContractAttachment(
            bytes.fromHex('0x02'),
            argsToSlice(buildContractDeploymentArgs(voting)),
            3
          ).toBytes()
        )
      )

      const estimateDeployResult = await estimateSignedTx(
        {
          type: TxType.DeployContractTx,
          from: coinbase,
          amount: deployAmount,
          payload: deployPayload,
        },
        privateKey
      )

      const hash = await sendSignedTx(
        {
          type: TxType.DeployContractTx,
          from: coinbase,
          amount: deployAmount,
          payload: deployPayload,
          maxFee: Number(estimateDeployResult.txFee) * 1.1,
        },
        privateKey
      )

      return {
        cid,
        contract: estimateDeployResult.receipt?.contract,
        hash,
        voting,
      }
    },
    {
      onMutate: onBeforeSubmit,
      onSuccess: onSubmit,
      onError,
    }
  )
}

function useStartAdVoting({rewardsFund, onError}) {
  const coinbase = useCoinbase()

  const privateKey = usePrivateKey()

  const {data: startAmount} = useStartAdVotingAmount()

  return useMutation(
    async startParams => {
      const payload = prependHex(
        bytes.toHex(
          new CallContractAttachment(
            'startVoting',
            argsToSlice(buildContractDeploymentArgs(startParams?.voting)),
            3
          ).toBytes()
        )
      )

      const estimateResult = await estimateSignedTx(
        {
          type: TxType.CallContractTx,
          from: coinbase,
          to: startParams?.contract,
          amount: startAmount + rewardsFund,
          payload,
        },
        privateKey
      )

      return sendSignedTx(
        {
          type: TxType.CallContractTx,
          from: coinbase,
          to: startParams?.contract,
          amount: startAmount + rewardsFund,
          payload,
          maxFee: Number(estimateResult.txFee) * 1.1,
        },
        privateKey
      )
    },
    {onError}
  )
}

export function usePublishAd({onBeforeSubmit, onMined, onError}) {
  const {encodeAdTarget, encodeProfile} = useProtoProfileEncoder()

  const coinbase = useCoinbase()

  const privateKey = usePrivateKey()

  const {data, mutate} = useMutation(
    async ad => {
      const profileAds = await fetchProfileAds(coinbase)

      const encodedProfile = encodeProfile({
        ads: [
          ...profileAds,
          {
            target: encodeAdTarget(ad),
            cid: ad.cid,
            contract: ad.contract,
            author: ad.author ?? coinbase,
          },
        ],
      })

      const {cid: profileCid, hash: sendToIpfsHash} = await sendToIpfs(
        encodedProfile,
        {
          from: coinbase,
          privateKey,
        }
      )

      const changeProfileHash = await sendSignedTx(
        {
          type: TxType.ChangeProfileTx,
          from: coinbase,
          payload: prependHex(
            new ChangeProfileAttachment({
              cid: CID.parse(profileCid).bytes,
            }).toHex()
          ),
        },
        privateKey
      )

      return {
        profileCid,
        sendToIpfsHash,
        changeProfileHash,
      }
    },
    {
      onMutate: onBeforeSubmit,
      onError,
    }
  )

  const {data: txData} = useTrackTx(data?.changeProfileHash, {onMined, onError})

  return {
    data,
    txData,
    submit: mutate,
  }
}

export function useBurnAd({onBeforeSubmit, onMined, onError}) {
  const {encodeAdTarget} = useProtoProfileEncoder()

  const coinbase = useCoinbase()

  const privateKey = usePrivateKey()

  const {data: hash, mutate, reset} = useMutation(
    async ({ad, amount}) =>
      sendSignedTx(
        {
          type: TxType.BurnTx,
          from: coinbase,
          amount,
          payload: prependHex(
            new BurnAttachment({
              key: new AdBurnKey({
                cid: ad.cid,
                target: encodeAdTarget(ad),
              }).toHex(),
            }).toHex()
          ),
        },
        privateKey
      ),
    {
      onBeforeSubmit,
      onError,
    }
  )

  const {data: txData} = useTrackTx(hash, {
    onMined,
    onError,
  })

  return {
    data: hash,
    txData,
    submit: mutate,
    reset,
  }
}

export function useTrackTx(hash, {onMined, ...options} = {}) {
  const [enabled, setEnabled] = React.useState(Boolean(hash))

  React.useEffect(() => {
    setEnabled(Boolean(hash))
  }, [hash])

  return useLiveRpc('bcn_transaction', [hash], {
    enabled,
    // eslint-disable-next-line no-shadow
    onSuccess: data => {
      if (data.blockHash !== HASH_IN_MEMPOOL) {
        // eslint-disable-next-line no-unused-expressions
        onMined?.(data)
        setEnabled(false)
      }
    },
    ...options,
  })
}

export function useRpc(method, params, options) {
  const rpcFetcher = useRpcFetcher()

  return useQuery([method, params], rpcFetcher, {
    notifyOnChangeProps: 'tracked',
    ...options,
  })
}

function useLiveRpc(method, params, {enabled = true, ...options} = {}) {
  const rpcFetcher = useRpcFetcher()

  const lastBlock = useLastBlock({enabled})

  return useQuery([method, params, lastBlock?.hash], rpcFetcher, {
    enabled,
    staleTime: Infinity,
    keepPreviousData: true,
    notifyOnChangeProps: 'tracked',
    ...options,
  })
}

export function useRpcFetcher() {
  return React.useCallback(
    ({queryKey: [method, params]}) => callRpc(method, ...params),
    []
  )
}

function useLastBlock(options) {
  return useRpc('bcn_lastBlock', [], {
    refetchInterval: (BLOCK_TIME / 2) * 1000,
    notifyOnChangeProps: 'tracked',
    ...options,
  }).data
}

export function useCoinbase() {
  const {coinbase} = useAuthState()
  return coinbase
}

export function useBalance(address) {
  const {data} = useRpc('dna_getBalance', [address], {
    enabled: Boolean(address),
  })

  return data?.balance
}

function usePrivateKey() {
  const {privateKey} = useAuthState()
  return privateKey
}

export function useDeployContractAmount() {
  return useRpc('bcn_feePerGas', [], {
    select: votingMinStake,
  })
}

export function useStartAdVotingAmount() {
  return useQuery(
    ['useStartAdVotingAmount', adVotingDefaults.committeeSize],
    // eslint-disable-next-line no-shadow
    async ({queryKey: [, committeeSize]}) => {
      const networkSize = await fetchNetworkSize()
      return minOwnerDeposit(networkSize, committeeSize)
    }
  )
}

export function useFormatDna(options) {
  const {
    i18n: {language},
  } = useTranslation()

  return React.useCallback(toLocaleDna(language, options), [language, options])
}

export function useProtoProfileEncoder() {
  return {
    encodeAd: React.useCallback(ad => new Ad(ad).toHex(), []),
    encodeAdTarget: React.useCallback(adKey => new AdTarget(adKey).toHex(), []),
    encodeProfile: React.useCallback(
      profile => new Profile(profile).toHex(),
      []
    ),
  }
}

export function useProtoProfileDecoder() {
  return {
    decodeAd: React.useCallback(Ad.fromHex, []),
    decodeAdTarget: React.useCallback(AdTarget.fromHex, []),
    decodeProfile: React.useCallback(Profile.fromHex, []),
    decodeAdBurnKey: React.useCallback(AdBurnKey.fromHex, []),
  }
}

export function useAdStatusColor(status, fallbackColor = 'muted') {
  const statusColor = {
    [AdRotationStatus.Showing]: 'green',
    [AdRotationStatus.NotShowing]: 'red',
    [AdRotationStatus.PartiallyShowing]: 'orange',
  }

  const color = useToken('colors', `${statusColor[status]}.500`, fallbackColor)

  return color
}

export function useAdStatusText(status) {
  const {t} = useTranslation()

  const statusText = {
    [AdRotationStatus.Showing]: t('Burning'),
    [AdRotationStatus.NotShowing]: t('Not burning'),
    [AdRotationStatus.PartiallyShowing]: t('Partially showing'),
  }

  return statusText[status] ?? capitalize(status)
}
