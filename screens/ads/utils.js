import nanoid from 'nanoid'
import {stripHexPrefix} from '../../shared/utils/buffers'
import {
  areSameCaseInsensitive,
  callRpc,
  HASH_IN_MEMPOOL,
} from '../../shared/utils/utils'
import profilePb from '../../shared/models/proto/profile_pb'
import {AdStatus} from './types'
import {VotingStatus} from '../../shared/types'

export function buildTargetKey({locale, age, stake, os = currentOs()}) {
  return JSON.stringify({locale, age, stake: Math.floor(stake), os})
}

export const isEligibleAd = (targetKey, key) => {
  const {
    locale: keyLocale,
    age: keyAge,
    stake: keyStake,
    os: keyOs,
  } = JSON.parse(key)

  const {locale, age, stake, os} = JSON.parse(targetKey)
  return (
    areSameCaseInsensitive(keyLocale, locale) &&
    age >= keyAge &&
    stake >= keyStake &&
    areSameCaseInsensitive(keyOs, os)
  )
}

export async function fetchProfileAds(address) {
  return hexToAd((await callRpc('dna_profile', address)).info).ads ?? []
}

export async function fetchTotalSpent(address) {
  return ((await callRpc('bcn_burntCoins')) ?? []).reduce(
    (total, {address: issuerAddress, amount}) =>
      total + areSameCaseInsensitive(issuerAddress, address)
        ? Number(amount)
        : 0,
    0
  )
}

export const buildAdReviewVoting = ({title, adCid}) => ({
  title: 'Is this ads propriate?',
  desc: `title: ${title}, cid: ${adCid}`,
  adCid,
  startDate: Date.now(),
  votingDuration: 4320 * 3,
  publicVotingDuration: 2160,
  winnerThreshold: 66,
  quorum: 1,
  committeeSize: 100,
  votingMinPayment: 10,
  options: [
    {id: 0, value: 'Approve'},
    {id: 1, value: 'Reject'},
  ],
  ownerFee: 0,
})

export function currentOs() {
  const {userAgent: ua, platform} = navigator
  switch (true) {
    case /Android/.test(ua):
      return 'Android'
    case /iPhone|iPad|iPod/.test(platform):
      return 'iOS'
    case /Win/.test(platform):
      return 'Windows'
    case /Mac/.test(platform):
      return 'Mac'
    case /CrOS/.test(ua):
      return 'Chrome OS'
    case /Firefox/.test(ua):
      return 'Firefox OS'
    default:
      return null
  }
}

export function hexToAd(hex) {
  try {
    return JSON.parse(
      new TextDecoder().decode(Buffer.from(stripHexPrefix(hex), 'hex'))
    )
  } catch {
    console.error('cannot parse hex string', hex)
    return {}
  }
}

export async function profileToHex({
  id = nanoid(),
  title,
  url,
  cover,
  author,
  location,
  language,
  age,
  os,
  stake,
}) {
  const ad = new profilePb.Ad()
  ad.setId(id)
  ad.setTitle(title)
  ad.setUrl(url)
  ad.setCover(new Uint8Array(await cover.arrayBuffer()))
  ad.setAuthor(author)

  const key = new profilePb.AdKey()
  key.setLocation(location)
  key.setLanguage(language)
  key.setAge(age)
  key.setOs(os)
  key.setStake(stake)

  const adItem = new profilePb.Profile.AdItem()
  adItem.setAd(ad)
  adItem.setKey(key)

  const profile = new profilePb.Profile()
  profile.setAdsList([adItem])

  return Buffer.from(profile.serializeBinary()).toString('hex')
}

export const isReviewingAd = ({status}) =>
  [
    AdStatus.Reviewing,
    VotingStatus.Pending,
    VotingStatus.Open,
    VotingStatus.Voted,
    VotingStatus.Counting,
  ].some(s => status.localeCompare(s, [], {sensitivity: 'base'}) === 0)

export const isApprovedAd = ({status}) =>
  [AdStatus.Approved, VotingStatus.Archived].some(
    s => status.localeCompare(s, [], {sensitivity: 'base'}) === 0
  )

export function pollTx(txHash, cb) {
  let timeoutId

  const fetchStatus = async () => {
    console.log({txHash})
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
