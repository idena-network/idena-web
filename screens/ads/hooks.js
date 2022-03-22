/* eslint-disable no-use-before-define */
import React from 'react'
import {useTranslation} from 'react-i18next'
import {useQueries, useQuery} from 'react-query'
import {useInterval} from '@chakra-ui/react'
import {Ad} from '../../shared/models/ad'
import {AdKey} from '../../shared/models/adKey'
import {Profile} from '../../shared/models/profile'
import {useIdentity} from '../../shared/providers/identity-context'
import {callRpc} from '../../shared/utils/utils'
import {AdVotingOption, AdVotingOptionId} from './types'
import {
  currentOs,
  fetchAdVoting,
  isCompetingAd,
  isSameAdKey,
  selectProfileHash,
} from './utils'
import {VotingStatus} from '../../shared/types'

export function useAdRotationList(limit = 3) {
  const {i18n} = useTranslation()

  const rpcFetcher = useRpcFetcher()

  const coinbase = useCoinbase()

  const [identity] = useIdentity()

  const {data: competitorAds} = useAdCompetitors(
    {
      address: String(coinbase),
      key: new AdKey({
        language: i18n.language,
        os: typeof window !== 'undefined' ? currentOs() : '',
        age: identity.age,
        stake: identity.stake,
      }),
    },
    limit
  )

  const competingIdentities = [
    ...new Set(
      competitorAds
        ?.sort((a, b) => a.amount - b.amount)
        ?.map(burn => burn.address) ?? []
    ),
  ]

  const competingProfileHashQueries = useQueries(
    competingIdentities.map(address => ({
      queryKey: ['dna_identity', address],
      queryFn: rpcFetcher,
      select: selectProfileHash,
    })) ?? []
  )

  const {decodeProfile, decodeAd, decodeAdKey} = useProtoProfileDecoder()

  const competingProfileHashes =
    competingProfileHashQueries?.filter(query => Boolean(query.data)) ?? []

  const decodedProfiles = useQueries(
    competingProfileHashes.map(({data}) => ({
      queryKey: ['ipfs_get', data],
      queryFn: rpcFetcher,
      enabled: Boolean(data),
      select: decodeProfile,
      staleTime: Infinity,
    }))
  )

  const competingProfileAds = decodedProfiles
    .map(({data}) => data?.ads)
    .flat()
    .filter(profileAd =>
      (competitorAds ?? []).some(burningAd =>
        isSameAdKey(decodeAdKey(burningAd.key), profileAd?.key ?? {})
      )
    )

  const approvedProfileAds = useQueries(
    competingProfileAds.map(profileAd => ({
      queryKey: ['profileAd', profileAd?.votingAddress],
      queryFn: async ({queryKey: [, votingAddress]}) => {
        if (votingAddress) {
          const voting = await fetchAdVoting(votingAddress)
          return {
            ...profileAd,
            voting,
          }
        }
      },
      enabled: Boolean(profileAd?.votingAddress),
    }))
  ).filter(({data}) => {
    const voting = data?.voting
    return (
      voting?.adCid === data?.cid &&
      voting?.status === VotingStatus.Archived &&
      voting?.result === AdVotingOptionId[AdVotingOption.Approve]
    )
  })

  const decodedProfileAds = useQueries(
    approvedProfileAds.map(({data: ad}) => ({
      queryKey: ['ipfs_get', ad.cid],
      queryFn: rpcFetcher,
      enabled: Boolean(ad.cid),
      select: decodeAd,
      staleTime: Infinity,
    }))
  )

  return decodedProfileAds?.map(x => x.data) ?? []
}

export function useAdRotation() {
  const ads = useAdRotationList()

  const intervalsRef = React.useRef([5, 4, 3])

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

export function useActiveAd() {
  const ads = useAdRotationList()

  const {currentIndex} = useAdRotation()

  return ads[currentIndex]
}

function useAdCompetitors(target, limit) {
  const {decodeAdKey} = useProtoProfileDecoder()

  return useRpc('bcn_burntCoins', [], {
    enabled: Boolean(target.address),
    select: React.useCallback(
      data =>
        data
          ?.filter(burn =>
            isCompetingAd(target)({...burn, key: decodeAdKey(burn.key)})
          )
          .slice(0, limit) ?? [],
      [limit, target, decodeAdKey]
    ),
  })
}

export function useProtoProfileEncoder() {
  return {
    encodeAd: React.useCallback(ad => new Ad(ad).toHex(), []),
    encodeAdKey: React.useCallback(adKey => new AdKey(adKey).toHex(), []),
    encodeProfile: React.useCallback(
      profile => new Profile(profile).toHex(),
      []
    ),
  }
}

export function useProtoProfileDecoder() {
  return {
    decodeAd: React.useCallback(Ad.fromHex, []),
    decodeAdKey: React.useCallback(AdKey.fromHex, []),
    decodeProfile: React.useCallback(Profile.fromHex, []),
  }
}

export function useCoinbase() {
  return useRpc('dna_getCoinbaseAddr', []).data
}

export function useRpcFetcher() {
  const fetcher = React.useMemo(
    () => ({queryKey: [method, params]}) => callRpc(method, params),
    []
  )

  return fetcher
}

export function useRpc(method, params, options) {
  const rpcFetcher = useRpcFetcher()

  return useQuery([method, params], rpcFetcher, options)
}
