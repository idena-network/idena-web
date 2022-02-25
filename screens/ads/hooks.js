/* eslint-disable no-use-before-define */
import React from 'react'
import {useQueries, useQuery} from 'react-query'
import {Ad} from '../../shared/models/ad'
import {AdKey} from '../../shared/models/adKey'
import {Profile} from '../../shared/models/profile'
import ProtoProfileRoot from '../../shared/models/proto/models_pb'
import {stripHexPrefix} from '../../shared/utils/buffers'
import {callRpc} from '../../shared/utils/utils'

export function useAdRotation(limit = 5) {
  const rpcFetcher = useRpcFetcher()

  const coinbase = useCoinbase()

  const {data: competitorAds} = useAdCompetitors(
    {address: coinbase ?? '', key: '1202656e180022002800'},
    limit
  )

  const uniqueCompetitorAds = [
    ...new Set(competitorAds?.map(burn => burn.address) ?? []),
  ]

  const competingProfileHashQueries = useQueries(
    uniqueCompetitorAds.map(address => ({
      queryKey: ['dna_identity', [address]],
      queryFn: rpcFetcher,
      select: selectProfileHash,
    })) ?? []
  )

  const {decodeProfile, decodeAd} = useProtoProfileDecoder()

  const nonNullableCompetingProfileHashes =
    competingProfileHashQueries?.filter(query => Boolean(query.data)) ?? []

  const decodedProfiles = useQueries(
    nonNullableCompetingProfileHashes.map(({data}) => ({
      queryKey: ['ipfs_get', [data]],
      queryFn: rpcFetcher,
      enabled: Boolean(data),
      select: decodeProfile,
      staleTime: Infinity,
    }))
  )

  const profileAdHashes = decodedProfiles
    .map(({data}) => data?.ads)
    .flat()
    .map(ad => ad?.cid)

  const decodedProfileAds = useQueries(
    profileAdHashes.map(hash => ({
      queryKey: ['ipfs_get', [hash]],
      queryFn: rpcFetcher,
      enabled: Boolean(hash),
      select: decodeAd,
      staleTime: Infinity,
    }))
  )

  return decodedProfileAds.map(x => x.data) ?? []
}

function useAdCompetitors(target, limit) {
  return useRpc('bcn_burntCoins', [], {
    enabled: Boolean(target.address),
    select: React.useCallback(
      data => data?.filter(isCompetingAd(target)).slice(0, limit) ?? [],
      [target, limit]
    ),
  })
}

const isCompetingAd = targetAd => ad =>
  targetAd.address === ad.address && targetAd.key === ad.key

const selectProfileHash = data => data.profileHash

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
  const root = useProfileProtoRoot()

  return {
    decodeAd: React.useCallback(Ad.fromHex, [root]),
    decodeAdKey: React.useCallback(
      hex => createProfileProtoDecoder(root, 'ProtoAdKey')(hex).toObject(),
      [root]
    ),
    decodeProfile: React.useCallback(Profile.fromHex, []),
  }
}

export function createProfileProtoDecoder(root, type) {
  return hex =>
    root[type].deserializeBinary(Buffer.from(stripHexPrefix(hex), 'hex'))
}

function useProfileProtoRoot() {
  return ProtoProfileRoot
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
