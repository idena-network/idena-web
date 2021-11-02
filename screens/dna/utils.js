import {sendTransaction} from '../../shared/api/dna'
import {bufferToHex} from '../../shared/utils/string'

export const DNA_SEND_CONFIRM_TRESHOLD = 0.05

export function isValidDnaUrl(url) {
  try {
    const parsedUrl = new URL(url)
    const endsWithVersion = /v\d{1,3}$/.test(parsedUrl.pathname)
    return endsWithVersion
  } catch {
    return false
  }
}

export function dnaLinkMethod(dnaUrl) {
  return new URL(dnaUrl).pathname.slice(1).split('/')[1]
}

export function extractQueryParams(url) {
  const {searchParams} = typeof url === 'string' ? new URL(url) : url

  return Array.from(searchParams).reduce(
    (acc, [k, v]) => ({...acc, [k]: decodeURIComponent(v)}),
    {}
  )
}

export async function sendDna({from, to, amount, comment}) {
  const {result, error} = await sendTransaction(
    from,
    to,
    amount,
    bufferToHex(new TextEncoder().encode(comment))
  )

  if (error) throw new Error(error.message)

  return result
}

export function appendTxHash(url, hash) {
  const txUrl = new URL(url)
  txUrl.searchParams.append('tx', hash)
  return txUrl
}

export async function handleCallbackUrl(
  callbackUrl,
  callbackFormat,
  {onJson, onHtml}
) {
  switch (callbackFormat) {
    case 'json': {
      onJson(
        await (
          await fetch(callbackUrl, {
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          })
        ).json()
      )
      break
    }

    default:
    case 'html':
      onHtml({
        url: typeof callbackUrl === 'string' ? callbackUrl : callbackUrl.href,
      })
      break
  }
}

export function resolveDnaAppUrl({route, query}) {
  const method = route.substring(route.indexOf('/dna/') + 5)

  const params = Object.entries(query)
    .map(([k, v]) => `${k}=${v}`)
    .join('&')

  return `dna://${method}/v1?${params}`
}
