/* eslint-disable no-use-before-define */
import {useToken, useInterval} from '@chakra-ui/react'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {useMutation, useQueries, useQuery} from 'react-query'
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
  roundToPrecision,
} from '../../shared/utils/utils'
import {AdRotationStatus, AdStatus} from './types'
import {
  adFallbackSrc,
  AD_VOTING_COMMITTEE_SIZE,
  areCompetingAds,
  buildAdReviewVoting,
  currentOs,
  estimateSignedTx,
  getAdVoting,
  fetchProfileAds,
  isApprovedVoting,
  isRejectedVoting,
  isValidImage,
  calculateMinOracleReward,
  selectProfileHash,
  sendSignedTx,
  sendToIpfs,
} from './utils'
import {TxType} from '../../shared/types'
import {capitalize} from '../../shared/utils/string'
import {useAuthState} from '../../shared/providers/auth-context'
import {
  argsToSlice,
  BLOCK_TIME,
  buildContractDeploymentArgs,
  votingMinStake,
} from '../oracles/utils'
import {DeployContractAttachment} from '../../shared/models/deployContractAttachment'
import {CallContractAttachment} from '../../shared/models/callContractAttachment'
import db from '../../shared/utils/db'
import {ChangeProfileAttachment} from '../../shared/models/changeProfileAttachment'
import {BurnAttachment} from '../../shared/models/burnAttachment'
import {AdBurnKey} from '../../shared/models/adBurnKey'

export function useRotatingAds(limit = 3) {
  const rpcFetcher = useRpcFetcher()

  const {data: burntCoins} = useSelfCompetingAds()

  const addresses = [...new Set(burntCoins?.map(({address}) => address))]

  const profileHashes = useQueries(
    addresses.map(address => ({
      queryKey: ['dna_identity', [address]],
      queryFn: rpcFetcher,
      notifyOnChangeProps: ['data', 'error'],
      select: selectProfileHash,
    }))
  )

  const {decodeAd, decodeProfile} = useProtoProfileDecoder()

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
        select: data => ({...data, cid: ad?.cid}),
      }))
  )

  const approvedProfileAdVotings = profileAdVotings?.filter(({data}) =>
    isApprovedVoting(data)
  )

  const decodedProfileAds = useQueries(
    burntCoins
      ?.filter(({key}) =>
        approvedProfileAdVotings.some(
          ({data}) => data?.cid === AdBurnKey.fromHex(key).cid
        )
      )
      .slice(0, limit)
      .map(({key, address, amount}) => {
        const {cid} = AdBurnKey.fromHex(key)
        return {
          queryKey: ['decodedRotatingAd', [cid]],
          queryFn: async () => ({
            ...decodeAd(await callRpc('ipfs_get', cid).catch(() => '')),
            cid,
            author: address,
            amount: Number(amount),
          }),
          enabled: Boolean(cid),
          staleTime: Infinity,
        }
      }) ?? []
  )

  return decodedProfileAds?.map(x => x.data).filter(Boolean) ?? []
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

export function useSelfCompetingAds() {
  const {i18n} = useTranslation()

  const [{address, age, stake}] = useIdentity()

  const currentTarget = React.useMemo(
    () =>
      new AdTarget({
        language: new Intl.Locale(i18n.language ?? 'en').language,
        os: typeof window !== 'undefined' ? currentOs() : '',
        age,
        stake,
      }),
    [age, i18n.language, stake]
  )

  return useCompetingAds(address, currentTarget)
}

export function useCompetingAds(cid, target) {
  const {decodeAdTarget} = useProtoProfileDecoder()

  return useBurntCoins({
    enabled: Boolean(cid) && Boolean(target),
    select: React.useCallback(
      data =>
        data?.filter(burn => {
          const key = AdBurnKey.fromHex(burn.key)
          return (
            cid !== key.cid &&
            areCompetingAds(decodeAdTarget(key.target), target)
          )
        }) ?? [],
      [cid, decodeAdTarget, target]
    ),
  })
}

export function useBurntCoins(options) {
  return useRpc('bcn_burntCoins', [], {
    staleTime: (BLOCK_TIME / 2) * 1000,
    notifyOnChangeProps: ['data'],
    ...options,
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

  const decodedProfileAds = useQueries(
    profile?.ads?.map(({cid, target, ...ad}) => ({
      queryKey: ['decodedProfileAd', [cid]],
      queryFn: async () => ({
        ...decodeAd(await callRpc('ipfs_get', cid).catch(() => '')),
        ...decodeAdTarget(target),
        cid,
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
        const {cid, contract, ...ad} = data
        return {
          queryKey: ['profileAd', cid, contract],
          queryFn: async () => ({
            ...ad,
            cid,
            status: AdStatus.Published,
          }),
        }
      })
  )

  const status =
    profileStatus === 'loading' ||
    (Boolean(profileHash) && profileStatus === 'idle') ||
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
  // const coinbase = useCoinbase()

  return useQuery(
    'usePersistedAds',
    async () =>
      Promise.all(
        (
          await db
            .table('ads')
            // .where({
            //   author: coinbase,
            // })
            .toArray()
        ).map(async ({status, contract, thumb, media, ...ad}) => {
          const voting =
            status === AdStatus.Reviewing ? await getAdVoting(contract) : null

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
              status === AdStatus.Reviewing
                ? // eslint-disable-next-line no-nested-ternary
                  isApprovedVoting(voting)
                  ? AdStatus.Approved
                  : isRejectedVoting(voting)
                  ? AdStatus.Rejected
                  : AdStatus.Reviewing
                : status,
          }
        })
      ),
    {
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
    notifyOnChangeProps: ['data'],
    ...options,
  })
}

export function useReviewAd({
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

  const {data: deployAmount} = useDeployVotingAmount()

  return useMutation(
    async ad => {
      const {cid} = await sendToIpfs(
        encodeAd({
          ...ad,
          version: 0,
          votingParams: buildAdReviewVoting({title: ad.title}),
        }),
        {
          from: coinbase,
          privateKey,
        }
      )

      const voting = buildAdReviewVoting({
        title: ad.title,
        adCid: cid,
      })

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

function useStartAdVoting({onError}) {
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
          amount: startAmount,
          payload,
        },
        privateKey
      )

      return sendSignedTx(
        {
          type: TxType.CallContractTx,
          from: coinbase,
          to: startParams?.contract,
          amount: startAmount,
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

export function useDeployVotingAmount() {
  return useRpc('bcn_feePerGas', [], {
    select: votingMinStake,
  })
}

export function useStartAdVotingAmount() {
  return useStartVotingAmount(AD_VOTING_COMMITTEE_SIZE)
}

export function useStartVotingAmount(committeeSize) {
  return useQuery(
    ['useStartVotingAmount', committeeSize],
    // eslint-disable-next-line no-shadow
    async ({queryKey: [, committeeSize]}) =>
      roundToPrecision(
        4,
        Number(await calculateMinOracleReward()) * committeeSize
      )
  )
}

export function useFormatDna() {
  const {
    i18n: {language},
  } = useTranslation()

  return React.useCallback(value => toLocaleDna(language)(value), [language])
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
