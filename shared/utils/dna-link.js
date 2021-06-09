import axios from 'axios'
import {margin} from 'polished'
import sha3 from 'js-sha3'
import secp256k1 from 'secp256k1'
import apiClient from '../api/api-client'
import {sendTransaction} from '../api'
import {bufferToHex} from './string'
import {Box} from '../components'
import theme, {rem} from '../theme'
import {hexToUint8Array} from './buffers'

export const DNA_LINK_VERSION = `v1`
export const DNA_NONCE_PREFIX = 'signin-'

export const DNA_SEND_CONFIRM_TRESHOLD = 0.05

export function isValidUrl(string) {
  try {
    // eslint-disable-next-line no-new
    new URL(string)
    return true
  } catch (_) {
    console.error('Invalid URL', string)
    return false
  }
}

export const validDnaUrl = url => {
  try {
    return url.startsWith('/dna') || new URL(url).pathname.startsWith('/dna')
  } catch {
    return false
  }
}

export function parseQuery(url) {
  const {searchParams} = typeof url === 'string' ? new URL(url) : url

  return Array.from(searchParams.entries()).reduce(
    (acc, [k, v]) => ({...acc, [k]: decodeURIComponent(v)}),
    {}
  )
}

export function parseCallbackUrl({callbackUrl, faviconUrl}) {
  if (isValidUrl(callbackUrl)) {
    try {
      const {hostname, origin} = new URL(callbackUrl)
      return {
        hostname: hostname || callbackUrl,
        faviconUrl: faviconUrl || new URL('favicon.ico', origin),
      }
    } catch {
      console.error(
        'Failed to construct favicon url from callback url',
        callbackUrl
      )
    }
  }
  return {hostname: callbackUrl, faviconUrl: ''}
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

// eslint-disable-next-line react/prop-types
export function AlertText({textAlign = 'initial', ...props}) {
  return (
    <Box
      color={theme.colors.danger}
      style={{
        fontWeight: theme.fontWeights.medium,
        fontSize: rem(11),
        ...margin(rem(12), 0, 0),
        textAlign,
      }}
      {...props}
    />
  )
}
