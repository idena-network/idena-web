/* eslint-disable import/prefer-default-export */
import api from './api-client'
/**
 * Fetches hex representation of the FLIP published in the network
 * @param {string} data Hex data with
 * @returns {Flip} Encoded flip
 */
export async function getCid(ipfsData) {
  const {data} = await api().post('/', {
    method: 'ipfs_cid',
    params: [ipfsData],
    id: 1,
  })
  const {result, error} = data
  if (error) throw new Error(error.message)
  return result
}
