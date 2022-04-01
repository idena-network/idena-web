import {IdentityStatus} from '../../shared/types'

export function GetProviderPrice(data, state, age) {
  if (!data.prices) {
    return data.price
  }

  if (state === IdentityStatus.Human) return data.prices[2]
  if (
    [
      IdentityStatus.Verified,
      IdentityStatus.Suspended,
      IdentityStatus.Zombie,
    ].includes(state)
  )
    return data.prices[1]

  if (state === IdentityStatus.Newbie && age === 1) return 0.01
  return data.prices[0]
}
