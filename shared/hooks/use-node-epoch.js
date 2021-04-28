import {useQuery} from 'react-query'
import {fetchEpoch} from '../api'
import {useSettingsState} from '../providers/settings-context'

function useNodeEpoch() {
  const {apiKey, url} = useSettingsState()

  const {data: epochData} = useQuery(
    ['get-epoch', apiKey, url],
    () => fetchEpoch(),
    {
      retryDelay: 5 * 1000,
    }
  )

  return epochData
}

export default useNodeEpoch
