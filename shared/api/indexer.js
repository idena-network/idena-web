import axios from 'axios'

function apiClient() {
  return axios.create({
    baseURL: process.env.NEXT_PUBLIC_INDEXER_URL,
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

export async function getTxs(address, count = 10, continuationToken) {
  return getResponse(
    apiClient().get(`address/${address}/txs`, {
      params: {limit: count, continuationToken},
    })
  )
}

export async function getIdentity(address) {
  return getResponse(apiClient().get(`identity/${address}`))
}

export async function getValidationSummary(epoch, address) {
  return getResponse(
    apiClient().get(`epoch/${epoch}/identity/${address}/validationsummary`)
  )
}
