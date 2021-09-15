import {
  useSettingsDispatch,
  useSettingsState,
} from '../providers/settings-context'

export default function useApikeyPurchasing() {
  const {apiKeyId} = useSettingsState()
  const {addPurchase} = useSettingsDispatch()

  return {
    isPurchasing: !!apiKeyId,
    savePurchase: addPurchase,
  }
}
