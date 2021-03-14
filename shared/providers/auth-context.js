/* eslint-disable react/display-name */
import {createContext, useContext, useState} from 'react'
import {
  decryptPrivateKey,
  encryptPrivateKey,
  privateKeyToAddress,
} from '../utils/crypto'
import {useSettingsDispatch, useSettingsState} from './settings-context'

const AuthStateContext = createContext()
const AuthDispatchContext = createContext()

const initialState = {
  auth: false,
  privateKey: null,
  coinbase: null,
}
// eslint-disable-next-line react/prop-types
function AuthProvider({children}) {
  const [state, setState] = useState(initialState)

  const {encryptedKey} = useSettingsState()
  const {saveEncryptedKey, removeEncryptedKey} = useSettingsDispatch()

  const setNewKey = (key, pass, persist) => {
    const privateKey = decryptPrivateKey(key, pass)
    const coinbase = privateKeyToAddress(privateKey)
    if (persist) {
      saveEncryptedKey(coinbase, key)
    }
    setState({
      auth: true,
      privateKey,
      coinbase,
    })
  }

  const decryptKey = (key, pass) => {
    try {
      return decryptPrivateKey(key, pass)
    } catch (e) {
      return null
    }
  }

  const removeKey = () => {
    removeEncryptedKey()
    setState(initialState)
  }

  const logout = () => {
    setState(initialState)
  }

  const login = pass => {
    const privateKey = decryptPrivateKey(encryptedKey, pass)
    const coinbase = privateKeyToAddress(privateKey)
    setState({
      auth: true,
      privateKey,
      coinbase,
    })
  }

  const exportKey = pass => encryptPrivateKey(state.privateKey, pass)

  return (
    <AuthStateContext.Provider value={state}>
      <AuthDispatchContext.Provider
        value={{
          setNewKey,
          decryptKey,
          logout,
          login,
          exportKey,
          removeKey,
        }}
      >
        {children}
      </AuthDispatchContext.Provider>
    </AuthStateContext.Provider>
  )
}

function useAuthState() {
  const context = useContext(AuthStateContext)
  if (context === undefined) {
    throw new Error('useAuthState must be used within a AuthStateProvider')
  }
  return context
}

function useAuthDispatch() {
  const context = useContext(AuthDispatchContext)
  if (context === undefined) {
    throw new Error('useAuthDispatch must be used within a AuthDispatchContext')
  }
  return context
}

export {AuthProvider, useAuthState, useAuthDispatch}
