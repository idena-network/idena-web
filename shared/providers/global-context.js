import React, {useState} from 'react'
import {useQueryClient} from 'react-query'
import useNodeEpoch from '../hooks/use-node-epoch'
import {useInterval} from '../hooks/use-interval'
import useNodeTiming from '../hooks/use-node-timing'

const GlobalStateContext = React.createContext()

const EpochPeriod = {
  FlipLottery: 'FlipLottery',
  ShortSession: 'ShortSession',
  LongSession: 'LongSession',
  AfterLongSession: 'AfterLongSession',
  None: 'None',
}

const AFTER_LONG_ESTIMATE_SECONDS = 120
const REFETCH_EPOCH_MIN_INTERVAL = 15

const shouldRefetchEpoch = (epochData, timing) => {
  if (!epochData || !timing) return false

  const {currentPeriod, nextValidation} = epochData

  const nextValidationTime = new Date(nextValidation).getTime()
  const currentDate = new Date().getTime()

  if (
    currentDate >
    nextValidationTime +
      (timing.shortSession + timing.longSession + AFTER_LONG_ESTIMATE_SECONDS) *
        1000
  ) {
    return true
  }
  if (
    currentDate >
      nextValidationTime + (timing.shortSession + timing.longSession) * 1000 &&
    currentPeriod !== EpochPeriod.AfterLongSession
  ) {
    return true
  }

  if (
    currentDate > nextValidationTime + timing.shortSession * 1000 &&
    currentPeriod !== EpochPeriod.LongSession
  ) {
    return true
  }

  if (
    currentDate > nextValidationTime &&
    currentPeriod !== EpochPeriod.ShortSession
  ) {
    return true
  }

  if (
    currentDate > nextValidation - timing.lottery * 1000 &&
    currentPeriod !== EpochPeriod.FlipLottery
  ) {
    return true
  }

  return false
}

export function GlobalProvider(props) {
  const queryClient = useQueryClient()

  const epoch = useNodeEpoch()
  const timing = useNodeTiming()

  const [lastModifiedEPochTime, setLastModifiedEpochTime] = useState(0)

  useInterval(() => {
    if (shouldRefetchEpoch(epoch, timing)) {
      const t = new Date().getTime()
      if (
        Math.abs(t - lastModifiedEPochTime > REFETCH_EPOCH_MIN_INTERVAL * 1000)
      ) {
        queryClient.invalidateQueries('get-epoch')
        setLastModifiedEpochTime(new Date().getTime())
      }
    }
  }, 3 * 1000)

  return <GlobalStateContext.Provider {...props} />
}
