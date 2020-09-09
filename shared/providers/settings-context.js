import {createContext, useReducer, useContext} from 'react'
import {usePersistence} from '../hooks/use-persistent-state'
import {loadPersistentState} from '../utils/persist'
import useLogger from '../hooks/use-logger'

const SAVE_ENCRYPTED_KEY = 'SAVE_ENCRYPTED_KEY'
const CLEAR_ENCRYPTED_KEY = 'CLEAR_ENCRYPTED_KEY'

function settingsReducer(state, action) {
  switch (action.type) {
    case SAVE_ENCRYPTED_KEY: {
      return {...state, encryptedKey: action.data}
    }
    case CLEAR_ENCRYPTED_KEY: {
      return {...state, encryptedKey: null}
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
      useReducer(settingsReducer, loadPersistentState('settings') || {})
    ),
    'settings'
  )

  const saveEncryptedKey = key => {
    dispatch({type: SAVE_ENCRYPTED_KEY, data: key})
  }

  const removeEncryptedKey = () => {
    dispatch({type: CLEAR_ENCRYPTED_KEY})
  }

  return (
    <SettingsStateContext.Provider value={state}>
      <SettingsDispatchContext.Provider
        value={{
          saveEncryptedKey,
          removeEncryptedKey,
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
