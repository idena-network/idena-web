/* eslint-disable react/display-name */
import {createContext, useContext, useState} from 'react'
import {decryptPrivateKey, privateKeyToAddress} from '../utils/crypto'
import {useSettingsDispatch} from './settings-context'

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

  const {saveEncryptedKey, removeEncryptedKey} = useSettingsDispatch()

  const setNewKey = (key, pass, persist) => {
    const privateKey = decryptPrivateKey(key, pass)
    if (persist) {
      saveEncryptedKey(key)
    }
    setState({
      auth: true,
      privateKey,
      coinbase: privateKeyToAddress(privateKey),
    })
  }

  const logout = () => {
    removeEncryptedKey()
    setState(initialState)
  }

  return (
    <AuthStateContext.Provider value={state}>
      <AuthDispatchContext.Provider
        value={{
          setNewKey,
          logout,
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
