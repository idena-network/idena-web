import React, {useState, useEffect, useContext} from 'react'
import {useQueryClient} from 'react-query'
import {useToast} from '@chakra-ui/core'
import {useTranslation} from 'react-i18next'
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
import {ntp} from '../utils/utils'
import {Toast} from '../components/components'

const GlobalContext = React.createContext()

const TIME_DRIFT_THRESHOLD = 10
const REFETCH_EPOCH_MIN_INTERVAL = 15

const NOT_WAITING = {
  until: null,
  fields: [],
}

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
    console.log('1')
    return true
  }

  if (
    currentDate > nextValidationTime + shortSession * 1000 &&
    currentPeriod === EpochPeriod.ShortSession
  ) {
    console.log('2')
    return true
  }

  if (
    currentDate > nextValidationTime &&
    currentPeriod === EpochPeriod.FlipLottery
  ) {
    console.log('3')
    return true
  }

  if (
    currentDate > nextValidation - flipLottery * 1000 &&
    currentPeriod === EpochPeriod.None
  ) {
    console.log('4')
    return true
  }

  return false
}

export function GlobalProvider(props) {
  const {t} = useTranslation()

  const queryClient = useQueryClient()

  const epoch = useNodeEpoch()
  const timing = useNodeTiming()

  const [lastModifiedEpochTime, setLastModifiedEpochTime] = useState(0)

  // epoch checking
  useInterval(() => {
    if (shouldRefetchEpoch(epoch, timing)) {
      const currentTime = new Date().getTime()
      if (
        Math.abs(
          currentTime - lastModifiedEpochTime >
            REFETCH_EPOCH_MIN_INTERVAL * 1000
        )
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

  // time checking
  const toast = useToast()
  const [wrongClientTime, setWrongClientTime] = useState()

  useInterval(
    async () => {
      try {
        const requestOriginTime = Date.now()

        const {result} = await (
          await fetch('https://api.idena.io/api/now')
        ).json()
        const serverTime = new Date(result)

        setWrongClientTime(
          ntp(requestOriginTime, serverTime, serverTime, Date.now()).offset >
            TIME_DRIFT_THRESHOLD * 1000
        )
      } catch (error) {
        console.error('An error occured while fetching time API')
      }
    },
    1000 * 60 * 5,
    true
  )

  useEffect(() => {
    if (wrongClientTime)
      toast({
        duration: null,
        // eslint-disable-next-line react/display-name
        render: toastProps => (
          <Toast
            status="error"
            title={t('Please check your local clock')}
            description={t('The time must be synchronized with internet time')}
            actionContent={t('Okay')}
            onAction={() => {
              toastProps.onClose()
              window.open('https://time.is/', '_blank')
            }}
          />
        ),
      })
  }, [t, toast, wrongClientTime])

  // identity management
  const [waitForUpdate, setWaitForUpdate] = useState(NOT_WAITING)

  useInterval(
    () => {
      queryClient.invalidateQueries('get-identity')
    },
    waitForUpdate.until ? 10 * 1000 : null
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

  const stopWaiting = () => {
    setWaitForUpdate(NOT_WAITING)
  }

  return (
    <GlobalContext.Provider
      {...props}
      value={{
        identityUpdate: {
          data: waitForUpdate,
          actions: {waitStateUpdate, waitFlipsUpdate, stopWaiting},
        },
      }}
    />
  )
}

export function useGlobal() {
  const context = useContext(GlobalContext)
  if (context === undefined) {
    throw new Error('useGlobal must be used within a GlobalProvider')
  }
  return context
}
