import {
  ApiKeyStates,
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
      ApiKeyStates.NONE,
      ApiKeyStates.OFFLINE,
      ApiKeyStates.RESTRICTED,
    ].includes(apiKeyState),
    savePurchase: addPurchase,
    setRestrictedKey,
  }
}
