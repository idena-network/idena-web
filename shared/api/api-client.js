import axios from 'axios'
import {loadPersistentState} from '../utils/persist'

export const BASE_INTERNAL_API_PORT = 9119
export const BASE_API_URL = 'http://localhost:7979'

export function getRpcParams() {
  const state = loadPersistentState('settings')
  if (!state) {
    return {
      url: '',
      key: '',
    }
  }
  return {
    url: state.url,
    key: state.apiKey,
  }
}

function api() {
  const params = getRpcParams()
  const instance = axios.create({
    baseURL: params.url,
  })
  instance.interceptors.request.use(function(config) {
    config.data.key = params.key
    return config
  })
  return instance
}

export default api
