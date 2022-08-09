import axios from 'axios'
import {IdentityStatus} from '../../shared/types'
import {promiseTimeout} from '../../shared/utils/utils'

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

export async function checkRestoringConnection(url, key) {
  try {
    const {data} = await promiseTimeout(
      axios.create({baseURL: url}).post('/', {
        key,
        method: 'dna_epoch',
        params: [],
        id: 1,
      }),
      2000
    )
    const {error} = data
    if (error) throw new Error(error.message)
    return true
  } catch {
    return false
  }
}
