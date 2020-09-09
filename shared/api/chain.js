/* eslint-disable import/prefer-default-export */
import api from './api-client'
import {strip} from '../utils/obj'

export async function fetchTx(hash) {
  const {data} = await api().post('/', {
    method: 'bcn_transaction',
    params: [hash],
    id: 1,
  })
  return {hash, ...data}
}

/**
 * Sync status
 * @typedef {Object} SyncStatus
 * @property {boolean} syncing
 * @property {number} currentBlock
 * @property {number} highestBlock
 */

/**
 * Retrieve node sync status
 *
 * @returns {SyncStatus} Sync status
 */
export async function fetchSync() {
  const {data} = await api().post('/', {
    method: 'bcn_syncing',
    params: [],
    id: 1,
  })
  const {result, error} = data
  if (error) throw new Error(error.message)
  return result
}

/**
 * Send raw tx
 */
export async function sendRawTx(hex) {
  const {data} = await api().post('/', {
    method: 'bcn_sendRawTx',
    params: [hex],
    id: 1,
  })
  const {result, error} = data
  if (error) throw new Error(error.message)
  return result
}

export async function getRawTx(type, from, to, amount, maxFee, payload, tips) {
  const {data} = await api().post('/', {
    method: 'bcn_getRawTx',
    params: [
      strip({
        type,
        from,
        to,
        amount,
        maxFee,
        payload,
        tips,
        useProto: true,
      }),
    ],
    id: 1,
  })
  const {result, error} = data
  if (error) throw new Error(error.message)
  return result
}
