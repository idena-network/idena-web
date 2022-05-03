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
  fetchAdVoting,
  fetchProfileAds,
  isApprovedVoting,
  isMinedTx,
  isMiningTx,
  isRejectedVoting,
  isValidImage,
  minOracleReward,
  selectProfileHash,
} from './utils'
import {TxType} from '../../shared/types'
import {capitalize} from '../../shared/utils/string'
import {useAuthState} from '../../shared/providers/auth-context'
import {stripHexPrefix} from '../../shared/utils/buffers'
import {Transaction} from '../../shared/models/transaction'
import {
  argsToSlice,
  BLOCK_TIME,
  buildContractDeploymentArgs,
  votingMinStake,
} from '../oracles/utils'
import {DeployContractAttachment} from '../../shared/models/deployContractAttachment'
import {CallContractAttachment} from '../../shared/models/callContractAttachment'
import db from '../../shared/utils/db'
import {StoreToIpfsAttachment} from '../../shared/models/storeToIpfsAttachment'
import {ChangeProfileAttachment} from '../../shared/models/changeProfileAttachment'
import {BurnAttachment} from '../../shared/models/burnAttachment'
import {AdBurnKey} from '../../shared/models/adBurnKey'

export function useRotatingAds(limit = 3) {
  const rpcFetcher = useRpcFetcher()

  const {data: burntCoins} = useCompetingAds()

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
        queryFn: () => fetchAdVoting(ad?.contract),
        enabled: Boolean(ad?.contract),
        select: data => ({...data, cid: ad?.cid}),
        staleTime: (BLOCK_TIME / 2) * 1000,
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

export function useCurrentRotatingAd() {
  const ads = useRotatingAds()

  const {currentIndex} = useRotateAd()

  return ads[currentIndex]
}

export function useRotateAd() {
  const ads = useRotatingAds()

  const intervalsRef = React.useRef([10, 7, 5])

  const [currentIndex, setCurrentIndex] = React.useState(0)

  useInterval(() => {
    setCurrentIndex((currentIndex + 1) % ads.length)
  }, intervalsRef.current[currentIndex] * 1000)

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

export function useCompetingAds() {
  const {i18n} = useTranslation()

  const [{address, age, stake}] = useIdentity()

  const currentTarget = React.useMemo(
    () =>
      new AdTarget({
        language: new Intl.Locale(i18n.language).language,
        os: typeof window !== 'undefined' ? currentOs() : '',
        age,
        stake,
      }),
    [age, i18n.language, stake]
  )

  return useCompetingAdsByTarget(address, currentTarget)
}

export function useCompetingAdsByTarget(cid, target) {
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
    profileStatus === 'idle' ||
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
  return useQuery(
    'draftAds',
    async () =>
      Promise.all(
        (await db.table('ads').toArray()).map(
          async ({status, contract, thumb, media, ...ad}) => {
            const voting =
              status === AdStatus.Reviewing
                ? await fetchAdVoting(contract)
                : null

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
          }
        )
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

export function useReviewAd(ad, {onDeployContract, onStartVoting, onError}) {
  const {encodeAd} = useProtoProfileEncoder()

  const encodedAd = React.useMemo(() => {
    if (ad) {
      return encodeAd(ad)
    }
  }, [ad, encodeAd])

  const {
    data: storeToIpfsData,
    error: storeToIpfsError,
  } = useStoreToIpfs(encodedAd, {onError})

  const voting = React.useMemo(() => {
    if (storeToIpfsData?.cid) {
      return buildAdReviewVoting({
        title: ad.title,
        adCid: storeToIpfsData.cid,
      })
    }
  }, [ad, storeToIpfsData])

  const {
    data: deployData,
    error: deployError,
    estimateData: estimateDeployData,
    estimateError: estimateDeployError,
    txData: deployTxData,
  } = useDeployVoting(voting, {onError})

  const isMinedDeploy = isMinedTx(deployTxData)

  React.useEffect(() => {
    if (isMinedDeploy) {
      // eslint-disable-next-line no-unused-expressions
      onDeployContract?.({
        storeToIpfsData,
        estimateDeployData,
        deployData,
        deployTxData,
      })
    }
  }, [
    deployData,
    deployTxData,
    estimateDeployData,
    onDeployContract,
    storeToIpfsData,
    isMinedDeploy,
  ])

  const startVoting = React.useMemo(() => {
    if (isMinedDeploy) {
      return {...voting, address: estimateDeployData.receipt?.contract}
    }
  }, [estimateDeployData, isMinedDeploy, voting])

  const {
    data: startVotingData,
    error: startVotingError,
    estimateError: estimateStartVotingError,
    txData: startVotingTxData,
  } = useStartVoting(startVoting, {onError})

  const isPending = Boolean(ad)
  const isDone = isMinedTx(startVotingTxData)

  React.useEffect(() => {
    if (isDone) {
      // eslint-disable-next-line no-unused-expressions
      onStartVoting?.({
        cid: storeToIpfsData?.cid,
        contract: estimateDeployData?.receipt?.contract,
      })
    }
  }, [storeToIpfsData, estimateDeployData, isDone, onStartVoting])

  return {
    storeToIpfsData,
    storeToIpfsError,
    estimateDeployData,
    estimateDeployError,
    deployData,
    deployError,
    estimateStartVotingError,
    startVotingData,
    startVotingError,
    startVotingTxData,
    isPending,
    isDone,
  }
}

function useDeployVoting(voting, {onError}) {
  const coinbase = useCoinbase()

  const {data: deployAmount} = useDeployVotingAmount({onError})

  const payload = React.useMemo(() => {
    if (voting) {
      return prependHex(
        bytes.toHex(
          new DeployContractAttachment(
            bytes.fromHex('0x02'),
            argsToSlice(buildContractDeploymentArgs(voting)),
            3
          ).toBytes()
        )
      )
    }
  }, [voting])

  const estimateParams = React.useMemo(() => {
    if (payload && coinbase && deployAmount) {
      return {
        type: 0xf,
        from: coinbase,
        amount: deployAmount,
        payload,
      }
    }
  }, [coinbase, deployAmount, payload])

  const {
    data: estimateData,
    error: estimateError,
  } = useEstimateTx(estimateParams, {onError})

  const params = React.useMemo(() => {
    if (estimateData) {
      return {
        type: 0xf,
        from: coinbase,
        amount: deployAmount,
        payload,
        maxFee: Number(estimateData.txFee) * 1.1,
      }
    }
  }, [coinbase, deployAmount, estimateData, payload])

  const {data: hash, error} = useSendTx(params, {onError})

  const {data: txData} = useTrackTx(hash, {onError})

  return {
    data: hash,
    error,
    estimateData,
    estimateError,
    txData,
  }
}

function useStartVoting(voting, {onError}) {
  const coinbase = useCoinbase()

  const payload = React.useMemo(() => {
    if (voting) {
      return prependHex(
        bytes.toHex(
          new CallContractAttachment(
            'startVoting',
            argsToSlice(buildContractDeploymentArgs(voting)),
            3
          ).toBytes()
        )
      )
    }
  }, [voting])

  const {data: startAmount} = useStartAdVotingAmount({onError})

  const estimateParams = React.useMemo(() => {
    if (payload && coinbase && startAmount) {
      return {
        type: 0x10,
        from: coinbase,
        to: voting.address,
        amount: startAmount,
        payload,
      }
    }
  }, [coinbase, payload, startAmount, voting])

  const {
    data: estimateData,
    error: estimateError,
  } = useEstimateTx(estimateParams, {onError})

  const params = React.useMemo(() => {
    if (estimateData) {
      return {
        type: 0x10,
        from: coinbase,
        to: voting?.address,
        amount: startAmount,
        payload,
        maxFee: Number(estimateData.txFee) * 1.1,
      }
    }
  }, [coinbase, estimateData, payload, startAmount, voting])

  const {data: hash, error} = useSendTx(params, {onError})

  const {data: txData} = useTrackTx(hash, {onError})

  return {
    data: hash,
    error,
    estimateData,
    estimateError,
    txData,
  }
}

export function usePublishAd(ad, {onError}) {
  const coinbase = useCoinbase()

  const {encodeAdTarget, encodeProfile} = useProtoProfileEncoder()

  const {data: profileAds} = useQuery({
    queryKey: ['profileAds', coinbase],
    // eslint-disable-next-line no-shadow
    queryFn: ({queryKey: [, coinbase]}) => fetchProfileAds(coinbase),
    enabled: Boolean(coinbase),
    notifyOnChangeProps: 'tracked',
    onError,
  })

  const encodedProfile = React.useMemo(() => {
    if (ad && profileAds) {
      return encodeProfile({
        ads: [
          ...profileAds,
          {
            target: encodeAdTarget(ad),
            cid: ad.cid,
            contract: ad.contract,
            author: coinbase,
          },
        ],
      })
    }
  }, [ad, coinbase, encodeAdTarget, encodeProfile, profileAds])

  const {data: ipfsData, error: ipfsError} = useStoreToIpfs(encodedProfile, {
    onError,
  })

  const {
    data: changeProfileHash,
    error: changeProfileError,
    txData: changeProfileTxData,
  } = useChangeProfile(ipfsData?.cid, {onError})

  return {
    storeToIpfsData: ipfsData,
    storeToIpfsError: ipfsError,
    changeProfileData: changeProfileHash,
    changeProfileError,
    isPending: Boolean(ad) && isMiningTx(changeProfileTxData),
    isDone: isMinedTx(changeProfileTxData),
  }
}

function useChangeProfile(cid, {onError}) {
  const coinbase = useCoinbase()

  const params = React.useMemo(() => {
    if (coinbase && cid) {
      return {
        type: TxType.ChangeProfileTx,
        from: coinbase,
        payload: prependHex(
          new ChangeProfileAttachment({
            cid: CID.parse(cid).bytes,
          }).toHex()
        ),
      }
    }
  }, [cid, coinbase])

  const {data: hash, error} = useSendTx(params, {onError})

  const {data: txData} = useTrackTx(hash, {onError})

  return {
    data: hash,
    error,
    txData,
  }
}

export function useBurnAd({onSubmit, onMined, onError}) {
  const {encodeAdTarget} = useProtoProfileEncoder()

  const rpcClient = useRpcClient()

  const coinbase = useCoinbase()

  const privateKey = usePrivateKey()

  const {data: hash, error, mutate, reset} = useMutation(
    async ({ad, amount}) => {
      const rawTx = await rpcClient('bcn_getRawTx', {
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
        useProto: true,
      })

      const signedRawTx = prependHex(
        new Transaction()
          .fromHex(stripHexPrefix(rawTx))
          .sign(privateKey)
          .toHex()
      )

      return rpcClient('bcn_sendRawTx', signedRawTx)
    },
    {
      onSuccess: onSubmit,
      onError,
    }
  )

  const {data: txData, error: txError} = useTrackTx(hash, {
    onMined,
    onError,
  })

  return {
    data: hash,
    error,
    txData,
    txError,
    submit: mutate,
    reset,
  }
}

function useStoreToIpfs(hex, {onError} = {onError: console.error}) {
  const coinbase = useCoinbase()

  const {data: cid} = useRpc('ipfs_cid', [hex && prependHex(hex)], {
    enabled: Boolean(hex),
    staleTime: Infinity,
    onError,
  })

  const rawTxParams = React.useMemo(() => {
    if (cid && coinbase && hex) {
      return {
        type: 0x15,
        from: coinbase,
        payload: prependHex(
          new StoreToIpfsAttachment({
            size: bytes.fromHex(hex).byteLength,
            cid: CID.parse(cid).bytes,
          }).toHex()
        ),
        useProto: true,
      }
    }
  }, [cid, coinbase, hex])

  const {data: rawTx} = useRawTx(rawTxParams, {onError})

  const signedRawTx = useSignRawTx(rawTx)

  const sendToIpfsParams = React.useMemo(() => {
    if (signedRawTx) {
      return {
        tx: signedRawTx,
        data: prependHex(hex),
      }
    }
  }, [hex, signedRawTx])

  const {data: hash, error} = useRpc('dna_sendToIpfs', [sendToIpfsParams], {
    enabled: Boolean(sendToIpfsParams),
    staleTime: Infinity,
    onError,
  })

  const data = React.useMemo(() => {
    if (cid && hash) {
      return {cid, hash}
    }
  }, [cid, hash])

  return {
    data,
    error,
  }
}

export function useRawTx(params, options) {
  return useRpc(
    'bcn_getRawTx',
    [
      params && {
        ...params,
        payload: prependHex(params?.payload),
        useProto: true,
      },
    ],
    {
      enabled: Boolean(params),
      staleTime: Infinity,
      ...options,
    }
  )
}

export function useSignRawTx(rawTx) {
  const privateKey = usePrivateKey()

  return React.useMemo(() => {
    if (rawTx) {
      return prependHex(
        new Transaction()
          .fromHex(stripHexPrefix(rawTx))
          .sign(privateKey)
          .toHex()
      )
    }
  }, [privateKey, rawTx])
}

export function useEstimateRawTx(rawTx, options) {
  const rpcClient = useRpcClient()

  return useQuery({
    queryKey: ['bcn_estimateRawTx', [rawTx && prependHex(rawTx)]],
    queryFn: async ({queryKey: [method, params]}) => {
      const result = await rpcClient(method, ...params)

      if (result.receipt?.error) {
        throw new Error(result.receipt.error)
      }

      return result
    },
    enabled: Boolean(rawTx),
    staleTime: Infinity,
    notifyOnChangeProps: 'tracked',
    ...options,
  })
}

export function useSendRawTx(rawTx, options) {
  return useRpc('bcn_sendRawTx', [rawTx && prependHex(rawTx)], {
    enabled: Boolean(rawTx),
    staleTime: Infinity,
    ...options,
  })
}

function useSignTx(params, options) {
  const {data: rawTx} = useRawTx(params, options)
  return useSignRawTx(rawTx)
}

function useEstimateTx(params, options) {
  const signedRawTx = useSignTx(params)
  return useEstimateRawTx(signedRawTx, options)
}

function useSendTx(params, options) {
  const signedRawTx = useSignTx(params, options)
  return useSendRawTx(signedRawTx, options)
}

export function useTrackTx(hash, options) {
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
        options.onMined?.(data)
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

export function useRpcClient() {
  return React.useCallback(
    (method, ...params) => callRpc(method, ...params),
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

export function useDeployVotingAmount(options) {
  return useRpc('bcn_feePerGas', [], {
    select: votingMinStake,
    ...options,
  })
}

export function useStartVotingAmount(committeeSize, options) {
  return useQuery(
    ['useStartVotingAmount', committeeSize],
    // eslint-disable-next-line no-shadow
    async ({queryKey: [, committeeSize]}) =>
      roundToPrecision(4, Number(await minOracleReward()) * committeeSize),
    options
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

export function useStartAdVotingAmount(options) {
  return useStartVotingAmount(AD_VOTING_COMMITTEE_SIZE, options)
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
