import {IdentityStatus} from '../../shared/types'

function calcPercent(age) {
  switch (age) {
    case 5:
      return 5
    case 6:
      return 4
    case 7:
      return 3
    case 8:
      return 2
    case 9:
      return 1
    default:
      return 100
  }
}

export function getStakingWarning(t, state, age) {
  if ([IdentityStatus.Candidate, IdentityStatus.Newbie].includes(state)) {
    return t(
      `I understand that I will lose 100% of the Stake if I fail or miss the upcoming validation`
    )
  }
  if (state === IdentityStatus.Verified) {
    return t(
      `I understand that I will lose 100% of the Stake if I fail the upcoming validation`
    )
  }
  if (state === IdentityStatus.Zombie && age >= 10) {
    return t(
      `I understand that I will lose 100% of the Stake if I miss the upcoming validation`
    )
  }
  if (state === IdentityStatus.Zombie && age < 10) {
    return t(
      `I understand that I will lose {{percent}}% of the Stake if I fail the upcoming validation. I also understand that I will lose 100% of the Stake if I miss the upcoming validation`,
      {percent: calcPercent(age)}
    )
  }
  if (state === IdentityStatus.Suspended && age < 10) {
    return t(
      `I understand that I will lose {{percent}}% of the Stake if I fail the upcoming validation`,
      {percent: calcPercent(age)}
    )
  }
  return null
}
