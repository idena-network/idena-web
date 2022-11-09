import {
  createContext,
  useReducer,
  useContext,
  useEffect,
  useCallback,
} from 'react'
import {usePersistence} from '../hooks/use-persistent-state'
import {loadPersistentState} from '../utils/persist'
import useLogger from '../hooks/use-logger'
import {fetchEpoch, fetchSync} from '../api'
import {checkKey} from '../api/marketplace'
import {useInterval} from '../hooks/use-interval'
import {getLastBlock} from '../api/indexer'
import {isVercelProduction} from '../utils/utils'

const SAVE_ENCRYPTED_KEY = 'SAVE_ENCRYPTED_KEY'
const CLEAR_ENCRYPTED_KEY = 'CLEAR_ENCRYPTED_KEY'
const SAVE_CONNECTION = 'SAVE_CONNECTION'
const SAVE_RESTRICTED_CONNECTION = 'SAVE_RESTRICTED_CONNECTION'
const RESTORE_SETTINGS = 'RESTORE_SETTINGS'
const SET_API_KEY_STATE = 'SET_API_KEY_STATE'
const ADD_PURCHASED_KEY = 'ADD_PURCHASED_KEY'
const ADD_PURCHASE = 'ADD_PURCHASE'
const SET_LANGUAGE = 'SET_LANGUAGE'

const RESTRICTED_NODE_URL = process.env.NEXT_PUBLIC_RESTRICTED_NODE_URL
const RESTRICTED_NODE_KEY = process.env.NEXT_PUBLIC_RESTRICTED_NODE_KEY

export const ApiKeyStates = {
  NONE: 0,
  OFFLINE: 1,
  ONLINE: 2,
  RESTRICTED: 3,
  EXTERNAL: 4,
}

export const SYNCING_DIFF = 50

function settingsReducer(state, action) {
  switch (action.type) {
    case SAVE_ENCRYPTED_KEY: {
      return {
        ...state,
        encryptedKey: action.data.key,
        coinbase: action.data.coinbase,
      }
    }
    case CLEAR_ENCRYPTED_KEY: {
      const s = {...state}
      delete s.encryptedKey
      delete s.coinbase
      return s
    }
    case SAVE_CONNECTION: {
      return {
        ...state,
        url: action.data.url,
        apiKey: action.data.key,
        isManualRemoteNode: action.data.isManual,
      }
    }
    case SAVE_RESTRICTED_CONNECTION: {
      const s = {...state}
      delete s.apiKeyData
      delete s.apiKeyId
      return {
        ...s,
        apiKeyState: ApiKeyStates.RESTRICTED,
        url: RESTRICTED_NODE_URL,
        apiKey: RESTRICTED_NODE_KEY,
      }
    }
    case RESTORE_SETTINGS: {
      return {
        ...action.data,
        initialized: true,
      }
    }
    case SET_API_KEY_STATE: {
      return {
        ...state,
        ...action.data,
      }
    }
    case ADD_PURCHASE: {
      return {
        ...state,
        apiKeyId: action.data.apiKeyId,
        apiKeyData: {
          provider: action.data.provider,
        },
        isManualRemoteNode: false,
      }
    }
    case ADD_PURCHASED_KEY: {
      return {
        ...state,
        apiKey: action.data.key,
        apiKeyData: {
          ...state.apiKeyData,
          ...action.data,
        },
        apiKeyState: ApiKeyStates.ONLINE,
        url: action.data.url || state.url,
        apiKeyId: null,
      }
    }
    case SET_LANGUAGE: {
      return {
        ...state,
        language: action.data.language,
      }
    }
    default:
      return state
  }
}

const SettingsStateContext = createContext()
const SettingsDispatchContext = createContext()

const DEFAULT_NODE_URL = 'https://node.idena.io/'

const API_KEY_CHECK_INTERVAL = 5 * 60 * 1000

function isRestrictedAccess(url, apiKey) {
  try {
    return (
      new URL(url).host === new URL(RESTRICTED_NODE_URL).host &&
      apiKey === RESTRICTED_NODE_KEY
    )
  } catch {
    return false
  }
}

