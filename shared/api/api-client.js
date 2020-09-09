import axios from 'axios'

export const BASE_INTERNAL_API_PORT = 9119
export const BASE_API_URL = 'http://localhost:9009'

export function getRpcParams() {
  return {
    url: BASE_API_URL,
    key: '026906444538c0e5e7a66121427eb809',
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
