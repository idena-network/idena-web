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
import {useFailToast} from '../../shared/hooks/use-toast'

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

export function useReviewAd({onDeploy}) {
  const [status, setStatus] = React.useState('idle')

  const [ad, setAd] = React.useState()

  const {
    data: storeToIpfsData,
    error: storeToIpfsError,
    submit: storeToIpfs,
  } = useStoreToIpfs()

  React.useEffect(() => {
    if (status === 'pending' && ad) {
      storeToIpfs(new Ad(ad).toHex())
    }
  }, [ad, status, storeToIpfs])

  const {
    data: deployData,
    error: deployError,
    estimateData: estimateDeployData,
    estimateError: estimateDeployError,
    txData: deployTxData,
    submit: deployVoting,
  } = useDeployVoting()

  React.useEffect(() => {
    if (status === 'pending' && storeToIpfsData) {
      deployVoting(
        buildAdReviewVoting({
          title: ad?.title,
          adCid: storeToIpfsData.cid,
        })
      )
    }
  }, [ad, deployVoting, status, storeToIpfsData])

  const {
    data: startVotingData,
    error: startVotingError,
    estimateError: estimateStartVotingError,
    txData: startVotingTxData,
    submit: startVoting,
  } = useStartVoting()

  React.useEffect(() => {
    if (
      status === 'pending' &&
      deployData &&
      deployTxData &&
      deployTxData?.blockHash !== HASH_IN_MEMPOOL
    ) {
      if (onDeploy) {
        onDeploy({
          storeToIpfsData,
          estimateDeployData,
          deployData,
          deployTxData,
        })
      }

      startVoting({
        ...buildAdReviewVoting({
          title: ad?.title,
          adCid: storeToIpfsData?.cid,
        }),
        address: estimateDeployData?.receipt?.contract,
      })
    }
  }, [
    deployData,
    deployTxData,
    startVoting,
    ad,
    storeToIpfsData,
    estimateDeployData,
    status,
    onDeploy,
  ])

  React.useEffect(() => {
    if (
      status === 'pending' &&
      startVotingData &&
      startVotingTxData &&
      startVotingTxData?.blockHash !== HASH_IN_MEMPOOL
    ) {
      setStatus('done')
    }
  }, [startVotingData, startVotingTxData, status])

  React.useEffect(() => {
    if (
      status === 'pending' &&
      [
        storeToIpfsError,
        estimateDeployError,
        deployError,
        estimateStartVotingError,
        startVotingError,
      ].some(Boolean)
    ) {
      setStatus('error')
    }
  }, [
    storeToIpfsError,
    estimateDeployError,
    deployError,
    estimateStartVotingError,
    startVotingError,
    status,
  ])

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
    isPending: status === 'pending',
    isDone: status === 'done',
    status,
    // eslint-disable-next-line no-shadow
    submit: React.useCallback(ad => {
      setAd(ad)
      setStatus('pending')
    }, []),
    reset: React.useCallback(() => {
      setStatus('idle')
    }, []),
  }
}

function useDeployVoting() {
  const [status, setStatus] = React.useState('idle')

  const coinbase = useCoinbase()

  const {data: deployAmount} = useDeployVotingAmount()

  const [payload, setPayload] = React.useState()

  const {data, error, estimateData, estimateError, estimate, send} = useRawTx()

  React.useEffect(() => {
    if (status === 'pending' && payload && deployAmount) {
      estimate({
        type: 0xf,
        from: String(coinbase),
        amount: deployAmount,
        payload,
      })
    }
  }, [coinbase, deployAmount, estimate, payload, status])

  React.useEffect(() => {
    if (status === 'pending' && estimateData) {
      const {txFee} = estimateData

      send({
        type: 0xf,
        from: String(coinbase),
        amount: deployAmount,
        payload: String(payload),
        maxFee: Number(txFee) * 1.1,
      })
    }
  }, [coinbase, deployAmount, estimateData, payload, send, status])

  React.useEffect(() => {
    if (error || estimateError) {
      setStatus('error')
    }
  }, [error, estimateError])

  React.useEffect(() => {
    if (data) {
      setStatus('done')
    }
  }, [data])

  const txData = useTrackTx(data)

  return {
    data,
    error,
    estimateData,
    estimateError,
    txData,
    submit: React.useCallback(voting => {
      setPayload(
        prependHex(
          bytes.toHex(
            new DeployContractAttachment(
              bytes.fromHex('0x02'),
              argsToSlice(buildContractDeploymentArgs(voting)),
              3
            ).toBytes()
          )
        )
      )
      setStatus('pending')
    }, []),
  }
}

