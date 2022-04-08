/* eslint-disable no-use-before-define */
import {Profile} from '../../shared/models/profile'
import {VotingStatus} from '../../shared/types'
import {areSameCaseInsensitive, callRpc} from '../../shared/utils/utils'
import {fetchNetworkSize, hexToObject} from '../oracles/utils'
import {AdStatus, AdVotingOption, AdVotingOptionId} from './types'

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

export const areCompetingAds = (targetA, targetB) =>
  compareNullish(targetA.language, targetB.language, areSameCaseInsensitive) &&
  compareNullish(targetA.os, targetB.os, areSameCaseInsensitive) &&
  compareNullish(
    targetA.age,
    targetB.age,
    (ageA, ageB) => Number(ageB) >= Number(ageA)
  ) &&
  compareNullish(
    targetA.stake,
    targetB.stake,
    (stakeA, stakeB) => Number(stakeB) >= Number(stakeA)
  )

export const compareNullish = (field, targetField, condition) =>
  field ? condition(field, targetField) : true

export const selectProfileHash = data => data.profileHash

export async function fetchAdVoting(address) {
  const readContractKey = createContractDataReader(address)

  return {
    status: mapToVotingStatus(
      await readContractKey('state', 'byte').catch(e => {
        if (e.message === 'data is nil') return VotingStatus.Terminated
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

export const AD_VOTING_COMMITTEE_SIZE = 4

export const buildAdReviewVoting = ({title, adCid}) => ({
  desc: title,
  title: 'Is this ad apropriate?',
  adCid,
  // votingDuration: 4320 * 3,
  // publicVotingDuration: 2160,
  votingDuration: 3 * 3,
  publicVotingDuration: 3 * 3,
  winnerThreshold: 66,
  quorum: 1,
  committeeSize: AD_VOTING_COMMITTEE_SIZE,
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

export const minOracleReward = async () => 5000 / (await fetchNetworkSize())

export async function fetchProfileAds(address) {
  try {
    const {profileHash} = await callRpc('dna_identity', address)

    return profileHash
      ? Profile.fromHex(await callRpc('ipfs_get', profileHash)).ads ?? []
      : []
  } catch {
    console.error('Error fetching ads for identity', address)
    return []
  }
}

export const mapVotingToAdStatus = voting => {
  if (voting.status) {
    // eslint-disable-next-line no-nested-ternary
    return [VotingStatus.Archived, VotingStatus.Terminated].includes(
      voting.status
    )
      ? voting.result === AdVotingOptionId[AdVotingOption.Approve]
        ? AdStatus.Approved
        : AdStatus.Rejected
      : AdStatus.Reviewing
  }
}

export const isApprovedVoting = voting =>
  voting?.status === VotingStatus.Archived &&
  voting?.result === AdVotingOptionId[AdVotingOption.Approve]
