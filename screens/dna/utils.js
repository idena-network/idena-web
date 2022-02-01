import axios from 'axios'

export const DNA_NONCE_PREFIX = 'signin-'

export const DNA_SEND_CONFIRM_TRESHOLD = 0.05

export function isValidDnaUrl(url) {
  try {
    return url.startsWith('/dna') || new URL(url).pathname.startsWith('/dna')
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

export async function startSession(
  nonceEndpoint,
  {token, coinbase, address = coinbase}
) {
  const {data, error} = await axios.post('/api/dna/session', {
    nonceEndpoint,
    token,
    address,
  })

  if (error) throw new Error(error)

  const {
    data: {nonce},
  } = data

  if (nonce.startsWith(DNA_NONCE_PREFIX)) return nonce

  throw new Error(`You must start prefix with ${DNA_NONCE_PREFIX}`)
}

export async function authenticate(authenticationEndpoint, {token, signature}) {
  const {data, error} = await axios.post('/api/dna/authenticate', {
    authenticationEndpoint,
    token,
    signature,
  })

  if (error) throw new Error(error)

  const {
    data: {authenticated},
  } = data

  if (authenticated) return true

  throw new Error('Error authenticating identity')
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
      return onJson(
        await (
          await fetch(callbackUrl, {
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          })
        ).json()
      )
    }

    default:
    case 'html':
      return onHtml({
        url: typeof callbackUrl === 'string' ? callbackUrl : callbackUrl.href,
      })
  }
}

export function resolveDnaAppUrl({route, query}) {
  const method = route.substring(route.indexOf('/dna/') + 5)

  const params = Object.entries(query)
    .map(([k, v]) => `${k}=${v}`)
    .join('&')

  return `dna://${method}/v1?${params}`
}

export function isValidUrl(string) {
  try {
    return ['https:', 'http:', 'dna:'].includes(new URL(string).protocol)
  } catch (_) {
    console.error('Invalid URL', string)
    return false
  }
}
