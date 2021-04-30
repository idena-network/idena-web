import {useCallback, useState} from 'react'
import {useQuery} from 'react-query'
import deepEqual from 'dequal'
import {fetchIdentity, killIdentity} from '../api'
import {useSettingsState} from '../providers/settings-context'
import {IdentityStatus} from '../types'
import {useAuthState} from '../providers/auth-context'
import {useGlobal} from '../providers/global-context'

function useNodeIdentity() {
  const {apiKey, url} = useSettingsState()
  const {coinbase} = useAuthState()
  const {
    identityUpdate: {
      data: waitForUpdate,
      actions: {waitStateUpdate, waitFlipsUpdate, stopWaiting},
    },
  } = useGlobal()

  const [identity, setIdentity] = useState(null)

  useQuery(['get-identity', apiKey, url], () => fetchIdentity(coinbase), {
    retryDelay: 5 * 1000,
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
          console.log(
            'stop waiting',
            waitForUpdate.fields,
            identity,
            nextIdentity
          )
          stopWaiting()
        }
        setIdentity({...nextIdentity, state})
      }
      if (waitForUpdate.until && new Date().getTime() > waitForUpdate.until) {
        stopWaiting()
      }
    },
  })

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

  return [identity || {}, {killMe, waitStateUpdate, waitFlipsUpdate}]
}

export function canActivateInvite(identity) {
  return (
    identity &&
    [IdentityStatus.Undefined, IdentityStatus.Invite].includes(identity.state)
  )
}

export default useNodeIdentity
