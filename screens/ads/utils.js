/* eslint-disable no-use-before-define */
import protobuf from 'protobufjs'
import {
  areSameCaseInsensitive,
  callRpc,
  HASH_IN_MEMPOOL,
} from '../../shared/utils/utils'
import {
  buildContractDeploymentArgs,
  hexToObject,
  votingMinStake,
} from '../oracles/utils'
import {AdStatus, AdVotingOption, AdVotingOptionId} from './types'
import {VotingStatus} from '../../shared/types'
import {stripHexPrefix} from '../../shared/utils/buffers'
import {ContractRpcMode} from '../oracles/types'

export function createProfileProtoDecoder(pb, type) {
  const ProfileProtoType = lookupProfileProtoType(pb, type)
  return hex => ProfileProtoType.decode(Buffer.from(stripHexPrefix(hex), 'hex'))
}

export function createProfileProtoEncoder(pb, type) {
  const ProfileProtoType = lookupProfileProtoType(pb, type)
  return obj =>
    Buffer.from(
      ProfileProtoType.encode(ProfileProtoType.create(obj)).finish()
    ).toString('hex')
}

const lookupProfileProtoType = (pb, type) => pb.lookupType(`profile.${type}`)

export async function buildAdKeyHex({language, age, stake, os = currentOs()}) {
  const AdKeyType = (
    await protobuf.load('/static/pb/profile.proto')
  ).lookupType('profile.AdKey')

  const adKeyMessage = AdKeyType.create({
    language,
    age,
    stake,
    os,
  })

  const encodedAdKey = AdKeyType.encode(adKeyMessage).finish()

  return Buffer.from(encodedAdKey).toString('hex')
}

export function createAdKeyEncoder(protobufRoot) {
  return key => encodeAdKey(key, protobufRoot)
}

export function encodeAdKey(
  {language, age, stake, os = currentOs()},
  protobufRoot
) {
  const AdKeyType = protobufRoot.lookupType('profile.AdKey')

  const adKeyMessage = AdKeyType.create({
    language,
    age,
    stake,
    os,
  })

  const encodedAdKey = AdKeyType.encode(adKeyMessage).finish()

  return Buffer.from(encodedAdKey).toString('hex')
}

export async function buildProfileHex(ads) {
  const ProfileType = (
    await protobuf.load('/static/pb/profile.proto')
  ).lookupType('profile.Profile')

  const profileMessage = ProfileType.create({ads})

  const encodedProfile = ProfileType.encode(profileMessage).finish()

  return Buffer.from(encodedProfile).toString('hex')
}

export async function fetchProfileAds(address) {
  try {
    const {profileHash: profileCid} = await callRpc('dna_identity', address)

    if (!profileCid) return []

    const profileHex = await callRpc('ipfs_get', profileCid)

    const ProfileType = (
      await protobuf.load('/static/pb/profile.proto')
    ).lookupType('profile.Profile')

    const {ads} = ProfileType.decode(Buffer.from(profileHex.slice(2), 'hex'))

    return ads
  } catch {
    console.error('Error fetching ads for identity', address)
    return []
  }
}

export async function fetchProfileAd(cid) {
  const adHex = await callRpc('ipfs_get', cid)

  if (adHex) {
    const AdContentType = (
      await protobuf.load('/static/pb/profile.proto')
    ).lookupType('profile.AdContent')

    return AdContentType.decode(Buffer.from(adHex.slice(2), 'hex'))
  }

  return null
}

export const buildAdReviewVoting = ({title, adCid}) => ({
  title: 'Is this ads propriate?',
  desc: `title: ${title}, cid: ${adCid}`,
  adCid,
  // votingDuration: 4320 * 3,
  // publicVotingDuration: 2160,
  votingDuration: 3 * 3,
  publicVotingDuration: 3 * 3,
  winnerThreshold: 66,
  quorum: 1,
  committeeSize: 100, // 100 identities
  options: [
    buildAdReviewVotingOption(AdVotingOption.Approve),
    buildAdReviewVotingOption(AdVotingOption.Reject),
  ],
  ownerFee: 100,
  shouldStartImmediately: true,
  isFreeVoting: true,
})

const buildAdReviewVotingOption = option => ({
  id: AdVotingOptionId[option],
  value: option,
})

export const weakTargetField = (field, targetField, condition) =>
  field ? condition(field, targetField) : true

export const isRelevantAd = (
  {language: adLanguage, os: adOS, age: adAge, stake: adStake},
  {language: targetLanguage, os: targetOS, age: targetAge, stake: targetStake}
) =>
  weakTargetField(adLanguage, targetLanguage, areSameCaseInsensitive) &&
  weakTargetField(adOS, targetOS, areSameCaseInsensitive) &&
  weakTargetField(
    adAge,
    targetAge,
    // eslint-disable-next-line no-shadow
    (adAge, targetAge) => Number(targetAge) >= Number(adAge)
  ) &&
  weakTargetField(
    adStake,
    targetStake,
    // eslint-disable-next-line no-shadow
    (adStake, targetStake) => Number(targetStake) >= Number(adStake)
  )

