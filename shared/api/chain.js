/* eslint-disable import/prefer-default-export */
import api, {callRpcAny, callRpcBest} from './api-client'
import {strip} from '../utils/obj'
import {queryClient} from '../utils/utils'

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
export async function fetchSync({url, apiKey} = {}) {
  const {data} = await api({url, apiKey}).post('/', {
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
export async function sendRawTx(hex, useProxy) {
  const {data} = await callRpcAny(
    {
      method: 'bcn_sendRawTx',
      params: [hex],
      id: 1,
    },
    {useProxy}
  )
  const {result, error} = data
  if (error) throw new Error(error.message)
  return result
}

export async function getRawTx(
  type,
  from,
  to,
  amount,
  maxFee,
  payload,
  tips,
  useProxy
) {
  const {data} = await callRpcBest(
    {
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
    },
    useProxy
  )
  const {result, error} = data
  if (error) throw new Error(error.message)
  return result
}

export async function estimateRawTx(hex, coinbase = null) {
  const {data} = await api().post('/', {
    method: 'bcn_estimateRawTx',
    params: [hex, coinbase],
    id: 1,
  })
  const {result, error} = data
  if (error) throw new Error(error.message)
  return result
}

export async function getBlockAt(block) {
  const {data} = await api().post('/', {
    method: 'bcn_blockAt',
    params: [block],
    id: 1,
  })
  const {result, error} = data
  if (error) throw new Error(error.message)
  return result
}

export async function loadKeyword(index) {
  try {
    const resp = await queryClient.fetchQuery({
      queryKey: ['bcn_keyWord', index],
      queryFn: ({queryKey: [, wordIndex]}) =>
        callRpcAny({
          method: 'bcn_keyWord',
          params: [wordIndex],
          id: 1,
        }),
      staleTime: Infinity,
    })
    const {data} = resp
    const {result} = data
    return {name: result.Name, desc: result.Desc}
  } catch (error) {
    return {name: '', desc: ''}
  }
}
