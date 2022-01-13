import axios from 'axios'

function apiClient() {
  return axios.create({
    baseURL: 'https://api.idena.io/api',
  })
}

async function getResponse(request) {
  const {data} = await request
  const {result, continuationToken, error} = data
  if (error) throw error
  if (continuationToken) result.continuationToken = continuationToken
  return result
}

export async function getLastEpoch() {
  return getResponse(apiClient().get('epoch/last'))
}

export async function getEpoch(epoch) {
  return getResponse(apiClient().get(`epoch/${epoch}`))
}

export async function getLastBlock() {
  return getResponse(apiClient().get('block/last'))
}

export async function searchInvite(invite) {
  return getResponse(apiClient().get('search', {params: {value: invite}}))
}

export async function getTxs(address) {
  return getResponse(
    apiClient().get(`address/${address}/txs`, {params: {limit: 10}})
  )
}

export async function getIdentity(address) {
  return getResponse(apiClient().get(`identity/${address}`))
}
