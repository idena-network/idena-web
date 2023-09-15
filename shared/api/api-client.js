import axios from 'axios'
import {loadPersistentState} from '../utils/persist'

export const BASE_NODE_URL = 'http://localhost:9009'
export const INDEXER_API_URL = 'https://api.idena.io/api/'

const MODE_BEST_TIMEOUT = 10000
const PROXY_ERROR_BATCH_NOT_SUPPORTED = 'method not available'

class RpcError extends Error {
  constructor(message) {
    super(message)
    this.name = this.constructor.name
  }
}

export function getRpcParams() {
  const state = loadPersistentState('settings')
  if (!state) {
    return [
      {
        url: BASE_NODE_URL,
        key: '',
      },
    ]
  }
  const result = [
    {
      url: state.url || BASE_NODE_URL,
      key: state.apiKey,
    },
  ]
  if (state.useSecondary && state.secondaryNodes) {
    for (const secondary of state.secondaryNodes) {
      result.push({
        url: secondary.url,
        key: secondary.apiKey,
      })
    }
  }
  return result
}

export default function api({useProxy = false, url, apiKey} = {}) {
  let u
  let k
  if (url) {
    u = url
    k = apiKey
  } else {
    const params = getRpcParams()[0]
    ;({url: u, key: k} = params)
  }
  return createInstance(u, k, 0, useProxy)
}

/**
 * @returns {Promise<import("axios").AxiosResponse>}
 */
export async function callRpcAny(rpcBody, {assert, useProxy} = {}) {
  const url = useProxy ? '/api/node/proxy' : '/'
  return Promise.any(
    apis(0, useProxy).map(v =>
      v.post(url, {...rpcBody}).then(value => {
        const {data} = value
        const {result, error} = data
        if (error) throw new RpcError(error.message)
        if (assert && !assert(result)) {
          throw new Error('assertion failed')
        }
        return value
      })
    )
  ).catch(catchError)
}

/**
 * @returns {Promise<import("axios").AxiosResponse>}
 */
export async function callRpcBest(rpcBody, useProxy = false) {
  const url = useProxy ? '/api/node/proxy' : '/'
  return Promise.allSettled(
    apis(MODE_BEST_TIMEOUT, useProxy).map(v =>
      v
        .post(url, [
          {...rpcBody},
          {
            method: 'bcn_syncing',
            params: [],
            id: 2,
          },
        ])
        .catch(err => {
          const {response} = err
          if (response && response.data === PROXY_ERROR_BATCH_NOT_SUPPORTED) {
            return v.post(url, {...rpcBody})
          }
          throw err
        })
    )
  )
    .then(results => {
      let bestHeight = 0
      let bestValue
      let firstError
      let firstRpcError
      let firstRpcSyncError
      results.forEach(result => {
        const {status, reason, value} = result
        if (status === 'rejected') {
          if (!firstError) {
            firstError = reason
          }
          return
        }
        const {
          rpcData,
          rpcError,
          rpcSyncResult,
          rpcSyncError,
          ignoreSync,
        } = extractBatchResponseData(value)
        if (rpcError) {
          if (!firstRpcError) {
            firstRpcError = new RpcError(rpcError.message)
          }
          return
        }
        if (rpcSyncError) {
          if (!firstRpcSyncError) {
            firstRpcSyncError = new RpcError(rpcSyncError.message)
          }
          return
        }
        if (ignoreSync || bestHeight < rpcSyncResult.currentBlock) {
          if (!ignoreSync) {
            bestHeight = rpcSyncResult.currentBlock
          }
          bestValue = {...value, data: {...rpcData}}
        }
      })
      if (bestValue) {
        return bestValue
      }
      throw firstRpcError || firstRpcSyncError || firstError
    })
    .catch(catchError)
}

function apis(timeout, useProxy = false) {
  const params = getRpcParams()
  const result = []
  for (let i = 0; i < params.length; i += 1) {
    const isPrimary = i === 0
    result.push(
      createInstance(
        params[i].url,
        params[i].key,
        timeout,
        isPrimary && useProxy
      )
    )
  }
  return result
}

function createInstance(url, key, timeout, useProxy) {
  const instance = axios.create({
    baseURL: useProxy ? `${process.env.NEXT_PUBLIC_MARKETPLACE_URL}` : `${url}`,
    timeout,
  })
  instance.interceptors.request.use(function(config) {
    if (Array.isArray(config.data)) {
      for (let i = 0; i < config.data.length; i += 1) {
        config.data[i].key = key
      }
    } else {
      config.data.key = key
    }
    return config
  })
  return instance
}

function extractBatchResponseData(result) {
  let rpcError
  let rpcData
  let rpcSyncResult
  let rpcSyncError
  let ignoreSync
  let rpcResult
  const {data} = result
  if (Array.isArray(data)) {
    ;[rpcData, {result: rpcSyncResult, error: rpcSyncError}] = data
    ;({result: rpcResult, error: rpcError} = rpcData)
    ignoreSync = false
  } else {
    rpcData = data
    ;({result: rpcResult, error: rpcError} = rpcData)
    ignoreSync = true
  }
  return {rpcData, rpcResult, rpcError, rpcSyncResult, rpcSyncError, ignoreSync}
}

function catchError(err) {
  if (err && err.errors && err.errors.length) {
    for (const subErr of err.errors) {
      if (subErr instanceof RpcError) {
        throw new Error(subErr.message)
      }
    }
  }
  throw err
}