// eslint-disable-next-line react/prop-types
function SettingsProvider({children}) {
  const [state, dispatch] = usePersistence(
    useLogger(
      useReducer(settingsReducer, {
        url: DEFAULT_NODE_URL,
      })
    ),
    'settings'
  )

  useEffect(() => {
    dispatch({
      type: RESTORE_SETTINGS,
      data: loadPersistentState('settings') || {},
    })
  }, [dispatch])

  const performCheck = useCallback(() => {
    async function softCheckKey(key) {
      try {
        return await checkKey(key)
      } catch (e) {
        return null
      }
    }
    async function softCheckIsSyncing() {
      try {
        const lastBlock = await getLastBlock()
        const indexerResult = lastBlock?.height
        if (!indexerResult) return false

        const chain = await fetchSync()

        if (indexerResult - chain.currentBlock > SYNCING_DIFF) return true
      } catch (e) {
        return false
      }
    }
    async function loadData() {
      try {
        const {epoch} = await fetchEpoch()

        if (isRestrictedAccess(state.url, state.apiKey)) {
          return dispatch({
            type: SET_API_KEY_STATE,
            data: {apiKeyState: ApiKeyStates.RESTRICTED},
          })
        }

        // do not check manual api key
        if (state.isManualRemoteNode) {
          return dispatch({
            type: SET_API_KEY_STATE,
            data: {apiKeyState: ApiKeyStates.EXTERNAL},
          })
        }

        // check node is syncing only in production
        if (isVercelProduction)
          if (await softCheckIsSyncing()) {
            return dispatch({
              type: SET_API_KEY_STATE,
              data: {apiKeyState: ApiKeyStates.OFFLINE},
            })
          }

        const result = await softCheckKey(state.apiKey)
        if (result) {
          if (result.epoch < epoch) {
            dispatch({
              type: SET_API_KEY_STATE,
              data: {
                apiKeyState: ApiKeyStates.RESTRICTED,
                apiKeyData: result,
              },
            })
          } else {
            dispatch({
              type: SET_API_KEY_STATE,
              data: {apiKeyState: ApiKeyStates.ONLINE, apiKeyData: result},
            })
          }
        } else {
          dispatch({
            type: SET_API_KEY_STATE,
            data: {apiKeyState: ApiKeyStates.EXTERNAL},
          })
        }
      } catch (e) {
        dispatch({
          type: SET_API_KEY_STATE,
          data: {apiKeyState: ApiKeyStates.OFFLINE},
        })
      }
    }
    if (!state.initialized) {
      dispatch({
        type: SET_API_KEY_STATE,
        data: {
          apiKeyState: isRestrictedAccess()
            ? ApiKeyStates.RESTRICTED
            : ApiKeyStates.ONLINE,
        },
      })
    } else if (state.url && state.apiKey) {
      loadData()
    } else {
      dispatch({
        type: SET_API_KEY_STATE,
        data: {apiKeyState: ApiKeyStates.OFFLINE},
      })
    }
  }, [
    dispatch,
    state.apiKey,
    state.initialized,
    state.isManualRemoteNode,
    state.url,
  ])

  useEffect(() => {
    performCheck()
  }, [performCheck, state.apiKey, state.url])

  useInterval(performCheck, API_KEY_CHECK_INTERVAL)

  const saveEncryptedKey = useCallback(
    (coinbase, key) => {
      dispatch({type: SAVE_ENCRYPTED_KEY, data: {coinbase, key}})
    },
    [dispatch]
  )

  const removeEncryptedKey = useCallback(() => {
    dispatch({type: CLEAR_ENCRYPTED_KEY})
  }, [dispatch])

  const saveConnection = useCallback(
    (url, key, isManual) => {
      dispatch({type: SAVE_CONNECTION, data: {url, key, isManual}})
    },
    [dispatch]
  )

  const saveRestrictedConnection = useCallback(() => {
    dispatch({type: SAVE_RESTRICTED_CONNECTION})
  }, [dispatch])

  const addPurchase = useCallback(
    (apiKeyId, provider) => {
      dispatch({type: ADD_PURCHASE, data: {apiKeyId, provider}})
    },
    [dispatch]
  )

  const addPurchasedKey = useCallback(
    (url, key, epoch, provider) => {
      dispatch({type: ADD_PURCHASED_KEY, data: {url, key, epoch, provider}})
    },
    [dispatch]
  )

  const setLanguage = useCallback(
    language => {
      dispatch({type: SET_LANGUAGE, data: {language}})
    },
    [dispatch]
  )

  const isNewUser = !state.url && !state.apiKey

  return (
    <SettingsStateContext.Provider value={{...state, isNewUser}}>
      <SettingsDispatchContext.Provider
        value={{
          saveEncryptedKey,
          removeEncryptedKey,
          saveConnection,
          saveRestrictedConnection,
          addPurchase,
          addPurchasedKey,
          setLanguage,
        }}
      >
        {children}
      </SettingsDispatchContext.Provider>
    </SettingsStateContext.Provider>
  )
}

function useSettingsState() {
  const context = useContext(SettingsStateContext)
  if (context === undefined) {
    throw new Error(
      'useSettingsState must be used within a SettingsStateProvider'
    )
  }
  return context
}

function useSettingsDispatch() {
  const context = useContext(SettingsDispatchContext)
  if (context === undefined) {
    throw new Error(
      'useSettingsDispatch must be used within a SettingsDispatchContext'
    )
  }
  return context
}

function useSettings() {
  return [useSettingsState(), useSettingsDispatch()]
}

export {SettingsProvider, useSettingsState, useSettingsDispatch, useSettings}
