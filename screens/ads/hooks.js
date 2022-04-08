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
  AD_VOTING_COMMITTEE_SIZE,
  areCompetingAds,
  buildAdReviewVoting,
  currentOs,
  fetchAdVoting,
  fetchProfileAds,
  isApprovedVoting,
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
          queryKey: ['decodedProfileAd', [cid]],
          queryFn: async () => ({
            ...decodeAd(await callRpc('ipfs_get', cid)),
            cid,
            author: address,
            amount: Number(amount),
          }),
          enabled: Boolean(cid),
          staleTime: Infinity,
        }
      }) ?? []
  )

  return decodedProfileAds?.map(x => x.data) ?? []
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
        language: i18n.language,
        os: typeof window !== 'undefined' ? currentOs() : '',
        age: age + 1,
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
    staleTime: 10 * 1000,
    notifyOnChangeProps: ['data'],
    ...options,
  })
}

export function useProfileAds() {
  const rpcFetcher = useRpcFetcher()

  const [{profileHash}] = useIdentity()

  const {decodeProfile, decodeAd, decodeAdTarget} = useProtoProfileDecoder()

  const {data: profile} = useQuery({
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
        ...decodeAd(await callRpc('ipfs_get', cid)),
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
            status: isApprovedVoting(await fetchAdVoting(contract))
              ? AdStatus.Approved
              : AdStatus.Rejected,
          }),
        }
      })
  )

  return {
    data: profileAds.map(({data}) => data) ?? [],
    status: profileAds.some(({status}) => status === 'loading')
      ? 'loading'
      : 'done',
  }
}

export function usePersistedAds(options) {
  return useQuery('draftAds', () => db.table('ads').toArray(), {
    initialData: [],
    notifyOnChangeProps: 'tracked',
    ...options,
  })
}

export function usePersistedAd(id) {
  return usePersistedAds({
    enabled: Boolean(id),
    select: data => data.find(ad => ad.id === id),
  })
}

export function useReviewAd() {
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
      console.log({storeToIpfsData})
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
      console.log({deployData, deployTxData})
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
  ])

  React.useEffect(() => {
    if (
      status === 'pending' &&
      startVotingData &&
      startVotingTxData &&
      startVotingTxData?.blockHash !== HASH_IN_MEMPOOL
    ) {
      console.log({startVotingData, startVotingTxData})
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
  }
}

function useDeployVoting() {
  const coinbase = useCoinbase()

  const privateKey = usePrivateKey()

  const {data: deployAmount} = useDeployVotingAmount()

  const [payload, setPayload] = React.useState()

  const {data, error, estimateData, estimateError, send, estimate} = useRawTx()

  React.useEffect(() => {
    if (payload && deployAmount) {
      estimate({
        type: 0xf,
        from: String(coinbase),
        amount: deployAmount,
        payload,
        privateKey,
      })
    }
  }, [coinbase, deployAmount, estimate, payload, privateKey])

  React.useEffect(() => {
    if (estimateData) {
      console.log({estimateData})

      const {txFee} = estimateData

      send({
        type: 0xf,
        from: String(coinbase),
        amount: deployAmount,
        payload: String(payload),
        maxFee: Number(txFee) * 1.1,
        privateKey,
      })
    }
  }, [coinbase, deployAmount, estimateData, payload, privateKey, send])

  const txData = useTx(data)

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
    }, []),
  }
}

function useStartVoting() {
  const coinbase = useCoinbase()

  const privateKey = usePrivateKey()

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
    if (payload && startAmount) {
      console.log({voting})
      estimate({
        type: 0x10,
        from: String(coinbase),
        to: voting?.address,
        amount: startAmount,
        payload,
        privateKey,
      })
    }
  }, [coinbase, estimate, payload, privateKey, startAmount, voting])

  React.useEffect(() => {
    if (estimateData && estimateData?.receipt?.success && startAmount) {
      console.log({estimateData, voting})

      const {txFee} = estimateData

      send({
        type: 0x10,
        from: String(coinbase),
        to: voting?.address,
        amount: 5000,
        payload: String(payload),
        maxFee: Number(txFee) * 1.1,
        privateKey,
      })
    } else if (estimateData?.receipt?.error) {
      console.log({error: estimateData?.receipt?.error})
    }
  }, [coinbase, estimateData, payload, privateKey, send, startAmount, voting])

  const txData = useTx(data)

  return {
    data,
    error,
    estimateError,
    txData,
    submit: setVoting,
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
  }
}

