import {useQuery} from 'react-query'
import {fetchCeremonyIntervals} from '../api'
import {useSettingsState} from '../providers/settings-context'

function useNodeTiming() {
  const {apiKey, url} = useSettingsState()

  const {data: timing} = useQuery(
    ['get-timing', apiKey, url],
    () =>
      fetchCeremonyIntervals().then(
        ({
          ValidationInterval,
          FlipLotteryDuration,
          ShortSessionDuration,
          LongSessionDuration,
        }) => ({
          validation: ValidationInterval,
          flipLottery: FlipLotteryDuration,
          shortSession: ShortSessionDuration,
          longSession: LongSessionDuration,
        })
      ),
    {
      refetchOnWindowFocus: false,
      initialData: {
        validation: null,
        flipLottery: null,
        shortSession: null,
        longSession: null,
      },
    }
  )

  return timing
}

export default useNodeTiming
