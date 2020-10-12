import {createContext, useReducer, useContext} from 'react'
import {usePersistence} from '../hooks/use-persistent-state'
import {loadPersistentState} from '../utils/persist'
import useLogger from '../hooks/use-logger'

const SAVE_ENCRYPTED_KEY = 'SAVE_ENCRYPTED_KEY'
const CLEAR_ENCRYPTED_KEY = 'CLEAR_ENCRYPTED_KEY'
const SAVE_CONNECTION = 'SAVE_CONNECTION'

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
    default:
      return state
  }
}

const SettingsStateContext = createContext()
const SettingsDispatchContext = createContext()

// eslint-disable-next-line react/prop-types
function SettingsProvider({children}) {
  const [state, dispatch] = usePersistence(
    useLogger(
      useReducer(
        settingsReducer,
        loadPersistentState('settings') || {
          url: 'https://app.idena.io/api/node',
        }
      )
    ),
    'settings'
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

  return (
    <SettingsStateContext.Provider value={state}>
      <SettingsDispatchContext.Provider
        value={{
          saveEncryptedKey,
          removeEncryptedKey,
          saveConnection,
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
