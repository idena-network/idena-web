import axios from 'axios'

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

export function activateKey(coinbase, tx) {
  return api()
    .post('/api/key/activate', {coinbase, tx})
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
