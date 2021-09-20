import React, {useState, useContext, useCallback, useEffect} from 'react'
import {useQuery} from 'react-query'
import deepEqual from 'dequal'
import {fetchIdentity, getRawTx, sendRawTx} from '../api'
import {useInterval} from '../hooks/use-interval'
import {useAuthState} from './auth-context'
import {useSettingsState} from './settings-context'
import {IdentityStatus, TxType} from '../types'
import {useEpoch} from './epoch-context'
import {privateKeyToAddress} from '../utils/crypto'
import {Transaction} from '../models/transaction'

const IdentityContext = React.createContext()

const NOT_WAITING = {
  until: null,
  fields: [],
}

export function IdentityProvider(props) {
  const {apiKey, url} = useSettingsState()
  const {coinbase} = useAuthState()
  const epoch = useEpoch()

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

  const waitOnlineUpdate = (seconds = 120) => {
    setWaitForUpdate({
      until: new Date().getTime() + seconds * 1000,
      fields: ['online', 'delegatee'],
    })
  }

  const stopWaiting = () => {
    setWaitForUpdate(NOT_WAITING)
  }

  const {refetch} = useQuery(
    ['get-identity', apiKey, url],
    () => fetchIdentity(coinbase),
    {
      retryDelay: 5 * 1000,
      enabled: !!coinbase,
      onSuccess: (nextIdentity = {}) => {
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
            state !== IdentityStatus.Terminating &&
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
    }
  )

  // refetch when connection changes
  useEffect(() => {
    if (coinbase) refetch()
  }, [apiKey, coinbase, refetch, url])

  // refetch when epoch changes
  useEffect(() => {
    if (coinbase && epoch) refetch()
  }, [coinbase, epoch, refetch])

  useInterval(
    () => {
      refetch()
    },
    waitForUpdate.until ? 10 * 1000 : null
  )

  const forceUpdate = useCallback(() => {
    if (coinbase) {
      refetch()
    }
  }, [coinbase, refetch])

  const killMe = useCallback(
    async privateKey => {
      const rawTx = await getRawTx(
        TxType.KillTx,
        privateKeyToAddress(privateKey)
      )

      const tx = new Transaction().fromHex(rawTx)
      tx.sign(privateKey)

      const result = await sendRawTx(`0x${tx.toHex()}`)
      setIdentity({...identity, state: IdentityStatus.Terminating})
      waitStateUpdate()
      return result
    },
    [identity]
  )

  const canMine =
    identity &&
    ([
      IdentityStatus.Newbie,
      IdentityStatus.Verified,
      IdentityStatus.Human,
    ].includes(identity.state) ||
      identity.isPool)

  const canTerminate =
    identity &&
    [
      IdentityStatus.Verified,
      IdentityStatus.Suspended,
      IdentityStatus.Zombie,
      IdentityStatus.Human,
    ].includes(identity.state)

  const canActivateInvite =
    identity &&
    [IdentityStatus.Undefined, IdentityStatus.Invite].includes(identity.state)

  return (
    <IdentityContext.Provider
      {...props}
      value={[
        {
          ...identity,
          canMine,
          canActivateInvite,
          isValidated: [
            IdentityStatus.Newbie,
            IdentityStatus.Verified,
            IdentityStatus.Human,
          ].includes(identity?.state),
          canInvite: identity?.invites > 0,
          canTerminate,
        },
        {
          killMe,
          waitStateUpdate,
          waitFlipsUpdate,
          waitOnlineUpdate,
          forceUpdate,
        },
      ]}
    />
  )
}

export function useIdentity() {
  const context = useContext(IdentityContext)
  if (context === undefined) {
    throw new Error('useIdentity must be used within a IdentityProvider')
  }
  return context
}
