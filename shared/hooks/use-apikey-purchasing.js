import {
  apiKeyStates,
  useSettingsDispatch,
  useSettingsState,
} from '../providers/settings-context'

export default function useApikeyPurchasing() {
  const {apiKeyId, apiKeyState} = useSettingsState()
  const {addPurchase, saveRestrictedConnection} = useSettingsDispatch()

  const setRestrictedKey = () => {
    saveRestrictedConnection()
  }

  return {
    isPurchasing: !!apiKeyId,
    needToPurchase: [
      apiKeyStates.NONE,
      apiKeyStates.OFFLINE,
      apiKeyStates.RESTRICTED,
    ].includes(apiKeyState),
    savePurchase: addPurchase,
    setRestrictedKey,
  }
}
