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
