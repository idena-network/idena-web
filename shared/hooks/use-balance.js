import {useQuery} from 'react-query'
import {fetchBalance} from '../api/wallet'
import {useAuthState} from '../providers/auth-context'

export function useBalance() {
  const {coinbase} = useAuthState()
  const {
    data: {balance, stake},
  } = useQuery(['get-balance', coinbase], () => fetchBalance(coinbase), {
    initialData: {balance: 0, stake: 0},
    enabled: !!coinbase,
    refetchInterval: 30 * 1000,
  })

  return {balance, stake}
}