function useStartVoting() {
  const [status, setStatus] = React.useState('idle')

  const coinbase = useCoinbase()

  const [voting, setVoting] = React.useState()

  const [payload, setPayload] = React.useState()

  React.useEffect(() => {
    if (voting) {
      setPayload(
        prependHex(
          bytes.toHex(
            new CallContractAttachment(
              'startVoting',
              argsToSlice(buildContractDeploymentArgs(voting)),
              3
            ).toBytes()
          )
        )
      )
    }
  }, [voting])

  const {data, error, estimateData, estimateError, send, estimate} = useRawTx()

  const {data: startAmount} = useStartAdVotingAmount()

  React.useEffect(() => {
    if (status === 'pending' && payload && startAmount) {
      estimate({
        type: 0x10,
        from: String(coinbase),
        to: voting?.address,
        amount: startAmount,
        payload,
      })
    }
  }, [coinbase, estimate, payload, startAmount, status, voting])

  React.useEffect(() => {
    if (
      status === 'pending' &&
      estimateData &&
      estimateData?.receipt?.success &&
      startAmount
    ) {
      const {txFee} = estimateData

      send({
        type: 0x10,
        from: String(coinbase),
        to: voting?.address,
        amount: startAmount,
        payload: String(payload),
        maxFee: Number(txFee) * 1.1,
      })
    } else if (estimateData?.receipt?.error) {
      console.error(estimateData?.receipt?.error)
    }
  }, [coinbase, estimateData, payload, send, startAmount, status, voting])

  React.useEffect(() => {
    if (error || estimateError) {
      setStatus('error')
    }
  }, [error, estimateError])

  React.useEffect(() => {
    if (data) {
      setStatus('done')
    }
  }, [data])

  const txData = useTrackTx(data)

  return {
    data,
    error,
    estimateError,
    txData,
    // eslint-disable-next-line no-shadow
    submit: React.useCallback(voting => {
      setVoting(voting)
      setStatus('pending')
    }, []),
  }
}

export function usePublishAd() {
  const [status, setStatus] = React.useState('idle')

  const [ad, setAd] = React.useState()

  const coinbase = useCoinbase()

  const {encodeAdTarget, encodeProfile} = useProtoProfileEncoder()

  const {
    data: storeToIpfsData,
    error: storeToIpfsError,
    submit: storeToIpfs,
  } = useStoreToIpfs()

  React.useEffect(() => {
    if (status === 'pending' && ad) {
      const target = encodeAdTarget(ad)

      const {cid, contract} = ad

      fetchProfileAds(coinbase).then(ads =>
        storeToIpfs(
          encodeProfile({
            ads: [
              ...ads,
              {
                target,
                cid,
                contract,
                author: coinbase,
              },
            ],
          })
        )
      )
    }
  }, [ad, coinbase, encodeAdTarget, encodeProfile, status, storeToIpfs])

  const {
    data: changeProfileData,
    error: changeProfileError,
    txData: changeProfileTxData,
    submit,
  } = useChangeProfile()

  React.useEffect(() => {
    if (status === 'pending' && storeToIpfsData) {
      submit(storeToIpfsData.cid)
    }
  }, [status, storeToIpfsData, submit])

  React.useEffect(() => {
    if (
      status === 'pending' &&
      storeToIpfsData &&
      changeProfileData &&
      changeProfileTxData &&
      changeProfileTxData?.blockHash !== HASH_IN_MEMPOOL
    ) {
      setStatus('done')
    }
  }, [changeProfileData, changeProfileTxData, status, storeToIpfsData])

  React.useEffect(() => {
    if (
      status === 'pending' &&
      [storeToIpfsError, changeProfileError].some(Boolean)
    ) {
      setStatus('error')
    }
  }, [changeProfileError, status, storeToIpfsError])

  return {
    storeToIpfsData,
    storeToIpfsError,
    changeProfileData,
    changeProfileError,
    isPending: status === 'pending',
    isDone: status === 'done',
    status,
    // eslint-disable-next-line no-shadow
    submit: React.useCallback(ad => {
      setAd(ad)
      setStatus('pending')
    }, []),
    reset: React.useCallback(() => {
      setStatus('idle')
    }, []),
  }
}

