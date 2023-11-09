/* eslint-disable import/prefer-default-export */
import api, {callRpcAny} from './api-client'

/**
 * Flip hash
 * @typedef {Object} FlipHash
 * @property {string} hash Flip hash, repesenting it's address in the network
 * @property {boolean} ready Whether flip is ready to be showned or not
 * @property {boolean} extra Whether flip is extra or not
 */

/**
 * Returns list of flip hashes participating in validation session
 *
 * @param {string} address Identity address
 * @param {string} type Type of the hash
 *
 * @returns {FlipHash[]} List of flip hashes
 *
 * @example [{hash: "0x123", ready: true, extra: false}, {hash: "0x99999", ready: false, extra: true}]
 */
export async function fetchFlipHashes(address, type) {
  const {data} = await callRpcAny(
    {
      method: `flip_${type}Hashes`,
      params: [address],
      id: 1,
    },
    {
      assert: res => res && res.length && res.length > 0,
    }
  )
  const {result, error} = data
  if (error) throw new Error(error.message)
  return result
}

export async function fetchValidationIsReady() {
  const {data} = await callRpcAny(
    {
      method: `dna_isValidationReady`,
      params: [],
      id: 1,
    },
    {
      assert: res => !!res,
    }
  )
  const {result, error} = data
  if (error) throw new Error(error.message)
  return result
}

export async function fetchPrivateEncryptionKeyCandidates(address) {
  const {data} = await callRpcAny(
    {
      method: `flip_privateEncryptionKeyCandidates`,
      params: [address],
      id: 1,
    },
    {
      assert: res => res && res.length && res.length > 0,
    }
  )
  const {result, error} = data
  if (error) throw new Error(error.message)
  return result
}

export async function sendPublicEncryptionKey(data, signature, epoch) {
  const {data: response} = await callRpcAny({
    method: `flip_sendPublicEncryptionKey`,
    params: [{data, signature, epoch}],
    id: 1,
  })
  const {result, error} = response
  if (error) throw new Error(error.message)
  return result
}

export async function sendPrivateEncryptionKeysPackage(data, signature, epoch) {
  const {data: response} = await callRpcAny({
    method: `flip_sendPrivateEncryptionKeysPackage`,
    params: [{data, signature, epoch}],
    id: 1,
  })
  const {result, error} = response
  if (error) throw new Error(error.message)
  return result
}

export async function fetchWordPairs(address, vrfHash) {
  const {data: response} = await api().post('/', {
    method: `flip_wordPairs`,
    params: [address, vrfHash],
    id: 1,
  })
  const {result, error} = response
  if (error) throw new Error(error.message)
  return result
}
