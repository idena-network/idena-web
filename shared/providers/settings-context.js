import {createContext, useReducer, useContext, useEffect} from 'react'
import axios from 'axios'
import {usePersistence} from '../hooks/use-persistent-state'
import {loadPersistentState} from '../utils/persist'
import useLogger from '../hooks/use-logger'
import {fetchEpoch} from '../api'
import {checkKey} from '../api/marketplace'

const SAVE_ENCRYPTED_KEY = 'SAVE_ENCRYPTED_KEY'
const CLEAR_ENCRYPTED_KEY = 'CLEAR_ENCRYPTED_KEY'
const SAVE_CONNECTION = 'SAVE_CONNECTION'
const RESTORE_SETTINGS = 'RESTORE_SETTINGS'
const SET_API_KEY_STATE = 'SET_API_KEY_STATE'
const ADD_API_KEY_ID = 'ADD_API_KEY_ID'
const ADD_API_KEY = 'ADD_API_KEY'

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
    case ADD_API_KEY_ID: {
      return {
        ...state,
        apiKeyId: action.data,
      }
    }
    case ADD_API_KEY: {
      return {
        ...state,
        apiKey: action.data.key,
        apiKeyEpoch: action.data.epoch,
        apiKeyState: apiKeyStates.ONLINE,
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

  useEffect(() => {
    async function loadData() {
      try {
        const epochData = await fetchEpoch()
        const result = await checkKey(state.apiKey)
        if (result.data) {
          if (result.data.epoch < epochData.epoch) {
            dispatch({
              type: SET_API_KEY_STATE,
              data: {
                apiKeyState: apiKeyStates.EXPIRED,
                apiKeyData: result.data,
              },
            })
          } else {
            dispatch({
              type: SET_API_KEY_STATE,
              data: {apiKeyState: apiKeyStates.ONLINE, apiKeyData: result.data},
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

    if (state.apiKey) {
      loadData()
    } else {
      dispatch({
        type: SET_API_KEY_STATE,
        data: {apiKeyState: apiKeyStates.OFFLINE},
      })
    }
    // load api key state
  }, [dispatch, state.apiKey])

  const saveEncryptedKey = (coinbase, key) => {
    dispatch({type: SAVE_ENCRYPTED_KEY, data: {coinbase, key}})
  }

  const removeEncryptedKey = () => {
    dispatch({type: CLEAR_ENCRYPTED_KEY})
  }

  const saveConnection = (url, key) => {
    dispatch({type: SAVE_CONNECTION, data: {url, key}})
  }

  const addApiKeyId = id => {
    dispatch({type: ADD_API_KEY_ID, data: id})
  }

  const addApiKey = (key, epoch) => {
    dispatch({type: ADD_API_KEY, data: {key, epoch}})
  }

  return (
    <SettingsStateContext.Provider value={state}>
      <SettingsDispatchContext.Provider
        value={{
          saveEncryptedKey,
          removeEncryptedKey,
          saveConnection,
          addApiKeyId,
          addApiKey,
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
