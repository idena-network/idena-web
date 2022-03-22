/* eslint-disable no-use-before-define */
import {VotingStatus} from '../../shared/types'
import {areSameCaseInsensitive, callRpc} from '../../shared/utils/utils'
import {hexToObject} from '../oracles/utils'
import {AdStatus} from './types'

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

export const isSameAdKey = (adKey, targetAdKey) =>
  areSameCaseInsensitive(adKey.language, targetAdKey.language) &&
  areSameCaseInsensitive(adKey.os, targetAdKey.os) &&
  Number(adKey.age) === Number(targetAdKey.age) &&
  Number(adKey.stake) === Number(targetAdKey.stake)

export const isCompetingAd = targetAd => ad =>
  targetAd.address === ad.address && isCompetingAdKey(ad.key, targetAd.key)

const isCompetingAdKey = (
  {language: adLanguage, os: adOS, age: adAge, stake: adStake},
  {language: targetLanguage, os: targetOS, age: targetAge, stake: targetStake}
) =>
  weakCompare(adLanguage, targetLanguage, areSameCaseInsensitive) &&
  weakCompare(adOS, targetOS, areSameCaseInsensitive) &&
  weakCompare(
    adAge,
    targetAge,
    // eslint-disable-next-line no-shadow
    (adAge, targetAge) => Number(targetAge) >= Number(adAge)
  ) &&
  weakCompare(
    adStake,
    targetStake,
    // eslint-disable-next-line no-shadow
    (adStake, targetStake) => Number(targetStake) >= Number(adStake)
  )

export const weakCompare = (field, targetField, condition) =>
  field ? condition(field, targetField) : true

export const selectProfileHash = data => data.profileHash

export async function fetchAdVoting(address) {
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

export const createContractDataReader = address => (key, format) =>
  callRpc('contract_readData', address, key, format)

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
