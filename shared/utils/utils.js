import {getRpcParams} from '../api/api-client'
import {IdentityStatus} from '../types'

export function createRpcCaller({url, key}) {
  return async function(method, ...params) {
    const {result, error} = await (
      await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method,
          params,
          id: 1,
          key,
        }),
      })
    ).json()
    if (error) throw new Error(error.message)
    return result
  }
}

export function callRpc(method, ...params) {
  return createRpcCaller(getRpcParams())(method, ...params)
}

export function toPercent(value) {
  return value.toLocaleString(undefined, {
    style: 'percent',
    maximumSignificantDigits: 4,
  })
}

export const toLocaleDna = locale => {
  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 18,
  })
  return value => `${formatter.format(value)} iDNA`
}

export const eitherState = (current, ...states) => states.some(current.matches)

// the NTP algorithm
// t0 is the client's timestamp of the request packet transmission,
// t1 is the server's timestamp of the request packet reception,
// t2 is the server's timestamp of the response packet transmission and
// t3 is the client's timestamp of the response packet reception.
export function ntp(t0, t1, t2, t3) {
  return {
    roundTripDelay: t3 - t0 - (t2 - t1),
    offset: (t1 - t0 + (t2 - t3)) / 2,
  }
}

export function mapIdentityToFriendlyStatus(status) {
  switch (status) {
    case IdentityStatus.Undefined:
      return 'Not validated'
    default:
      return status
  }
}

export function promiseTimeout(p, timeout) {
  return Promise.race([
    p,
    new Promise((_, reject) => setTimeout(reject, timeout)),
  ])
}