export const OS = {
  Windows: 'windows',
  macOS: 'macos',
  Linux: 'linux',
  iOS: 'ios',
  Android: 'android',
}

export function currentOs() {
  switch (true) {
    case /Android/.test(navigator.userAgent):
      return OS.Android
    case /iPhone|iPad|iPod/.test(navigator.userAgent):
      return OS.iOS
    case /Win/.test(navigator.userAgent):
      return OS.Windows
    case /Mac/.test(navigator.userAgent):
      return OS.macOS
    case /Linux/.test(navigator.userAgent):
      return OS.Linux
    default:
      return null
  }
}

const eitherStatus = (...statuses) => status =>
  statuses.some(s => s.toUpperCase() === status.toUpperCase())

export const isReviewingAd = ({status}) =>
  eitherStatus(
    AdStatus.Reviewing,
    VotingStatus.Pending,
    VotingStatus.Open,
    VotingStatus.Voted,
    VotingStatus.Counting
  )(status)

export const isActiveAd = ({status}) =>
  eitherStatus(
    AdStatus.Reviewing,
    VotingStatus.Pending,
    VotingStatus.Open,
    VotingStatus.Voted,
    VotingStatus.Counting
  )(status)

export const isApprovedAd = ({status}) =>
  eitherStatus(
    AdStatus.Showing,
    AdStatus.NotShowing,
    AdStatus.PartiallyShowing
  )(status)

export function pollTx(txHash, cb) {
  let timeoutId

  const fetchStatus = async () => {
    try {
      const {blockHash} = await callRpc('bcn_transaction', txHash)

      if (blockHash === HASH_IN_MEMPOOL) {
        timeoutId = setTimeout(fetchStatus, 10 * 1000)
      } else {
        cb({type: 'MINED'})
      }
    } catch (error) {
      cb('TX_NULL', {data: {message: 'Transaction does not exist'}})
    }
  }

  timeoutId = setTimeout(fetchStatus, 10 * 1000)

  return () => {
    clearTimeout(timeoutId)
  }
}

export function pollContractTx(txHash, cb) {
  let timeoutId

  const fetchStatus = async () => {
    try {
      const {blockHash} = await callRpc('bcn_transaction', txHash)

      if (blockHash === HASH_IN_MEMPOOL) {
        timeoutId = setTimeout(fetchStatus, 10 * 1000)
      } else {
        const {success, error} = await callRpc('bcn_txReceipt', txHash)

        if (success) cb({type: 'MINED'})
        else if (error) cb({type: 'MINING_FAILED'})
        else timeoutId = setTimeout(fetchStatus, 10 * 1000)
      }
    } catch (error) {
      cb('TX_NULL', {data: {message: 'Transaction does not exist'}})
    }
  }

  timeoutId = setTimeout(fetchStatus, 10 * 1000)

  return () => {
    clearTimeout(timeoutId)
  }
}

export function filterAdsByStatus(ads, filter) {
  return ads.filter(ad => {
    const status = ad?.status ?? ''
    // eslint-disable-next-line no-nested-ternary
    return filter === AdStatus.Reviewing
      ? isReviewingAd({status})
      : filter === AdStatus.Active
      ? isApprovedAd({status})
      : areSameCaseInsensitive(status, filter)
  })
}

export const isClosedVoting = maybeVoting =>
  eitherStatus(
    VotingStatus.Archived,
    VotingStatus.Terminated
  )(maybeVoting.status ?? maybeVoting)

export const isApprovedVoting = ({result, ...voting}) =>
  isClosedVoting(voting)
    ? result === AdVotingOptionId[AdVotingOption.Approve]
    : false

export const createContractDataReader = address => (key, format) =>
  callRpc('contract_readData', address, key, format)

export async function fetchVoting(address) {
  const readContractKey = createContractDataReader(address)

  return {
    status: mapToVotingStatus(
      await readContractKey('state', 'byte').catch(e => {
        if (e.message === 'data is nil') return VotingStatus.Terminated
        return VotingStatus.Invalid
      })
    ),
    ...hexToObject(await readContractKey('fact', 'hex').catch(() => null)),
    result: await readContractKey('result', 'byte').catch(() => null),
  }
}

const mapToVotingStatus = status => {
  switch (status) {
    case 0:
      return VotingStatus.Pending
    case 1:
      return VotingStatus.Open
    case 2:
      return VotingStatus.Archived
    default:
      return status
  }
}

export async function sendAdToReview({ad: {id, title, url, cover}, from}) {
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

  // await db
  //   .table('ads')
  //   .update(id, {status: AdStatus.Reviewing, votingAddress, adCid})

  return {
    deployVotingTxHash: txHash,
    votingAddress,
    adCid,
  }
}

export async function publishAd({ad, from}) {
  const {id, language, age, stake, os, adCid, votingAddress} = ad

  const ads = await fetchProfileAds(from)

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
    sender: from,
    cid: profileCid,
  })

  // TODO: sign with pk
  await callRpc('dna_storeToIpfs', {
    cid: profileCid,
  })

  // await db
  //   .table('ads')
  //   .update(id, {adKeyHex: await buildAdKeyHex(ad), profileCid})

  return {
    profileChangeHash,
    profileCid,
  }
}
