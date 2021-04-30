import {useCallback, useState} from 'react'
import {useQuery, useQueryClient} from 'react-query'
import deepEqual from 'dequal'
import {fetchIdentity, killIdentity} from '../api'
import {useSettingsState} from '../providers/settings-context'
import {IdentityStatus} from '../types'
import {useInterval} from './use-interval'
import {useAuthState} from '../providers/auth-context'

const NOT_WAITING = {
  until: null,
  fields: [],
}

function useNodeIdentity() {
  const queryClient = useQueryClient()
  const {apiKey, url} = useSettingsState()
  const {coinbase} = useAuthState()

  const [waitForUpdate, setWaitForUpdate] = useState(NOT_WAITING)

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
          setWaitForUpdate(NOT_WAITING)
        }
        setIdentity({...nextIdentity, state})
      }
      if (waitForUpdate.until && new Date().getTime() > waitForUpdate.until) {
        setWaitForUpdate(NOT_WAITING)
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

  const waitStateUpdate = (seconds = 120) => {
    console.log('start waiting state')
    setWaitForUpdate({
      until: new Date().getTime() + seconds * 1000,
      fields: ['state'],
    })
  }

  const waitFlipsUpdate = (seconds = 120) => {
    console.log('start waiting flips')
    setWaitForUpdate({
      until: new Date().getTime() + seconds * 1000,
      fields: ['flips'],
    })
  }

  return [identity || {}, {killMe, waitStateUpdate, waitFlipsUpdate}]
}

export function canActivateInvite(identity) {
  return (
    identity &&
    [IdentityStatus.Undefined, IdentityStatus.Invite].includes(identity.state)
  )
}

export function canValidate(identity) {
  if (!identity) {
    return false
  }

  const {requiredFlips, flips, state} = identity

  const numOfFlipsToSubmit = requiredFlips - (flips || []).length
  const shouldSendFlips = numOfFlipsToSubmit > 0

  return (
    ([
      IdentityStatus.Human,
      IdentityStatus.Verified,
      IdentityStatus.Newbie,
    ].includes(state) &&
      !shouldSendFlips) ||
    [
      IdentityStatus.Candidate,
      IdentityStatus.Suspended,
      IdentityStatus.Zombie,
    ].includes(state)
  )
}

export default useNodeIdentity
