import React, {useState, useContext} from 'react'
import {useQuery, useQueryClient} from 'react-query'
import {useInterval} from '../hooks/use-interval'
import {EpochPeriod} from '../types'
import useNodeTiming from '../hooks/use-node-timing'
import {useSettingsState} from './settings-context'
import {fetchEpoch} from '../api'

const EpochContext = React.createContext()

const shouldRefetchEpoch = (epochData, timing) => {
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
    currentDate > nextValidationTime - flipLottery * 1000 &&
    currentPeriod === EpochPeriod.None
  ) {
    return true
  }

  return false
}

export function EpochProvider(props) {
  const queryClient = useQueryClient()
  const {apiKey, url} = useSettingsState()

  const timing = useNodeTiming()

  const [lastModifiedEpochTime, setLastModifiedEpochTime] = useState(0)

  const {data: epochData} = useQuery(
    ['get-epoch', apiKey, url],
    () => fetchEpoch(),
    {
      retryDelay: 5 * 1000,
      initialData: null,
    }
  )

  useInterval(() => {
    if (!epochData || !timing) return

    if (shouldRefetchEpoch(epochData, timing)) {
      const currentTime = new Date().getTime()
      if (Math.abs(currentTime - lastModifiedEpochTime > 15 * 1000)) {
        queryClient.invalidateQueries('get-epoch')
        setLastModifiedEpochTime(currentTime)
      }
    }
  }, 1000)

  return <EpochContext.Provider {...props} value={epochData ?? null} />
}

export function useEpoch() {
  const context = useContext(EpochContext)
  if (context === undefined) {
    throw new Error('useEpoch must be used within a EpochProvider')
  }
  return context
}
