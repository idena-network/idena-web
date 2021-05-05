import React, {useState, useEffect} from 'react'
import {useToast} from '@chakra-ui/core'
import {useTranslation} from 'react-i18next'
import {useInterval} from '../hooks/use-interval'

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
import {ntp} from '../utils/utils'
import {Toast} from '../components/components'
import {useEpoch} from './epoch-context'

const AppContext = React.createContext()

const TIME_DRIFT_THRESHOLD = 10

export function AppProvider(props) {
  const {t} = useTranslation()

  const epoch = useEpoch()

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

  return <AppContext.Provider {...props} />
}