function useChangeProfile() {
  const coinbase = useCoinbase()

  const privateKey = usePrivateKey()

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
        privateKey,
      })
    }
  }, [cid, coinbase, payload, privateKey, send])

  const txData = useTx(data)

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

        default:
          return prevState
      }
    },
    {
      status: 'idle',
    }
  )

  const coinbase = useCoinbase()

  const privateKey = usePrivateKey()

  const {data, error, send} = useRawTx()

  React.useEffect(() => {
    if (state.status === 'pending') {
      send({
        type: TxType.BurnTx,
        from: String(coinbase),
        amount: state.amount,
        payload: String(state.payload),
        privateKey,
      })
    }
  }, [coinbase, privateKey, send, state])

  const txData = useTx(data)

  React.useEffect(() => {
    if (
      state.status === 'pending' &&
      data &&
      (txData?.blockHash ?? HASH_IN_MEMPOOL) !== HASH_IN_MEMPOOL
    ) {
      dispatch({type: 'done'})
    }
  }, [data, state.status, txData])

  React.useEffect(() => {
    if (state.status === 'pending' && Boolean(error)) {
      dispatch({type: 'error'})
    }
  }, [error, state.status])

  const submit = React.useCallback(({ad, amount}) => {
    dispatch({type: 'submit', ad, amount})
  }, [])

  return {
    data,
    error,
    txData,
    isPending: state.status === 'pending',
    isDone: state.status === 'done',
    status: state.status,
    submit,
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

    const sendToIpfsTx = new Transaction().fromHex(rawTx)

    sendToIpfsTx.sign(privateKey)

    const hash = await callRpc('dna_sendToIpfs', {
      tx: prependHex(sendToIpfsTx.toHex()),
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

function useRawTx(initialTxParams) {
  const {data: signedEstimateTx, setParams: setEstimateParams} = useSignedTx(
    initialTxParams
  )

  const {
    data: estimateData,
    error: estimateError,
    mutate: estimateRawTx,
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

  const {data: signedTx, setParams} = useSignedTx(initialTxParams)

  const {data, error, mutate: sendRawTx} = useMutation(tx =>
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
    estimate: setEstimateParams,
    send: setParams,
  }
}

function useSignedTx(initialParams) {
  const [params, setParams] = React.useState()

  const {data: rawTxData} = useRpc(
    'bcn_getRawTx',
    [
      {
        ...params,
        payload: prependHex(params?.payload),
        useProto: true,
      },
    ],
    {
      staleTime: Infinity,
      enabled: Boolean(params),
    }
  )

  const [signedTx, setSignedTx] = React.useState()

  React.useEffect(() => {
    if (rawTxData) {
      setSignedTx(
        prependHex(
          new Transaction()
            .fromHex(stripHexPrefix(rawTxData))
            .sign(params?.privateKey)
            .toHex()
        )
      )
    }
  }, [params, rawTxData])

  return {
    data: signedTx,
    setParams: React.useCallback(
      callParams => {
        setParams({...initialParams, ...callParams})
      },
      [initialParams]
    ),
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

function useLastBlock() {
  return useRpc('bcn_lastBlock', [], {
    refetchInterval: (BLOCK_TIME / 2) * 1000,
    notifyOnChangeProps: ['data', 'error'],
  }).data
}

export function useRpc(method, params, options) {
  const rpcFetcher = useRpcFetcher()

  return useQuery([method, params], rpcFetcher, {
    notifyOnChangeProps: 'tracked',
    ...options,
  })
}

function useLiveRpc(method, params, options) {
  const rpcFetcher = useRpcFetcher()

  const lastBlock = useLastBlock()

  return useQuery([method, params, lastBlock?.hash], rpcFetcher, {
    staleTime: Infinity,
    keepPreviousData: true,
    notifyOnChangeProps: ['data', 'error'],
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

export function useTx(hash, options) {
  const isMiningRef = React.useRef(true)

  const {data} = useLiveRpc('bcn_transaction', [hash], {
    enabled: Boolean(hash) && isMiningRef.current,
    ...options,
  })

  React.useEffect(() => {
    if (data && isMiningRef.current)
      isMiningRef.current = data?.blockHash === HASH_IN_MEMPOOL
  }, [data])

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
    [AdRotationStatus.Showing]: t('Showing'),
    [AdRotationStatus.NotShowing]: t('Not showing'),
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

export function useIpfsAd(cid) {
  const {decodeAd} = useProtoProfileDecoder()

  return useRpc('ipfs_get', [cid], {
    enabled: Boolean(cid),
    select: decodeAd,
    staleTime: Infinity,
    notifyOnChangeProps: ['data'],
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
