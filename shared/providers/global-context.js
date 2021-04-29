import React, {useState, useEffect} from 'react'
import {useQueryClient} from 'react-query'
import useNodeEpoch from '../hooks/use-node-epoch'
import {useInterval} from '../hooks/use-interval'
import useNodeTiming from '../hooks/use-node-timing'

import {
  didValidate,
  hasPersistedValidationResults,
  shouldExpectValidationResults,
} from '../../screens/validation/utils'
import {
  archiveFlips,
  didArchiveFlips,
  markFlipsArchived,
} from '../../screens/flips/utils'
import {persistItem} from '../utils/persist'
import {EpochPeriod} from '../types'

const GlobalStateContext = React.createContext()

const REFETCH_EPOCH_MIN_INTERVAL = 15

const shouldRefetchEpoch = (epochData, timing) => {
  if (!epochData || !timing) return false

  const {flipLottery, shortSession, longSession} = timing

  const {currentPeriod, nextValidation} = epochData

  const nextValidationTime = new Date(nextValidation).getTime()
  const currentDate = new Date().getTime()

  if (
    currentDate > nextValidationTime + (shortSession + longSession) * 1000 &&
    (currentPeriod === EpochPeriod.LongSession ||
      currentPeriod === EpochPeriod.AfterLongSession)
  ) {
    return true
  }

  if (
    currentDate > nextValidationTime + shortSession * 1000 &&
    currentPeriod === EpochPeriod.ShortSession
  ) {
    return true
  }

  if (
    currentDate > nextValidationTime &&
    currentPeriod === EpochPeriod.FlipLottery
  ) {
    return true
  }

  if (
    currentDate > nextValidation - flipLottery * 1000 &&
    currentPeriod === EpochPeriod.None
  ) {
    return true
  }

  return false
}

export function GlobalProvider(props) {
  const queryClient = useQueryClient()

  const epoch = useNodeEpoch()
  const timing = useNodeTiming()

  const [lastModifiedEpochTime, setLastModifiedEpochTime] = useState(0)

  useInterval(() => {
    if (shouldRefetchEpoch(epoch, timing)) {
      const t = new Date().getTime()
      if (
        Math.abs(t - lastModifiedEpochTime > REFETCH_EPOCH_MIN_INTERVAL * 1000)
      ) {
        console.log(`invalidate epoch, ${epoch.currentPeriod}`)
        queryClient.invalidateQueries('get-epoch')
        setLastModifiedEpochTime(new Date().getTime())
      }
    }
  }, 3 * 1000)

  useEffect(() => {
    if (epoch && didValidate(epoch.epoch) && !didArchiveFlips(epoch.epoch)) {
      archiveFlips()
      markFlipsArchived(epoch.epoch)
    }
  }, [epoch])

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

  return <GlobalStateContext.Provider {...props} />
}
