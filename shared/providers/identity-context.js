import React, {useState, useContext, useCallback} from 'react'
import {useQuery, useQueryClient} from 'react-query'
import deepEqual from 'dequal'
import {fetchIdentity, killIdentity} from '../api'
import {useInterval} from '../hooks/use-interval'
import {useAuthState} from './auth-context'
import {useSettingsState} from './settings-context'
import {IdentityStatus} from '../types'

const IdentityContext = React.createContext()

const NOT_WAITING = {
  until: null,
  fields: [],
}

export function IdentityProvider(props) {
  const queryClient = useQueryClient()
  const {apiKey, url} = useSettingsState()
  const {coinbase} = useAuthState()

  const [waitForUpdate, setWaitForUpdate] = useState(NOT_WAITING)

  const [identity, setIdentity] = useState(null)

  const waitStateUpdate = (seconds = 120) => {
    setWaitForUpdate({
      until: new Date().getTime() + seconds * 1000,
      fields: ['state'],
    })
  }

  const waitFlipsUpdate = (seconds = 120) => {
    setWaitForUpdate({
      until: new Date().getTime() + seconds * 1000,
      fields: ['flips'],
    })
  }

  const stopWaiting = () => {
    setWaitForUpdate(NOT_WAITING)
  }

  useQuery(['get-identity', apiKey, url], () => fetchIdentity(coinbase), {
    retryDelay: 5 * 1000,
    enabled: !!coinbase,
    onSuccess: nextIdentity => {
      if (!deepEqual(identity, nextIdentity)) {
        const state =
          identity &&
          identity.state === IdentityStatus.Terminating &&
          nextIdentity &&
          nextIdentity.state !== IdentityStatus.Undefined // still mining
            ? identity.state
            : nextIdentity.state

        // we are waiting for some changes
        if (
          identity &&
          waitForUpdate.until &&
          waitForUpdate.fields.some(
            field => !deepEqual(identity[field], nextIdentity[field])
          )
        ) {
          stopWaiting()
        }
        setIdentity({...nextIdentity, state})
      }
      if (waitForUpdate.until && new Date().getTime() > waitForUpdate.until) {
        stopWaiting()
      }
    },
  })

  useInterval(
    () => {
      queryClient.invalidateQueries('get-identity')
    },
    waitForUpdate.until ? 10 * 1000 : null
  )

  const killMe = useCallback(
    async ({to}) => {
      const resp = await killIdentity(identity.address, to)
      const {result} = resp

      if (result) {
        setIdentity({...identity, state: IdentityStatus.Terminating})
        return result
      }
      return resp
    },
    [identity]
  )

  return (
    <IdentityContext.Provider
      {...props}
      value={[identity || {}, {killMe, waitStateUpdate, waitFlipsUpdate}]}
    />
  )
}

export function canActivateInvite(identity) {
  return (
    identity &&
    [IdentityStatus.Undefined, IdentityStatus.Invite].includes(identity.state)
  )
}

export function useIdentity() {
  const context = useContext(IdentityContext)
  if (context === undefined) {
    throw new Error('useIdentity must be used within a IdentityProvider')
  }
  return context
}
