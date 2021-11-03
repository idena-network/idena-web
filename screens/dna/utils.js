import axios from 'axios'
import sha3 from 'js-sha3'
import secp256k1 from 'secp256k1'
import apiClient from '../../shared/api/api-client'
import {hexToUint8Array} from '../../shared/utils/buffers'

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

export async function signNonce(nonce) {
  const {
    data: {result, error},
  } = await apiClient().post('/', {
    method: 'dna_sign',
    params: [nonce],
    id: 1,
  })
  if (error) throw new Error(error.message)
  return result
}

export function signNonceOffline(nonce, privateKey) {
  const firstIteration = sha3.keccak_256.array(nonce)
  const secondIteration = sha3.keccak_256.array(firstIteration)

  const {signature, recid} = secp256k1.ecdsaSign(
    new Uint8Array(secondIteration),
    typeof privateKey === 'string'
      ? hexToUint8Array(privateKey)
      : new Uint8Array(privateKey)
  )

  return [...signature, recid]
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

export function isValidUrl(string) {
  try {
    return ['https:', 'http:', 'dna:'].includes(new URL(string).protocol)
  } catch (_) {
    global.logger.error('Invalid URL', string)
    return false
  }
}
