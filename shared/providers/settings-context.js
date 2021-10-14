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
import {fetchEpoch} from '../api'
import {checkKey, checkProvider} from '../api/marketplace'
import {useInterval} from '../hooks/use-interval'

const SAVE_ENCRYPTED_KEY = 'SAVE_ENCRYPTED_KEY'
const CLEAR_ENCRYPTED_KEY = 'CLEAR_ENCRYPTED_KEY'
const SAVE_CONNECTION = 'SAVE_CONNECTION'
const SAVE_RESTRICTED_CONNECTION = 'SAVE_RESTRICTED_CONNECTION'
const RESTORE_SETTINGS = 'RESTORE_SETTINGS'
const SET_API_KEY_STATE = 'SET_API_KEY_STATE'
const ADD_PURCHASED_KEY = 'ADD_PURCHASED_KEY'
const ADD_PURCHASE = 'ADD_PURCHASE'

const RESTRICTED_NODE_URL = process.env.NEXT_PUBLIC_RESTRICTED_NODE_URL
const RESTRICTED_NODE_KEY = process.env.NEXT_PUBLIC_RESTRICTED_NODE_KEY

export const apiKeyStates = {
  NONE: 0,
  OFFLINE: 1,
  ONLINE: 2,
  RESTRICTED: 3,
  EXTERNAL: 4,
}

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
      }
    }
    case SAVE_RESTRICTED_CONNECTION: {
      const s = {...state}
      delete s.apiKeyData
      delete s.apiKeyId
      return {
        ...s,
        apiKeyState: apiKeyStates.RESTRICTED,
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
        apiKeyState: apiKeyStates.ONLINE,
        url: action.data.url || state.url,
        apiKeyId: null,
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

    async function softCheckEpoch() {
      try {
        const {epoch} = await fetchEpoch()
        return epoch
      } catch (e) {
        return null
      }
    }

    async function loadData() {
      try {
        const epoch = await softCheckEpoch()

        // if key is outdated, but node is available, turn on restricted mode
        if (epoch === null) {
          await checkProvider(state.url)
          return dispatch({type: SAVE_RESTRICTED_CONNECTION})
        }

        // if we are connected to the restricted node
        if (isRestrictedAccess(state.url, state.apiKey)) {
          return dispatch({
            type: SET_API_KEY_STATE,
            data: {apiKeyState: apiKeyStates.RESTRICTED},
          })
        }

        const result = await softCheckKey(state.apiKey)

        if (result) {
          if (result.epoch < epoch) {
            dispatch({
              type: SET_API_KEY_STATE,
              data: {
                apiKeyState: apiKeyStates.RESTRICTED,
                apiKeyData: result,
              },
            })
          } else {
            dispatch({
              type: SET_API_KEY_STATE,
              data: {apiKeyState: apiKeyStates.ONLINE, apiKeyData: result},
            })
          }
        } else {
          dispatch({
            type: SET_API_KEY_STATE,
            data: {apiKeyState: apiKeyStates.EXTERNAL},
          })
        }
      } catch (e) {
        dispatch({
          type: SET_API_KEY_STATE,
          data: {apiKeyState: apiKeyStates.OFFLINE},
        })
      }
    }
    if (!state.initialized) {
      dispatch({
        type: SET_API_KEY_STATE,
        data: {
          apiKeyState: isRestrictedAccess()
            ? apiKeyStates.RESTRICTED
            : apiKeyStates.ONLINE,
        },
      })
    } else if (state.url && state.apiKey) {
      loadData()
    } else {
      dispatch({
        type: SET_API_KEY_STATE,
        data: {apiKeyState: apiKeyStates.OFFLINE},
      })
    }
  }, [dispatch, state.apiKey, state.initialized, state.url])

  useEffect(() => {
    performCheck()
  }, [performCheck, state.apiKey, state.url])

  useInterval(performCheck, API_KEY_CHECK_INTERVAL)

  const saveEncryptedKey = (coinbase, key) => {
    dispatch({type: SAVE_ENCRYPTED_KEY, data: {coinbase, key}})
  }

  const removeEncryptedKey = () => {
    dispatch({type: CLEAR_ENCRYPTED_KEY})
  }

  const saveConnection = (url, key) => {
    dispatch({type: SAVE_CONNECTION, data: {url, key}})
  }

  const saveRestrictedConnection = () => {
    dispatch({type: SAVE_RESTRICTED_CONNECTION})
  }

  const addPurchase = (apiKeyId, provider) => {
    dispatch({type: ADD_PURCHASE, data: {apiKeyId, provider}})
  }

  const addPurchasedKey = (url, key, epoch, provider) => {
    dispatch({type: ADD_PURCHASED_KEY, data: {url, key, epoch, provider}})
  }

  return (
    <SettingsStateContext.Provider value={state}>
      <SettingsDispatchContext.Provider
        value={{
          saveEncryptedKey,
          removeEncryptedKey,
          saveConnection,
          saveRestrictedConnection,
          addPurchase,
          addPurchasedKey,
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
