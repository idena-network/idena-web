/* eslint-disable import/prefer-default-export */
import api from './api-client'

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
  const {data} = await api().post('/', {
    method: `flip_${type}Hashes`,
    params: [address],
    id: 1,
  })
  const {result, error} = data
  if (error) throw new Error(error.message)
  return result
}

/**
 * Format used for submitting validation session answers
 * @typedef {Object} Answer
 * @property {import('../providers/validation-context').AnswerType} answer Answer type enumeration: 0 - none, 1 - left, 2 - right, 3 - inappropriate
 * @property {boolean} easy Treat as not enough complex for validation or not
 *
 * @example {hash: "0x123", easy: false, answer: 1}
 */

/**
 * Submit answers for short session
 *
 * @property {Answer[]} answers List of answers
 * @property {number} nonce Nonce
 * @property {number} epoch Epoch
 *
 * @returns {string} Tx hash
 * @example
 *  submitShortAnswers({answers: [{answer: 1, easy: false}, {answer: 2, easy: false}], nonce: 0, epoch: 0})
 */
export async function submitShortAnswers(answers, nonce, epoch) {
  const {data} = await api().post('/', {
    method: 'flip_submitShortAnswers',
    params: [{answers, nonce, epoch}],
    id: 1,
  })
  const {result, error} = data
  if (error) throw new Error(error.message)
  return result
}

/**
 * Submit answers for long session
 *
 * @property {Answer[]} answers List of answers
 * @property {number} nonce Nonce
 * @property {number} epoch Epoch
 *
 * @returns {string} Tx hash
 * @example
 *  submitLongAnswers({answers: [{answer: 1, easy: false}, {answer: 2, easy: false}], nonce: 0, epoch: 0})
 */
export async function submitLongAnswers(answers, nonce, epoch) {
  const {data} = await api().post('/', {
    method: 'flip_submitLongAnswers',
    params: [{answers, nonce, epoch}],
    id: 1,
  })
  const {result, error} = data
  if (error) throw new Error(error.message)
  return result
}

export async function fetchValidationIsReady() {
  const {data} = await api().post('/', {
    method: `dna_isValidationReady`,
    params: [],
    id: 1,
  })
  const {result, error} = data
  if (error) throw new Error(error.message)
  return result
}

export async function fetchPrivateEncryptionKeyCandidates(address) {
  const {data} = await api().post('/', {
    method: `flip_privateEncryptionKeyCandidates`,
    params: [address],
    id: 1,
  })
  const {result, error} = data
  if (error) throw new Error(error.message)
  return result
}

export async function sendPublicEncryptionKey(data, signature, epoch) {
  const {data: response} = await api().post('/', {
    method: `flip_sendPublicEncryptionKey`,
    params: [{data, signature, epoch}],
    id: 1,
  })
  const {result, error} = response
  if (error) throw new Error(error.message)
  return result
}

export async function sendPrivateEncryptionKeysPackage(data, signature, epoch) {
  const {data: response} = await api().post('/', {
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