function useChangeProfile() {
  const coinbase = useCoinbase()

  const [cid, setCid] = React.useState()

  const [payload, setPayload] = React.useState()

  React.useEffect(() => {
    if (cid) {
      setPayload(
        prependHex(
          new ChangeProfileAttachment({
            cid: CID.parse(cid).bytes,
          }).toHex()
        )
      )
    }
  }, [cid])

  const {data, error, send} = useRawTx()

  React.useEffect(() => {
    if (payload) {
      send({
        type: TxType.ChangeProfileTx,
        from: String(coinbase),
        payload: String(payload),
      })
    }
  }, [cid, coinbase, payload, send])

  const txData = useTrackTx(data)

  return {
    data,
    error,
    txData,
    submit: setCid,
  }
}

export function useBurnAd() {
  const {encodeAdTarget} = useProtoProfileEncoder()

  const [state, dispatch] = React.useReducer(
    (prevState, action) => {
      switch (action.type) {
        case 'submit': {
          const {
            ad: {cid, ...ad},
            amount,
          } = action

          return {
            ...prevState,
            amount,
            payload: prependHex(
              new BurnAttachment({
                key: new AdBurnKey({
                  cid,
                  target: encodeAdTarget(ad),
                }).toHex(),
              }).toHex()
            ),
            status: 'pending',
          }
        }
        case 'done':
          return {...prevState, status: 'done'}
        case 'error':
          return {...prevState, status: 'error'}

        case 'reset':
          return {
            status: 'idle',
          }

        default:
          return prevState
      }
    },
    {
      status: 'idle',
    }
  )

  const coinbase = useCoinbase()

  const {data: txHash, error, send, reset} = useRawTx()

  React.useEffect(() => {
    if (state.status === 'pending') {
      send({
        type: TxType.BurnTx,
        from: String(coinbase),
        amount: state.amount,
        payload: String(state.payload),
      })
    }
  }, [coinbase, send, state])

  const txData = useTrackTx(txHash)

  React.useEffect(() => {
    if (
      state.status === 'pending' &&
      txHash &&
      txData?.hash === txHash &&
      (txData?.blockHash ?? HASH_IN_MEMPOOL) !== HASH_IN_MEMPOOL
    ) {
      dispatch({type: 'done'})
    }
  }, [txHash, state.status, txData])

  React.useEffect(() => {
    if (state.status === 'pending' && Boolean(error)) {
      dispatch({type: 'error'})
    }
  }, [error, state.status])

  React.useEffect(() => {
    if (state.status === 'done') {
      reset()
    }
  }, [reset, state.status])

  const submit = React.useCallback(({ad, amount}) => {
    dispatch({type: 'submit', ad, amount})
  }, [])

  return {
    data: txHash,
    error,
    txData,
    isPending: state.status === 'pending',
    isDone: state.status === 'done',
    status: state.status,
    submit,
    reset: React.useCallback(() => {
      dispatch({type: 'reset'})
    }, []),
  }
}

export function useDeployVotingAmount() {
  return useRpc('bcn_feePerGas', [], {
    select: votingMinStake,
  })
}

export function useStartVotingAmount(committeeSize) {
  return useQuery(
    ['useStartVotingAmount', committeeSize],
    // eslint-disable-next-line no-shadow
    async ({queryKey: [, committeeSize]}) =>
      roundToPrecision(4, Number(await minOracleReward()) * committeeSize)
  )
}

export function useStartAdVotingAmount() {
  return useStartVotingAmount(AD_VOTING_COMMITTEE_SIZE)
}

