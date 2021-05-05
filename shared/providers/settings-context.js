import {
  createContext,
  useReducer,
  useContext,
  useEffect,
  useCallback,
} from 'react'
import {useRouter} from 'next/router'
import {usePersistence} from '../hooks/use-persistent-state'
import {loadPersistentState} from '../utils/persist'
import useLogger from '../hooks/use-logger'
import {fetchEpoch} from '../api'
import {checkKey} from '../api/marketplace'
import {useInterval} from '../hooks/use-interval'

const SAVE_ENCRYPTED_KEY = 'SAVE_ENCRYPTED_KEY'
const CLEAR_ENCRYPTED_KEY = 'CLEAR_ENCRYPTED_KEY'
const SAVE_CONNECTION = 'SAVE_CONNECTION'
const RESTORE_SETTINGS = 'RESTORE_SETTINGS'
const SET_API_KEY_STATE = 'SET_API_KEY_STATE'
const ADD_PURCHASED_KEY = 'ADD_PURCHASED_KEY'
const ADD_PURCHASE = 'ADD_PURCHASE'

export const apiKeyStates = {
  NONE: 0,
  OFFLINE: 1,
  ONLINE: 2,
  EXPIRED: 3,
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
const EXPIRED_INTERVAL = 5 * 60 * 1000

// eslint-disable-next-line react/prop-types
function SettingsProvider({children}) {
  const router = useRouter()

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
    async function loadData() {
      try {
        const {epoch} = await fetchEpoch()
        const result = await checkKey(state.apiKey)
        if (result) {
          if (result.epoch < epoch - 1) {
            dispatch({
              type: SET_API_KEY_STATE,
              data: {apiKeyState: apiKeyStates.OFFLINE},
            })
          } else if (result.epoch < epoch) {
            dispatch({
              type: SET_API_KEY_STATE,
              data: {
                apiKeyState: apiKeyStates.EXPIRED,
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
    if (state.url && state.apiKey) {
      loadData()
    } else {
      dispatch({
        type: SET_API_KEY_STATE,
        data: {apiKeyState: apiKeyStates.OFFLINE},
      })
    }
  }, [dispatch, state.apiKey, state.url])

  useEffect(() => {
    performCheck()
  }, [performCheck])

  useInterval(performCheck, API_KEY_CHECK_INTERVAL)

  useInterval(
    () => {
      if (
        router.pathname !== '/node/expired' &&
        router.pathname !== '/validation'
      )
        router.push('/node/expired')
    },
    state.apiKeyState === apiKeyStates.EXPIRED ? EXPIRED_INTERVAL : null
  )

  const saveEncryptedKey = (coinbase, key) => {
    dispatch({type: SAVE_ENCRYPTED_KEY, data: {coinbase, key}})
  }

  const removeEncryptedKey = () => {
    dispatch({type: CLEAR_ENCRYPTED_KEY})
  }

  const saveConnection = (url, key) => {
    dispatch({type: SAVE_CONNECTION, data: {url, key}})
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

export {SettingsProvider, useSettingsState, useSettingsDispatch}
