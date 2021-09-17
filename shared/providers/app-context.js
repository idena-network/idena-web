import React, {useState, useEffect, useMemo} from 'react'
import {useToast} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useRouter} from 'next/router'
import {useQuery} from 'react-query'
import {useMachine} from '@xstate/react'
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
import {loadPersistentState, persistItem, persistState} from '../utils/persist'
import {ntp, openExternalUrl} from '../utils/utils'
import {Toast} from '../components/components'
import {useEpoch} from './epoch-context'
import {
  useSettings,
  useSettingsDispatch,
  useSettingsState,
} from './settings-context'
import {getKeyById, getProvider} from '../api'
import {useIdentity} from './identity-context'
import {useAuthState} from './auth-context'
import {createRestrictedModalMachine} from '../machines'

const AppContext = React.createContext()

const TIME_DRIFT_THRESHOLD = 10
const IDENA_ACTIVE_TAB = 'IDENA_ACTTIVE_TAB'

// eslint-disable-next-line react/prop-types
export function AppProvider({tabId, ...props}) {
  const {t} = useTranslation()

  const router = useRouter()

  const epoch = useEpoch()

  const [{state}] = useIdentity()
  const [{apiKeyState}] = useSettings()

  const {auth} = useAuthState()

  // make only one tab active
  useEffect(() => {
    function onStorage(e) {
      if (e.key === IDENA_ACTIVE_TAB) {
        return router.push('/too-many-tabs', router.pathname)
      }
    }

    localStorage.setItem(IDENA_ACTIVE_TAB, tabId)

    window.addEventListener('storage', onStorage)

    return () => window.removeEventListener('storage', onStorage)
  }, [tabId, router])

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

  // api key purchasing
  const {apiKeyId, apiKeyData} = useSettingsState()
  const {addPurchasedKey} = useSettingsDispatch()
  const [, {forceUpdate}] = useIdentity()

  const {data} = useQuery(
    ['get-key-by-id', apiKeyId],
    () => getKeyById(apiKeyId),
    {
      enabled: !!apiKeyId,
      retry: true,
      retryDelay: 5000,
    }
  )

  const {data: provider} = useQuery(
    ['get-provider-by-id', apiKeyData?.provider],
    () => getProvider(apiKeyData?.provider),
    {
      enabled: !!data && !!apiKeyData?.provider,
      retry: true,
    }
  )

  useEffect(() => {
    if (provider && data) {
      addPurchasedKey(provider.data.url, data.key, data.epoch)

      // need to update identity asap, because key can be received by activating invite
      forceUpdate()

      router.push('/')
    }
  }, [addPurchasedKey, data, forceUpdate, provider, router])

  const restrictedModalMachine = useMemo(
    () => createRestrictedModalMachine(),
    []
  )

  const [, send] = useMachine(restrictedModalMachine, {
    actions: {
      onRedirect: () => {
        router.push('/node/restricted')
      },
      persistModalState: ({storage}) => {
        persistState('restricted-modal', storage)
      },
    },
    services: {
      getExternalData: () => cb => {
        cb({
          type: 'DATA',
          data: {
            pathname: router.pathname,
            storage: loadPersistentState('restricted-modal'),
          },
        })
      },
    },
  })

  useEffect(() => {
    send('NEW_API_KEY_STATE', {apiKeyState})
  }, [apiKeyState, send])

  useEffect(() => {
    if (epoch) send('NEW_EPOCH', {epoch: epoch.epoch})
  }, [epoch, send])

  useEffect(() => {
    if (auth) {
      send('RESTART', {identityState: state})
    } else {
      send('CLEAR')
    }
  }, [auth, send, state])

  return <AppContext.Provider {...props} value={null} />
}