function useStoreToIpfs() {
  const coinbase = useCoinbase()

  const privateKey = usePrivateKey()

  const {data, error, mutate} = useMutation(async hex => {
    const contentBytes = bytes.fromHex(hex)

    const cid = await callRpc('ipfs_cid', prependHex(hex))

    const rawTx = await callRpc('bcn_getRawTx', {
      type: 0x15,
      from: coinbase,
      payload: prependHex(
        new StoreToIpfsAttachment({
          size: contentBytes.byteLength,
          cid: CID.parse(cid).bytes,
        }).toHex()
      ),
      useProto: true,
    })

    const hash = await callRpc('dna_sendToIpfs', {
      tx: prependHex(
        new Transaction()
          .fromHex(rawTx)
          .sign(privateKey)
          .toHex()
      ),
      data: prependHex(hex),
    })

    return {
      cid,
      hash,
    }
  })

  return {
    data,
    error,
    submit: mutate,
  }
}

function useRawTx() {
  const {data: signedEstimateTx, build: buildSignedEstimateTx} = useSignedTx()

  const {
    data: estimateData,
    error: estimateError,
    mutate: estimateRawTx,
    reset: resetEstimate,
  } = useMutation(async tx => {
    const result = await callRpc('bcn_estimateRawTx', prependHex(tx))

    if (result?.receipt?.error) throw new Error(result.receipt.error)

    return result
  })

  React.useEffect(() => {
    if (signedEstimateTx) {
      estimateRawTx(signedEstimateTx)
    }
  }, [estimateRawTx, signedEstimateTx])

  const {data: signedTx, build: buildSignedTx} = useSignedTx()

  const {data, error, mutate: sendRawTx, reset} = useMutation(tx =>
    callRpc('bcn_sendRawTx', prependHex(tx))
  )

  React.useEffect(() => {
    if (signedTx) {
      sendRawTx(signedTx)
    }
  }, [sendRawTx, signedTx])

  return {
    data,
    error,
    estimateData,
    estimateError,
    estimate: buildSignedEstimateTx,
    send: buildSignedTx,
    reset,
    resetEstimate,
  }
}

function useSignedTx() {
  const privateKey = usePrivateKey()

  const {data, mutate} = useMutation(async params => {
    const rawTx = await callRpc('bcn_getRawTx', {
      ...params,
      payload: prependHex(params?.payload),
      useProto: true,
    })

    return prependHex(
      new Transaction()
        .fromHex(stripHexPrefix(rawTx))
        .sign(privateKey)
        .toHex()
    )
  })

  return {
    data,
    build: mutate,
  }
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

function useLastBlock(options) {
  return useRpc('bcn_lastBlock', [], {
    refetchInterval: (BLOCK_TIME / 2) * 1000,
    notifyOnChangeProps: 'tracked',
    ...options,
  }).data
}

export function useRpc(method, params, options) {
  const rpcFetcher = useRpcFetcher()

  return useQuery([method, params], rpcFetcher, {
    notifyOnChangeProps: 'tracked',
    ...options,
  })
}

function useLiveRpc(method, params, {enabled, ...options} = {}) {
  const rpcFetcher = useRpcFetcher()

  const lastBlock = useLastBlock({enabled})

  return useQuery([method, params, lastBlock?.hash], rpcFetcher, {
    staleTime: Infinity,
    notifyOnChangeProps: 'tracked',
    enabled: Boolean(lastBlock?.hash) && enabled,
    ...options,
  })
}

export function useRpcFetcher() {
  const fetcher = React.useMemo(
    () => ({queryKey: [method, params]}) => callRpc(method, ...params),
    []
  )

  return fetcher
}

export function useTrackTx(hash, options) {
  const [enabled, setEnabled] = React.useState(false)

  React.useEffect(() => {
    setEnabled(Boolean(hash))
  }, [hash])

  const {data} = useLiveRpc('bcn_transaction', [hash], {
    enabled,
    // eslint-disable-next-line no-shadow
    onSuccess: data => {
      if (data.blockHash !== HASH_IN_MEMPOOL) {
        if (options?.onMined) {
          options.onMined(data)
        }
        setEnabled(false)
      }
    },
  })

  return data
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

export function useFormatDna() {
  const {
    i18n: {language},
  } = useTranslation()

  return React.useCallback(value => toLocaleDna(language)(value), [language])
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

export function useAdErrorToast(maybeError) {
  const failToast = useFailToast()

  React.useEffect(() => {
    if (maybeError) {
      failToast(maybeError.message)
    }
  }, [failToast, maybeError])
}
