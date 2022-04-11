import React, {useState, useEffect} from 'react'
import {useToast} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useRouter} from 'next/router'
import {useMachine} from '@xstate/react'
import cookie from 'cookie-cutter'
import {useInterval} from '../hooks/use-interval'

import {didValidate} from '../../screens/validation/utils'
import {
  archiveFlips,
  didArchiveFlips,
  markFlipsArchived,
} from '../../screens/flips/utils'
import {loadPersistentState, persistState} from '../utils/persist'
import {isVercelProduction, ntp, openExternalUrl} from '../utils/utils'
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
import {restrictedModalMachine} from '../machines'

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

  useEffect(() => {
    const refLink = router.query.ref
    if (!refLink || !epoch) {
      return
    }

    const refId = cookie.get('refId')
    if (refId && refId !== refLink) {
      return
    }
    cookie.set('refId', refLink, {
      expires: new Date(epoch.nextValidation),
      domain: isVercelProduction ? '.idena.io' : null,
    })
  }, [router.query.ref, epoch])

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

  useEffect(() => {
    if (epoch && didValidate(epoch.epoch) && !didArchiveFlips(epoch.epoch)) {
      archiveFlips()
      markFlipsArchived(epoch.epoch)
    }
  }, [epoch])

  // time checking
  const toast = useToast()
  const toastId = 'check-time-toast'
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
    if (wrongClientTime && !toast.isActive(toastId))
      toast({
        id: toastId,
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

  useInterval(
    async () => {
      try {
        const data = await getKeyById(apiKeyId)
        const provider = await getProvider(apiKeyData.provider)

        addPurchasedKey(provider.data.url, data.key, data.epoch)

        router.push('/home')
      } catch {
        console.error(
          `key is not ready, id: [${apiKeyId}], provider: [${apiKeyData.provider}]`
        )
      }
    },
    apiKeyId && apiKeyData?.provider ? 3000 : null
  )

  const [, send] = useMachine(restrictedModalMachine, {
    actions: {
      onRedirect: () => {
        // need to redirect to /home, because "Not now" button on restricted page
        // uses history api to go back, we do not need to go back to import
        if (router.pathname === '/key/import') {
          router.push('/home')
        }
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
