import {useToken} from '@chakra-ui/react'
import protobuf from 'protobufjs'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {useQuery, useQueries, useMutation} from 'react-query'
import nanoid from 'nanoid'
import {useAuthState} from '../../shared/providers/auth-context'
import db from '../../shared/utils/db'
import {
  areSameCaseInsensitive,
  byId,
  callRpc,
  toLocaleDna,
} from '../../shared/utils/utils'
import {AdStatus} from './types'
import {
  fetchProfileAds,
  currentOs,
  isRelevantAd,
  isApprovedVoting,
  fetchProfileAd,
  fetchVoting,
  createProfileProtoDecoder,
  sendAdToReview,
  publishAd,
  createProfileProtoEncoder,
} from './utils'
import {useIdentity} from '../../shared/providers/identity-context'
import {capitalize} from '../../shared/utils/string'

const rpcQueryFetcher = ({queryKey: [method, ...params]}) =>
  callRpc(method, ...params)

export function useAds() {
  const {decodeProfile, decodeAd} = useProfileProtoDecoder()

  const {coinbase} = useAuthState()

  const profileCid = useProfileCid(coinbase)

  const {data: encodedProfile, status: encodedProfileStatus} = useIpfs(
    profileCid,
    {
      select: data => decodeProfile(data),
    }
  )

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

export function useAdRotation(limit = 5) {
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

export function useBurntCoins(options) {
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
