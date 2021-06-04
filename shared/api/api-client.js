import axios from 'axios'
import {loadPersistentState} from '../utils/persist'

export const BASE_NODE_URL = 'http://localhost:9009'
export const INDEXER_API_URL = 'https://api.idena.io'

export function getRpcParams() {
  const state = loadPersistentState('settings')
  if (!state) {
    return {
      url: BASE_NODE_URL,
      key: '',
    }
  }
  return {
    url: state.url,
    key: state.apiKey,
  }
}

export default function api(useProxy = false) {
  const params = getRpcParams()
  const instance = axios.create({
    baseURL: useProxy
      ? `${process.env.NEXT_PUBLIC_MARKETPLACE_URL}`
      : params.url,
  })
  instance.interceptors.request.use(function(config) {
    config.data.key = params.key
    return config
  })
  return instance
}

export function indexerApi() {
  return axios.create({
    baseURL: INDEXER_API_URL,
  })
}
