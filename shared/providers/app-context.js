import React, {useState, useEffect, useContext, useCallback} from 'react'
import {useToast} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useRouter} from 'next/router'
import cookie from 'cookie-cutter'
import {useInterval} from '../hooks/use-interval'

import {clearValidationState, didValidate} from '../../screens/validation/utils'
import {
  archiveFlips,
  didArchiveFlips,
  markFlipsArchived,
} from '../../screens/flips/utils'
import {isVercelProduction, ntp, openExternalUrl} from '../utils/utils'
import {Toast} from '../components/components'
import {useEpoch} from './epoch-context'
import {
  ApiKeyStates,
  useSettings,
  useSettingsDispatch,
  useSettingsState,
} from './settings-context'
import {checkSavedKey, getKeyById, getProvider} from '../api'
import {useAuthState} from './auth-context'
import {signMessage} from '../utils/crypto'
import {hexToUint8Array, toHexString} from '../utils/buffers'
import {useExpired} from '../hooks/use-expired'
import {useIdenaBot} from '../hooks/hooks'
import {checkRestoringConnection} from '../../screens/node/utils'
import {loadPersistentState, persistState} from '../utils/persist'

const AppContext = React.createContext()

const TIME_DRIFT_THRESHOLD = 10
const IDENA_ACTIVE_TAB = 'IDENA_ACTTIVE_TAB'

// eslint-disable-next-line react/prop-types
export function AppProvider({tabId, ...props}) {
  const {t} = useTranslation()

  const router = useRouter()

  const epoch = useEpoch()

  const [{apiKeyState, isManualRemoteNode}] = useSettings()
  const {saveConnection} = useSettingsDispatch()

  const {coinbase, privateKey} = useAuthState()

  const {updateRestrictedNotNow, resetRestrictedModal} = useExpired()

  const [
    idenaBotConnected,
    {persist: persistIdenaBot, skip: skipIdenaBot},
  ] = useIdenaBot()

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

  // hotfix 93 epoch
  useEffect(() => {
    const key = 'hotfix-93-epoch'

    if (epoch?.epoch !== 93) return

    const hotFixDone = loadPersistentState(key)
    if (hotFixDone) return

    clearValidationState()
    persistState(key, true)
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

  const checkRestoredKey = useCallback(async () => {
    try {
      const signature = signMessage(hexToUint8Array(coinbase), privateKey)
      const savedKey = await checkSavedKey(
        coinbase,
        toHexString(signature, true)
      )
      if (
        !isManualRemoteNode &&
        (apiKeyState === ApiKeyStates.NONE ||
          apiKeyState === ApiKeyStates.OFFLINE ||
          apiKeyState === ApiKeyStates.RESTRICTED)
      ) {
        if (await checkRestoringConnection(savedKey.url, savedKey.key))
          saveConnection(savedKey.url, savedKey.key, false)
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
  }, [apiKeyState, coinbase, isManualRemoteNode, privateKey, saveConnection])

  useEffect(() => {
    checkRestoredKey()
  }, [checkRestoredKey])

  return (
    <AppContext.Provider
      {...props}
      value={[
        {idenaBotConnected},
        {
          updateRestrictedNotNow,
          resetRestrictedModal,
          persistIdenaBot,
          skipIdenaBot,
        },
      ]}
    />
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useEpoch must be used within a EpochProvider')
  }
  return context
}
