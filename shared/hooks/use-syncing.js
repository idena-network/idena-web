import {useQuery} from 'react-query'
import {callRpc} from '../utils/utils'

export default function useSyncing(options) {
  return useQuery('bcn_syncing', () => callRpc('bcn_syncing'), {
    initialData: {currentBlock: 0},
    ...options,
  })
}
