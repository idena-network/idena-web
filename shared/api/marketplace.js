import axios from 'axios'
import {promiseTimeout} from '../utils/utils'

function api() {
  return axios.create({
    baseURL: process.env.NEXT_PUBLIC_MARKETPLACE_URL,
  })
}

export function checkKey(key) {
  return api()
    .get('/api/key/check', {
      params: {key},
    })
    .then(x => x.data)
}

export function checkSavedKey(coinbase, signature) {
  return api()
    .post('/api/key/restore', {coinbase, signature})
    .then(x => x.data)
}

export function getProviders() {
  return api()
    .get('/api/provider/list')
    .then(x => x.data)
}

export function getProvider(id) {
  return api()
    .get('/api/provider/get', {
      params: {id},
    })
    .then(x => x.data)
}

export function getKeyById(id) {
  return api()
    .get('/api/key/get', {
      params: {id},
    })
    .then(x => x.data)
}

export function buyKey(coinbase, tx, provider) {
  return api()
    .post('/api/key/buy', {coinbase, tx, provider})
    .then(x => x.data)
}

export function activateKey(coinbase, tx, providers) {
  return api()
    .post('/api/key/activate', {coinbase, tx, providers})
    .then(x => x.data)
}

export function getCandidateKey(coinbase, signature, providers) {
  return api()
    .post('/api/key/for-candidate', {coinbase, signature, providers})
    .then(x => x.data)
}

const SHARED_NODE_CHECK_KEY = 'check-status-key'

export async function checkProvider(url) {
  const {data} = await axios.create({baseURL: url}).post('/', {
    method: 'dna_epoch',
    params: [],
    id: 1,
    key: SHARED_NODE_CHECK_KEY,
  })
  const {result, error} = data
  if (error) throw new Error(error)
  return result
}

export async function checkProviderSyncing(url) {
  const instance = axios.create({baseURL: url})
  instance.interceptors.request.use(config => {
    config.headers['request-startTime'] = new Date().getTime()
    return config
  })

  instance.interceptors.response.use(response => {
    const start = response.config.headers['request-startTime']
    const end = new Date().getTime()
    const milliseconds = end - start
    response.headers['request-duration'] = milliseconds
    return response
  })
  const {data, headers} = await instance.post('/', {
    method: 'bcn_syncing',
    params: [],
    id: 1,
    key: SHARED_NODE_CHECK_KEY,
  })
  const {result, error} = data
  if (error) throw new Error(error)
  return {...result, duration: headers['request-duration']}
}

async function safeCheckProvider(provider) {
  try {
    await promiseTimeout(checkProvider(provider.data.url), 3000)
    return {id: provider.id, available: true}
  } catch {
    return {id: provider.id, available: false}
  }
}

export async function getAvailableProviders() {
  const providers = await getProviders()
  const inviteProviders = providers.filter(x => x.inviteSlots)

  const result = await Promise.all(inviteProviders.map(safeCheckProvider))

  return result.filter(x => x.available).map(x => x.id)
}
