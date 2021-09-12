import React, {useState, useEffect} from 'react'
import {useToast} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useRouter} from 'next/router'
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
import {ntp, openExternalUrl} from '../utils/utils'
import {Toast} from '../components/components'
import {useEpoch} from './epoch-context'

const AppContext = React.createContext()

const TIME_DRIFT_THRESHOLD = 10

const IDENA_ACTIVE_TAB = 'IDENA_ACTTIVE_TAB'

// eslint-disable-next-line react/prop-types
export function AppProvider({appId, ...props}) {
  const {t} = useTranslation()

  const router = useRouter()

  const epoch = useEpoch()

  // make only one tab active
  useEffect(() => {
    function onStorage(e) {
      if (e.key === IDENA_ACTIVE_TAB) {
        return router.push('/too-many-tabs', router.pathname)
      }
    }

    localStorage.setItem(IDENA_ACTIVE_TAB, appId)

    window.addEventListener('storage', onStorage)

    return () => window.removeEventListener('storage', onStorage)
  }, [appId, router])

  // clear old validation logs
  useEffect(() => {
    if (epoch) {
      try {
        for (let i = epoch.epoch - 10; i < epoch.epoch - 1; i += 1) {
          localStorage.removeItem(`logs-validation-${i}`)
        }
      } catch (e) {
        console.error(e)
      }
    }
  }, [epoch])

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
              openExternalUrl('https://time.is/')
            }}
          />
        ),
      })
  }, [t, toast, wrongClientTime])

  return <AppContext.Provider {...props} />
}
