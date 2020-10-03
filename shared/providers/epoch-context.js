import {useMemo, useEffect, useContext, useState, createContext} from 'react'
import deepEqual from 'dequal'
import {useMachine} from '@xstate/react'
import {useInterval} from '../hooks/use-interval'
import {fetchEpoch} from '../api'
import {
  shouldExpectValidationResults,
  hasPersistedValidationResults,
} from '../../screens/validation/utils'

import {persistItem} from '../utils/persist'
import {createValidationFlipsMachine} from '../../screens/validation/machine'
import {useAuthState} from './auth-context'

export const EpochPeriod = {
  FlipLottery: 'FlipLottery',
  ShortSession: 'ShortSession',
  LongSession: 'LongSession',
  AfterLongSession: 'AfterLongSession',
  None: 'None',
}

const EpochStateContext = createContext()
const EpochDispatchContext = createContext()

// eslint-disable-next-line react/prop-types
export function EpochProvider({children}) {
  const [epoch, setEpoch] = useState(null)
  const [interval, setInterval] = useState(1000 * 3)

  useEffect(() => {
    let ignore = false

    async function fetchData() {
      try {
        const nextEpoch = await fetchEpoch()
        if (!ignore) {
          setEpoch(nextEpoch)
        }
      } catch (error) {
        setInterval(1000 * 5)
        console.error('An error occured while fetching epoch', error.message)
      }
    }

    fetchData()

    return () => {
      ignore = true
    }
  }, [])

  useInterval(async () => {
    try {
      const nextEpoch = await fetchEpoch()
      if (!deepEqual(epoch, nextEpoch)) {
        setEpoch(nextEpoch)
      }
    } catch (error) {
      console.error('An error occured while fetching epoch', error.message)
    }
  }, interval)

  useEffect(() => {
    if (
      epoch &&
      shouldExpectValidationResults(epoch.epoch) &&
      !hasPersistedValidationResults(epoch.epoch)
    ) {
      persistItem('validationResults', epoch.epoch, {
        epochStart: new Date().toISOString(),
      })
    }
  }, [epoch])

  const {coinbase, privateKey} = useAuthState()

  const validationFlipsMachine = useMemo(
    () => createValidationFlipsMachine(),
    []
  )

  const [_, send] = useMachine(validationFlipsMachine, {
    logger: console.log,
  })

  useEffect(() => {
    if (epoch && privateKey && epoch.currentPeriod !== 'None') {
      send('START', {coinbase, privateKey, epoch: epoch?.epoch ?? 0})
    }
  }, [coinbase, epoch, privateKey, send])

  return (
    <EpochStateContext.Provider value={epoch || null}>
      <EpochDispatchContext.Provider value={null}>
        {children}
      </EpochDispatchContext.Provider>
    </EpochStateContext.Provider>
  )
}

export function useEpochState() {
  const context = useContext(EpochStateContext)
  if (context === undefined) {
    throw new Error('EpochState must be used within a EpochProvider')
  }
  return context
}

export function useEpochDispatch() {
  const context = useContext(EpochDispatchContext)
  if (context === undefined) {
    throw new Error('EpochDispatch must be used within a EpochProvider')
  }
  return context
}
