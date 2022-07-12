import dayjs from 'dayjs'
import {useRouter} from 'next/router'
import {useEffect, useState} from 'react'
import {useEpoch} from '../providers/epoch-context'
import {useIdentity} from '../providers/identity-context'
import {ApiKeyStates, useSettings} from '../providers/settings-context'
import {IdentityStatus} from '../types'
import {loadPersistentState, persistState} from '../utils/persist'
import {useInterval} from './use-interval'

const SHOW_RESTRICTED_INTERVAL_SEC = 60 * 15

export const FORCE_SHOW_BEFORE_VALIDATION_MINUTES = 60

export function useExpired() {
  const epochState = useEpoch()
  const [{state: identityState}] = useIdentity()
  const [{apiKeyState}] = useSettings()
  const router = useRouter()

  const [state, setState] = useState({
    storage: {dontShow: false, epoch: -1, lastTime: null, forceEpoch: -1},
    init: false,
  })

  useEffect(() => {
    const persisted = loadPersistentState('restricted-modal')
    if (persisted) {
      setState({storage: persisted, init: true})
    } else {
      setState(prevState => ({...prevState, init: true}))
    }
  }, [])

  useEffect(() => {
    persistState('restricted-modal', state.storage)
  }, [state.storage])

  const identityReadyToRedirect =
    identityState &&
    ![IdentityStatus.Undefined, IdentityStatus.Invite].includes(identityState)

  const epoch = epochState?.epoch

  const isRestrictedAccess = apiKeyState === ApiKeyStates.RESTRICTED

  const isRedirectAllowed = ![
    '/node/restricted',
    '/validation',
    '/try/validation',
    '/flips/new',
    '/flips/edit',
    '/adn/new',
    '/adn/edit',
    '/oracles/new',
  ].includes(router.pathname)

  const needRedirect = !state.storage.dontShow || state.storage.epoch !== epoch

  useInterval(
    () => {
      if (!state.storage) return

      if (
        state.storage.lastTime &&
        dayjs().diff(dayjs(state.storage.lastTime), 's') <
          SHOW_RESTRICTED_INTERVAL_SEC
      ) {
        return
      }

      setState(prevState => ({
        ...prevState,
        storage: {...prevState.storage, lastTime: dayjs().valueOf()},
      }))

      return router.push('/node/restricted')
    },
    state.init &&
      epoch >= 0 &&
      identityReadyToRedirect &&
      isRestrictedAccess &&
      isRedirectAllowed &&
      needRedirect
      ? 1000
      : null,
    true
  )

  useInterval(
    () => {
      if (!state.storage) return

      if (
        dayjs(epochState.nextValidation).diff(dayjs(), 'minute') <
          FORCE_SHOW_BEFORE_VALIDATION_MINUTES &&
        state.storage.forceEpoch !== epoch
      ) {
        setState(prevState => ({
          ...prevState,
          storage: {
            ...prevState.storage,
            lastTime: dayjs()
              .subtract(1, 'day')
              .valueOf(),
            dontShow: false,
            forceEpoch: epoch,
          },
        }))
      }
    },
    epoch >= 0 ? 1000 : null
  )

  const updateRestrictedNotNow = dontShow => {
    setState(prevState => ({
      ...prevState,
      storage: {
        ...prevState.storage,
        dontShow,
        epoch,
        lastTime: dayjs().valueOf(),
      },
    }))
  }

  const resetRestrictedModal = () => {
    setState(prevState => ({
      ...prevState,
      storage: {
        ...prevState.storage,
        lastTime: dayjs()
          .subtract(1, 'day')
          .valueOf(),
        forceEpoch: null,
      },
    }))
  }

  return {updateRestrictedNotNow, resetRestrictedModal}
}
